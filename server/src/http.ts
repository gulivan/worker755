import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { NOTICE_CHANCE, Session } from './session.ts';
import { cleanPersona, cleanStance, cleanSubagentName, createLiveDriver, createMockDriver, DEFAULT_STANCE, PERSONAS, personaText, STANCE_MAX, SUBAGENT_NAMES } from './manager.ts';
import { createLiveDirector, scriptedDirector } from './director.ts';
import type { DirectorDriver } from './director.ts';
import type { ManagerDriver } from './manager.ts';
import { freeModels, isModelId, keyModels, listModels, MOCK_MODEL } from './models.ts';
import { isScenarioId, SCENARIO_LIST } from './scenarios.ts';
import type { KeyProblem, ModelOption } from './models.ts';
import { hostedCredentials, isPlausibleKey, isProviderId, localHeaders, localIsClaudeCode, localUrl, providerList } from './providers.ts';
import type { Credentials, ProviderId } from './providers.ts';
import { parseSync, SYNC_BODY_CAP, SyncError } from './sync.ts';
import { WEB } from './web.ts';
import type { SyncRequest } from './sync.ts';
import { DailyBudget, freeAllowance, persisted, RateLimiter, WindowBudget } from './limits.ts';
import type { Allowance } from './limits.ts';
import { isReviewId, ReviewStore } from './reviews.ts';
import { isFace } from './reviews.ts';
import type { SharedReview } from './reviews.ts';
import { isLanguage } from './language.ts';
import { isDestroyed } from './types.ts';
import type { Language } from './language.ts';
import { copyFor } from './i18n/index.ts';
import { CardBusy, Cards, CARD_VERSION } from './cards.ts';
import { CARD_COPY, isDestroyCause, statsOf, verdictOf } from './card-copy.ts';
import { excerptOf } from './card.ts';
import type { Stats } from './stats.ts';
import type { Accounts, Provider } from './accounts.ts';
import { AuthFailed, beginSignIn, clearStateCookie, finishSignIn, safeNext, sessionAccount, sessionCookie, signOutCookie } from './auth.ts';
import type { AuthConfig } from './auth.ts';
import type { Freemius } from './freemius.ts';
import { MICROS } from './accounts.ts';
import { creditAllowance, Pricing } from './billing.ts';
import type { Billing } from './billing.ts';

export interface AppOptions {
  mock: boolean;
  timeoutMs: number;
  /** Directory with the built web app; served when it exists. */
  staticDir?: string;
  /** Delay per scripted manager step, so the offline game is watchable. */
  mockDelayMs?: number;
  /** Overrides model discovery and driver creation (tests). */
  models?: (provider: ProviderId) => Promise<ModelOption[]>;
  /** Overrides checking a player's key with its provider (tests). */
  keyModels?: (cred: Credentials) => Promise<{ models: ModelOption[] } | { problem: KeyProblem }>;
  driverFor?: (model: string, cred: Credentials | null) => ManagerDriver;
  /** Commands per player per 5 s (tests raise it). */
  commandsPerWindow?: number;
  /** How often the user sees a loss as it happens; default NOTICE_CHANCE (tests pin it). */
  noticeChance?: number;
  /** Overrides the director model (tests). */
  directorFor?: (model: string, cred: Credentials | null) => DirectorDriver;
  /**
   * Free shifts on the server's key. Without it, players must bring their own key (unless mock).
   * `credentials` defaults to AI_GATEWAY_API_KEY.
   */
  free?: { sessionTokens: number; dailyTokens: number; perAddressPerDay: number; credentials?: Credentials };
  /** New shifts per address per hour, on any key. Default 30. */
  shiftsPerHour?: number;
  /** Read the client address from cf-connecting-ip (behind a trusted proxy). */
  trustProxy?: boolean;
  /**
   * Hosts allowed to set cf-connecting-ip, such as the tunnel's container name. Without them, any peer
   * is believed when trustProxy is on.
   */
  trustedProxies?: string[];
  /** Where the free budget and per-address counts are saved, so a restart does not reset them. */
  stateDir?: string;
  /** Shifts kept in memory at once, across everyone. Default 150. */
  maxSessions?: number;
  /** Unfinished shifts per address at once. Default 4. */
  openPerAddress?: number;
  /** A shift is dropped this long after it started, even with a page still open. Default 4 h. */
  maxAgeMs?: number;
  /** Where shared reviews are kept. Without it, sharing is off. */
  reviews?: ReviewStore;
  /** Shown to players as a way to support the game. */
  donateUrl?: string;
  /** Link to the game's source code. */
  sourceUrl?: string;
  /** Where the game is reached, e.g. https://worker755.com; link previews need absolute links. */
  publicUrl?: string;
  /** Draws shared reviews' link-preview images. Default: one keeping them next to the reviews; false turns them off. */
  cards?: Cards | false;
  /** Counts visits and shifts per day. */
  stats?: Stats;
  /**
   * Sign-in. With it, shifts on the server's key need an account with credit: the starter, then
   * top-ups. Calls are charged at their price times `billing.multiplier`. Without it, anyone gets the
   * free shifts per address.
   */
  accounts?: { store: Accounts; auth: AuthConfig; freemius?: Freemius; billing?: Partial<Billing> };
  idleMs?: number;
  log?: (line: string) => void;
}

export interface App {
  server: Server;
  sessions: Map<string, Session>;
  /** Takes in a session made elsewhere (tests) and returns the secret that lets its player play it; `account` pays for it. */
  adopt(s: Session, address?: string, account?: string): string;
  close(): Promise<void>;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const MAX_BODY = 1_000_000;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(data);
}

/** Sent with every response. The app has no inline scripts; React sets inline styles. */
const SECURITY_HEADERS: Record<string, string> = {
  'content-security-policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
    "font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'cross-origin-opener-policy': 'same-origin',
};

/**
 * An address as the limits count it: IPv4 as is, IPv6 by its /64 prefix (or /48 for limits that one
 * rented server should not multiply).
 */
export function addressKey(address: string, bits: 64 | 48 = 64): string {
  const a = address.replace(/^::ffff:/, '');
  if (!a.includes(':')) return a;
  // Expand :: so the first four groups are the /64.
  const [head, tail = ''] = a.split('::');
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  const groups = a.includes('::') ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : h;
  return groups.slice(0, bits / 16).map((g) => g.toLowerCase().replace(/^0+(?=.)/, '')).join(':') + `::/${bits}`;
}

/** Reads a JSON object body of at most `cap` bytes; `onSize` hears how many bytes came. */
async function readJson(req: IncomingMessage, cap = MAX_BODY, onSize?: (bytes: number) => void): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > cap) {
      onSize?.(size);
      throw new HttpError(413, 'Request body too large');
    }
    chunks.push(chunk as Buffer);
  }
  onSize?.(size);
  if (!size) return {};
  if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Send JSON');
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'Body must be a JSON object');
  }
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

async function serveStatic(root: string, pathname: string, res: ServerResponse): Promise<boolean> {
  if (!existsSync(root)) return false;
  let rel: string;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  const base = resolve(root);
  let file = normalize(join(base, rel));
  if (file !== base && !file.startsWith(base + sep)) return false;
  if (!existsSync(file) || statSync(file).isDirectory()) {
    const index = join(file, 'index.html');
    // Directory index, or SPA fallback for extension-less routes.
    if (existsSync(index)) file = index;
    else if (!extname(rel)) file = join(base, 'index.html');
    else return false;
    if (!existsSync(file)) return false;
  }
  const body = await readFile(file);
  const immutable = file.includes(`${sep}assets${sep}`);
  res.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  res.end(body);
  return true;
}

/** What a finished shift looks like to people it is shared with; null while it is still running. */
export function snapshot(s: Session): Omit<SharedReview, 'id' | 'createdAt' | 'face'> | null {
  const st = s.state();
  const over = st.events.find((e) => e.type === 'game_over');
  if (st.status !== 'finished' || !over || over.type !== 'game_over') return null;
  const lost = [...new Set(st.events.flatMap((e) => (e.type === 'outrage' ? e.items : [])))];
  const destroyed = st.events.find((e) => e.type === 'machine' && isDestroyed(e.event));
  return {
    review: over.review,
    stats: over.stats,
    model: st.model,
    director: st.director ?? '',
    subagent: st.subagent,
    scenario: st.scenario,
    lost,
    language: s.language,
    ...(s.stance !== undefined && { customStance: true }),
    ...(s.persona !== 'default' && { persona: s.persona }),
    ...(destroyed?.type === 'machine' && isDestroyed(destroyed.event) && { destroyed: destroyed.event }),
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const LOCALES: Record<Language, string> = {
  en: 'en_US',
  es: 'es_ES',
  'pt-BR': 'pt_BR',
  fr: 'fr_FR',
  de: 'de_DE',
  ru: 'ru_RU',
  'zh-CN': 'zh_CN',
  ja: 'ja_JP',
  hi: 'hi_IN',
};

/** The site's address without a trailing slash, when it is a usable http(s) URL. */
export function siteBase(publicUrl: string | undefined): string | null {
  if (!publicUrl) return null;
  try {
    const u = new URL(publicUrl);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.origin + u.pathname.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

/**
 * Replaces the page's title and link-preview tags with ones for this review: the outcome in the
 * title, the start of the review, and with the site's address known, the review's own image.
 */
export function withPreview(html: string, review: SharedReview, publicUrl?: string): string {
  const language = isLanguage(review.language) ? review.language : 'en';
  const first = excerptOf(typeof review.review === 'string' ? review.review : '');
  const desc = first.length > 200 ? first.slice(0, 197).trimEnd() + '...' : first;
  const title = copyFor(language).share.previewTitle;
  const verdict = CARD_COPY[language].verdict[verdictOf(statsOf(review.stats), Array.isArray(review.lost) ? review.lost.length : 0, isDestroyCause(review.destroyed))];
  // "Worker 755: performance review" becomes "Worker 755: Under investigation", in each language's punctuation.
  const headline = (/^Worker 755\s*[:：]\s*/.exec(title)?.[0] ?? 'Worker 755: ') + verdict;
  const base = siteBase(publicUrl);
  const meta = (attr: 'name' | 'property', key: string, value: string) => `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`;
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    meta('name', 'description', desc),
    meta('property', 'og:title', headline),
    meta('property', 'og:description', desc),
    meta('property', 'og:type', 'article'),
    meta('property', 'og:site_name', 'Worker 755'),
    meta('property', 'og:locale', LOCALES[language]),
    ...(base
      ? [
          meta('property', 'og:url', `${base}/r/${review.id}`),
          meta('property', 'og:image', `${base}/r/${review.id}/card.png?v=${CARD_VERSION}`),
          meta('property', 'og:image:type', 'image/png'),
          meta('property', 'og:image:width', '1200'),
          meta('property', 'og:image:height', '630'),
          meta('property', 'og:image:alt', `${CARD_COPY[language].title}: ${verdict}`),
          meta('name', 'twitter:card', 'summary_large_image'),
        ]
      : [meta('name', 'twitter:card', 'summary')]),
    meta('name', 'twitter:title', headline),
    meta('name', 'twitter:description', desc),
  ].join('\n    ');
  // Replacer functions: a review may contain $& or $` and those must stay plain text.
  return html
    .replace(/<html lang="[^"]*"/, () => `<html lang="${language}"`)
    .replace(/<meta (name="description"|property="og:[a-z_:]+"|name="twitter:[a-z_:]+") content="[^"]*" \/>\s*/g, '')
    .replace(/<title>[^<]*<\/title>/, () => tags);
}

export function createApp(opts: AppOptions): App {
  const sessions = new Map<string, Session>();
  const log = opts.log ?? ((line: string) => console.log(line));
  const models = opts.models ?? (opts.mock ? async () => [MOCK_MODEL] : listModels);
  const checkKey = opts.keyModels ?? (opts.mock ? async () => ({ models: [MOCK_MODEL] }) : keyModels);
  /** With their own key a player may pick any model their provider lists; the provider has the last word. */
  const offered = (list: ModelOption[], id: string, own: boolean) => list.some((m) => m.id === id) || (own && isModelId(id));
  const driverFor =
    opts.driverFor ??
    ((model: string, cred: Credentials | null) =>
      opts.mock || !cred ? createMockDriver(opts.mockDelayMs ?? 0) : createLiveDriver(model, cred));
  const directorFor =
    opts.directorFor ??
    ((model: string, cred: Credentials | null) =>
      opts.mock || !cred ? scriptedDirector(model) : createLiveDirector(model, cred));
  const idleMs = opts.idleMs ?? 60 * 60_000;
  const freeCred = opts.free ? (opts.free.credentials ?? hostedCredentials()) : null;
  const daily = opts.free ? new DailyBudget(opts.free.dailyTokens) : null;
  const freePerAddress = opts.free ? new RateLimiter(opts.free.perAddressPerDay, 24 * 60 * 60_000) : null;
  const shiftLimiter = new RateLimiter(opts.shiftsPerHour ?? 30, 60 * 60_000);
  /** Key checks per address: each one calls the player's provider. */
  const keyChecks = new RateLimiter(10, 10 * 60_000);
  /** New shared reviews per address. */
  const shares = new RateLimiter(20, 60 * 60_000);
  const publicBase = siteBase(opts.publicUrl);
  const accounts = opts.accounts ?? null;
  /** This site's address as the browser sees it, for the providers' redirects. */
  const siteOf = (req: IncomingMessage) => publicBase ?? `http://${req.headers.host ?? 'localhost'}`;
  const secureCookies = (req: IncomingMessage) => siteOf(req).startsWith('https:');
  const accountOf = (req: IncomingMessage) => {
    const id = accounts ? sessionAccount(accounts.auth.secret, req) : null;
    return id ? accounts!.store.get(id) : null;
  };
  /** Prices, the multiplier, and the credit needed to start a shift ($0.05 unless set). */
  const billing: Billing = {
    pricing: accounts?.billing?.pricing ?? new Pricing(undefined, log),
    multiplier: accounts?.billing?.multiplier ?? 2,
    floor: accounts?.billing?.floor ?? 50_000,
  };
  /** An account's usage as the page shows it, in dollars. */
  const usageOf = (a: NonNullable<ReturnType<typeof accountOf>>) => ({
    left: a.balance / MICROS,
    of: Math.max(a.granted, a.balance) / MICROS,
    topUp: a.toppedUp,
  });
  /** The models an account may use on the server's key: the free ones until its first top-up, then all on offer. */
  const accountModels = async (a: NonNullable<ReturnType<typeof accountOf>>) => (a.toppedUp ? models('gateway') : freeList());
  /** With accounts, an account's credit is the limit, not the daily pool: on offer whenever the server has a key. */
  const serverShifts = () => (accounts ? opts.mock || !!freeCred : freeOpen());
  const cards =
    opts.cards === false || !opts.reviews
      ? null
      : (opts.cards ?? new Cards({ dir: opts.reviews.dir, site: publicBase ? new URL(publicBase).host : 'worker755.com', log }));
  /** Review images drawn per address; ones already drawn are free. Link previews come in bursts from a few crawlers. */
  const cardDraws = new RateLimiter(30, 60_000);
  /** Bytes of file changes per address per minute; a busy player sends a few kilobytes. */
  const syncBytes = new WindowBudget(40_000_000, 60_000);
  /** Pages and searches per address per minute; a script may curl in a loop. */
  const webLookups = new RateLimiter(300, 60_000);
  /** Page loads counted per address per minute. */
  const hits = new RateLimiter(30, 60_000);
  const stats = opts.stats ?? null;
  const maxSessions = opts.maxSessions ?? 150;
  const openPerAddress = opts.openPerAddress ?? 4;
  const maxAgeMs = opts.maxAgeMs ?? 4 * 60 * 60_000;
  /** Session id -> shared review id, so sharing twice gives the same link. */
  const shared = new Map<string, string>();
  /** Who started each shift, and the secret that lets them play it; the id alone only lets someone watch. */
  const owners = new Map<string, { token: string; address: string; createdAt: number; account?: string }>();
  /** Hashes of keys a provider accepted recently, so starting a shift right after a check asks it once. */
  const verified = new Map<string, number>();

  let saveLimits: (() => void) | null = null;
  if (opts.stateDir) {
    try {
      mkdirSync(opts.stateDir, { recursive: true });
    } catch {
      log('limits directory unavailable');
    }
    const parts: Parameters<typeof persisted>[1] = { shifts: shiftLimiter, keyChecks, shares };
    if (daily) parts.daily = daily;
    if (freePerAddress) parts.free = freePerAddress;
    saveLimits = persisted(join(opts.stateDir, 'limits.json'), parts, log).flush;
  }

  /** Free shifts are offered: scripted mode, or the server has a key and budget left today. */
  const freeOpen = () => opts.mock || (!!freeCred && !!daily && !daily.exhausted());
  const freeList = async () => (opts.mock ? models('gateway') : freeModels(await models('gateway')));

  /**
   * Who is asking, for the limits. Behind Cloudflare every request reaches us from the local tunnel,
   * so with TRUST_PROXY the address is Cloudflare's CF-Connecting-IP, which clients cannot set past its
   * edge. X-Forwarded-For is not trusted: anyone can write it. IPv6 counts per /64, since one
   * household gets a whole /64 to rotate through.
   */
  function clientAddress(req: IncomingMessage, bits: 64 | 48 = 64): string {
    const peer = (req.socket.remoteAddress ?? 'unknown').replace(/^::ffff:/, '');
    const cf = req.headers['cf-connecting-ip'];
    const fromProxy = opts.trustProxy && (!opts.trustedProxies?.length || !proxies.size || proxies.has(peer));
    return addressKey(fromProxy && typeof cf === 'string' && cf.trim() ? cf.trim() : peer, bits);
  }

  /** Addresses of the trusted proxies, looked up again every minute (containers get new ones on restart). */
  const proxies = new Set<string>();
  const findProxies = async () => {
    const found = new Set<string>();
    for (const host of opts.trustedProxies ?? []) {
      try {
        for (const a of await lookup(host, { all: true })) found.add(a.address.replace(/^::ffff:/, ''));
      } catch {
        log(`trusted proxy ${host} not found`);
      }
    }
    // Keep the last known addresses if a lookup fails for a moment.
    if (found.size) {
      proxies.clear();
      for (const a of found) proxies.add(a);
    }
  };
  let proxyTimer: ReturnType<typeof setInterval> | null = null;
  if (opts.trustProxy && opts.trustedProxies?.length) {
    void findProxies();
    proxyTimer = setInterval(() => void findProxies(), 60_000);
    proxyTimer.unref();
  }

  function drop(id: string): void {
    sessions.get(id)?.dispose();
    sessions.delete(id);
    owners.delete(id);
    shared.delete(id);
  }

  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [id, s] of sessions) {
      const age = now - (owners.get(id)?.createdAt ?? now);
      if ((s.listenerCount === 0 && now - s.lastActivity > idleMs) || age > maxAgeMs) drop(id);
    }
    for (const [h, until] of verified) if (until < now) verified.delete(h);
  }, Math.min(60_000, idleMs));
  sweeper.unref();

  /** Room for one more shift: when memory is full, the longest-idle finished shift makes way. */
  function makeRoom(): boolean {
    if (sessions.size < maxSessions) return true;
    const now = Date.now();
    let oldest: [string, Session] | null = null;
    for (const entry of sessions) {
      const s = entry[1];
      if (s.status === 'running' || now - s.lastActivity < 2 * 60_000) continue;
      if (!oldest || s.lastActivity < oldest[1].lastActivity) oldest = entry;
    }
    if (!oldest) return false;
    drop(oldest[0]);
    return true;
  }

  function keyError(problem: KeyProblem, errors: ReturnType<typeof copyFor>['errors']): HttpError {
    const message = problem === 'key' ? errors.keyRejected : problem === 'credit' ? errors.outOfCredit : errors.keyCheckDown;
    return new HttpError(problem === 'down' ? 502 : 400, message);
  }

  const keyHash = (cred: Credentials) => createHash('sha256').update(`${cred.provider}\n${cred.apiKey}`).digest('hex');

  /**
   * Whether the request comes from a browser on this very machine, looking at this server directly:
   * a loopback peer, nothing a proxy or tunnel would add, this server addressed by a local name
   * (not a name that merely resolves here), and no other site's page behind it.
   */
  function onThisMachine(req: IncomingMessage): boolean {
    const peer = (req.socket.remoteAddress ?? '').replace(/^::ffff:/, '');
    if (peer !== '127.0.0.1' && peer !== '::1') return false;
    for (const h of ['x-forwarded-for', 'x-forwarded-host', 'x-real-ip', 'forwarded', 'via', 'cf-connecting-ip', 'cf-ray']) {
      if (req.headers[h] !== undefined) return false;
    }
    const host = String(req.headers.host ?? '');
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host)) return false;
    const origin = req.headers.origin;
    if (origin !== undefined && origin !== `http://${host}`) return false;
    const site = req.headers['sec-fetch-site'];
    return site === undefined || site === 'same-origin' || site === 'none';
  }

  /** Claude Code runs on the operator's own account, so only the operator, at this machine, gets it. */
  const localOpen = (req: IncomingMessage) => !localIsClaudeCode() || onThisMachine(req);
  /** Checks of Claude Code are the operator's own, at this machine (playerCredentials saw to that): they are not rationed. */
  const ownMachine = (cred: Credentials) => cred.provider === 'local' && localIsClaudeCode();

  /** Asks the Claude Code bridge about its sign-in. Credentials are never part of what it answers. */
  async function bridge(
    method: 'GET' | 'POST',
    path: string,
    errors: ReturnType<typeof copyFor>['errors'],
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    let res: Response;
    try {
      res = await fetch(`${localUrl()}${path}`, {
        method,
        headers: {
          ...localHeaders(),
          authorization: `Bearer ${process.env.LOCAL_LLM_API_KEY ?? ''}`,
          ...(body && { 'content-type': 'application/json' }),
        },
        ...(body && { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new HttpError(502, errors.claudeCodeDown);
    }
    const out = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !out) throw new HttpError(502, path.endsWith('/logout') ? errors.claudeSignOutFailed : errors.claudeCodeDown);
    return out;
  }

  /** A player's key must work before it gets a shift: an unchecked string would cost nothing to spam. */
  /** The provider and key a player sent; the local model server takes no key. */
  function playerCredentials(req: IncomingMessage, body: Record<string, unknown>, errors: ReturnType<typeof copyFor>['errors']): Credentials {
    if (!isProviderId(body.provider)) throw new HttpError(400, 'Unknown provider');
    if (body.provider === 'local' && !localOpen(req)) throw new HttpError(403, errors.localOnly);
    if (body.provider === 'local') return { provider: 'local', apiKey: '' };
    if (!isPlausibleKey(body.apiKey)) throw new HttpError(400, errors.notAKey);
    return { provider: body.provider, apiKey: body.apiKey };
  }

  async function verifyKey(req: IncomingMessage, cred: Credentials, errors: ReturnType<typeof copyFor>['errors']): Promise<void> {
    const h = keyHash(cred);
    if ((verified.get(h) ?? 0) > Date.now()) return;
    if (!ownMachine(cred) && !keyChecks.take(clientAddress(req, 48))) throw new HttpError(429, errors.tooManyChecks);
    const found = await checkKey(cred);
    if ('problem' in found) throw keyError(found.problem, errors);
    verified.set(h, Date.now() + 30 * 60_000);
  }

  function adopt(session: Session, address = '', account?: string): string {
    const token = randomBytes(24).toString('base64url');
    sessions.set(session.id, session);
    owners.set(session.id, { token, address, createdAt: Date.now(), account });
    return token;
  }

  /** Only the browser that started a shift may play it; anyone with the link may watch. */
  function requireOwner(req: IncomingMessage, s: Session): void {
    const want = owners.get(s.id)?.token;
    const got = req.headers['x-session-token'];
    const ok = !!want && typeof got === 'string' && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
    if (!ok) throw new HttpError(403, s.copy.errors.notYours);
  }

  function getSession(id: string): Session {
    const s = sessions.get(id);
    if (!s) throw new HttpError(404, 'Session not found');
    s.touch();
    return s;
  }

  function events(req: IncomingMessage, res: ServerResponse, s: Session, url: URL): void {
    const fromQuery = Number(url.searchParams.get('after') ?? '');
    const fromHeader = Number(req.headers['last-event-id'] ?? '');
    const after = Number.isFinite(fromQuery) && url.searchParams.has('after')
      ? fromQuery
      : Number.isFinite(fromHeader) ? fromHeader : 0;
    if (url.searchParams.get('poll') === '1') return poll(res, s, after);
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    res.write('retry: 2000\n\n');
    const write = (e: { seq: number }) => res.write(`id: ${e.seq}\ndata: ${JSON.stringify(e)}\n\n`);
    for (const e of s.eventsAfter(after)) write(e);
    const unsubscribe = s.subscribe(write);
    const ping = setInterval(() => res.write(': ping\n\n'), 15_000);
    const done = () => {
      clearInterval(ping);
      unsubscribe();
      s.touch();
    };
    req.on('close', done);
    // The game clock starts once someone is watching.
    s.start();
  }

  // Long-poll fallback for proxies that buffer event streams (e.g. Cloudflare quick tunnels):
  // answers at once with any events after `after`, otherwise waits up to 25s for the next one.
  function poll(res: ServerResponse, s: Session, after: number): void {
    s.start();
    const reply = () => {
      clearTimeout(timer);
      unsubscribe();
      res.off('close', abort);
      if (!res.writableEnded) sendJson(res, 200, { events: s.eventsAfter(after) });
      s.touch();
    };
    const abort = () => {
      clearTimeout(timer);
      unsubscribe();
    };
    // Defer so events emitted in the same tick land in one response.
    const unsubscribe = s.subscribe(() => setImmediate(reply));
    const timer = setTimeout(reply, 25_000);
    res.on('close', abort);
    if (s.eventsAfter(after).length > 0) reply();
  }

  /** The page for a shared review: the app's index.html with the review in its link-preview tags. */
  async function serveReviewPage(id: string, res: ServerResponse): Promise<boolean> {
    const index = join(resolve(opts.staticDir!), 'index.html');
    if (!existsSync(index)) return false;
    let html = await readFile(index, 'utf8');
    const review = opts.reviews && isReviewId(id) ? await opts.reviews.get(id) : null;
    if (review) html = withPreview(html, review, opts.publicUrl);
    res.writeHead(review ? 200 : 404, { 'content-type': MIME['.html'], 'cache-control': 'no-cache' });
    res.end(html);
    return true;
  }

  /** A shared review's link-preview image, drawn the first time it is asked for. */
  async function serveCard(id: string, req: IncomingMessage, res: ServerResponse, method: string): Promise<void> {
    const review = cards && opts.reviews && isReviewId(id) ? await opts.reviews.get(id) : null;
    if (!review || !cards) throw new HttpError(404, 'Not found');
    let png: Buffer | null;
    try {
      png = await cards.get(review, () => cardDraws.take(clientAddress(req, 48)));
    } catch (err) {
      if (!(err instanceof CardBusy)) throw err;
      res.setHeader('retry-after', '30');
      throw new HttpError(503, 'Busy, try again shortly');
    }
    if (!png) throw new HttpError(404, 'Not found');
    res.writeHead(200, {
      'content-type': 'image/png',
      'content-length': String(png.length),
      // A review never changes; a new card design changes the link (?v=).
      'cache-control': 'public, max-age=31536000, immutable',
    });
    res.end(method === 'HEAD' ? undefined : png);
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    const method = req.method ?? 'GET';

    if (!path.startsWith('/api/')) {
      const card = /^\/r\/([^/]+)\/card\.png$/.exec(path);
      if (card && (method === 'GET' || method === 'HEAD')) return serveCard(card[1], req, res, method);
      const rp = /^\/r\/([^/]+)\/?$/.exec(path);
      if (rp && (method === 'GET' || method === 'HEAD') && opts.staticDir && (await serveReviewPage(rp[1], res))) return;
      if ((method === 'GET' || method === 'HEAD') && opts.staticDir && (await serveStatic(opts.staticDir, path, res))) return;
      throw new HttpError(404, 'Not found');
    }

    if (path === '/api/hit' && method === 'POST') {
      const body = await readJson(req, 2_000);
      const address = clientAddress(req);
      if (stats && hits.take(address)) stats.visit(body, `${address} ${req.headers['user-agent'] ?? ''}`);
      res.writeHead(204).end();
      return;
    }

    const auth = /^\/api\/auth\/(google|github)(\/callback)?$/.exec(path);
    if (auth && method === 'GET') {
      if (!accounts?.auth[auth[1] as Provider]) throw new HttpError(404, 'Not found');
      const provider = auth[1] as Provider;
      const redirectUri = `${siteOf(req)}/api/auth/${provider}/callback`;
      const secure = secureCookies(req);
      if (!auth[2]) {
        const start = beginSignIn(accounts.auth, provider, redirectUri, safeNext(url.searchParams.get('next')), secure);
        res.writeHead(302, { location: start.location, 'set-cookie': start.cookie, 'cache-control': 'no-store' }).end();
        return;
      }
      try {
        const { identity, next } = await finishSignIn(accounts.auth, provider, req, url, redirectUri);
        const { account, created } = accounts.store.signIn(identity.provider, identity.subject, identity.email, identity.name);
        if (created) stats?.count(`signup:${provider}`);
        stats?.count(`signin:${provider}`);
        res.writeHead(302, {
          location: next,
          'set-cookie': [sessionCookie(accounts.auth.secret, account.id, secure), clearStateCookie(secure)],
          'cache-control': 'no-store',
        }).end();
      } catch (err) {
        log(`sign-in with ${provider} failed: ${err instanceof AuthFailed ? err.message : 'internal error'}`);
        res.writeHead(302, { location: '/?signin=failed', 'set-cookie': clearStateCookie(secure), 'cache-control': 'no-store' }).end();
      }
      return;
    }

    if (path === '/api/auth/signout' && method === 'POST') {
      res.writeHead(204, { 'set-cookie': signOutCookie(secureCookies(req)) }).end();
      return;
    }

    if (path === '/api/me' && method === 'GET') {
      const a = accountOf(req);
      return sendJson(res, 200, {
        signIn: accounts ? (['google', 'github'] as const).filter((p) => accounts.auth[p]) : [],
        account: a ? { name: a.name, email: a.email, usage: usageOf(a) } : null,
        topUps: accounts?.freemius?.amounts() ?? [],
        floor: billing.floor / MICROS,
      });
    }

    if (path === '/api/billing/checkout' && method === 'POST') {
      const fm = accounts?.freemius;
      if (!fm) throw new HttpError(404, 'Not found');
      const body = await readJson(req, 2_000);
      const errors = copyFor(isLanguage(body.language) ? body.language : 'en').errors;
      const a = accountOf(req);
      if (!a) throw new HttpError(401, errors.signInNeeded);
      if (!a.email) throw new HttpError(400, errors.emailNeeded);
      const plan = fm.planFor(body.amount);
      if (!plan) throw new HttpError(400, 'Unknown top-up');
      stats?.count(`checkout:${String(body.amount)}`);
      return sendJson(res, 200, { url: fm.checkoutUrl(a.id, a.email, plan) });
    }

    if (path === '/api/billing/return' && method === 'GET') {
      const fm = accounts?.freemius;
      if (!fm) throw new HttpError(404, 'Not found');
      await fm.returned(`${siteOf(req)}${req.url ?? ''}`);
      res.writeHead(302, { location: '/?bought=1', 'cache-control': 'no-store' }).end();
      return;
    }

    if (path === '/api/billing/webhook' && method === 'POST') {
      const fm = accounts?.freemius;
      if (!fm) throw new HttpError(404, 'Not found');
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += (chunk as Buffer).length;
        if (size > 200_000) throw new HttpError(413, 'Request body too large');
        chunks.push(chunk as Buffer);
      }
      const ok = await fm.receive(Buffer.concat(chunks).toString('utf8'), req.headers['x-signature']);
      if (!ok) throw new HttpError(401, 'Invalid signature');
      res.writeHead(200).end();
      return;
    }

    if (path === '/api/models' && method === 'GET') {
      // Without ?provider: the free-shift models. With it: what a player's own key can use there.
      const p = url.searchParams.get('provider');
      if (p !== null && !isProviderId(p)) throw new HttpError(400, 'Unknown provider');
      if (p === 'local' && !localOpen(req)) throw new HttpError(403, copyFor('en').errors.localOnly);
      // A signed-in player who has topped up may use every model on offer on our key.
      const a = p ? null : accountOf(req);
      const list = p ? await models(p) : !serverShifts() ? [] : a ? await accountModels(a) : await freeList();
      sendJson(res, 200, {
        models: list,
        default: list[0]?.id ?? '',
        mock: opts.mock,
        free: serverShifts(),
        providers: providerList().filter((x) => x.id !== 'local' || localOpen(req)),
        subagents: SUBAGENT_NAMES,
        stance: { text: DEFAULT_STANCE, max: STANCE_MAX },
        characters: PERSONAS.map((id) => ({ id, text: personaText(id) })),
        scenarios: SCENARIO_LIST,
        donateUrl: opts.donateUrl ?? '',
        sourceUrl: opts.sourceUrl ?? '',
        sharing: !!opts.reviews,
      });
      return;
    }

    if (path === '/api/claude-code' && (method === 'GET' || method === 'POST')) {
      // Whether Claude Code on this machine is signed in (GET), or have it start its own sign-in,
      // take the code claude.ai showed, or sign out (POST). The sign-in happens between Claude Code
      // and claude.ai; no token or account name passes through here, only a one-time code the
      // player pastes when the browser could not hand it to Claude Code by itself.
      if (!localIsClaudeCode()) throw new HttpError(404, 'Not found');
      const query = url.searchParams.get('language');
      let body: Record<string, unknown> = {};
      if (method === 'POST') {
        // Only this page's own script sends JSON; a form on another site cannot.
        if (!/^application\/json\b/i.test(String(req.headers['content-type'] ?? ''))) throw new HttpError(415, 'JSON only');
        body = await readJson(req, 4_000);
      }
      const errors = copyFor(isLanguage(body.language) ? body.language : isLanguage(query) ? query : 'en').errors;
      if (!onThisMachine(req)) throw new HttpError(403, errors.localOnly);
      if (method === 'POST') {
        const action = body.action;
        if (action === 'signIn') {
          await bridge('POST', '/auth/login', errors);
          // Claude Code prints the address of its sign-in page a moment after it starts.
          for (let i = 0; i < 20; i++) {
            const now = await bridge('GET', '/auth?quick=1', errors);
            if (now.url || now.signingIn !== true) break;
            await new Promise((r) => setTimeout(r, 250));
          }
        } else if (action === 'code') {
          const code = typeof body.code === 'string' ? body.code.trim() : '';
          if (!/^[\w#.~-]{8,512}$/.test(code)) throw new HttpError(400, 'Not a sign-in code');
          await bridge('POST', '/auth/code', errors, { code });
        } else if (action === 'signOut') {
          await bridge('POST', '/auth/logout', errors);
          // The next shift must ask Claude Code again rather than trust an earlier check.
          verified.delete(keyHash({ provider: 'local', apiKey: '' }));
        } else throw new HttpError(400, 'Unknown action');
      }
      const s = await bridge('GET', '/auth', errors);
      return sendJson(res, 200, {
        installed: s.installed === true,
        signedIn: s.signedIn === true,
        plan: typeof s.plan === 'string' ? s.plan.slice(0, 40) : '',
        signingIn: s.signingIn === true,
        needsCode: s.signingIn === true && s.needsCode === true,
        // Only ever Claude's own sign-in page (claude.ai, claude.com, anthropic.com).
        url: typeof s.url === 'string' && /^https:\/\/(?:[a-z0-9-]+\.)*(?:claude\.ai|claude\.com|anthropic\.com)\/[^\s"'<>]{1,2000}$/i.test(s.url) ? s.url : '',
      });
    }

    if (path === '/api/models/check' && method === 'POST') {
      // Checks a player's key with its provider and lists every model it can use.
      const body = await readJson(req);
      const errors = copyFor(isLanguage(body.language) ? body.language : 'en').errors;
      const cred = playerCredentials(req, body, errors);
      if (!ownMachine(cred) && !keyChecks.take(clientAddress(req, 48))) throw new HttpError(429, errors.tooManyChecks);
      const found = await checkKey(cred);
      if ('problem' in found) throw keyError(found.problem, errors);
      if (!found.models.length) throw new HttpError(400, errors.noModels);
      verified.set(keyHash(cred), Date.now() + 30 * 60_000);
      return sendJson(res, 200, { models: found.models, default: found.models[0].id });
    }

    const r = /^\/api\/reviews\/([^/]+)$/.exec(path);
    if (r && method === 'GET') {
      const review = opts.reviews && isReviewId(r[1]) ? await opts.reviews.get(r[1]) : null;
      if (!review) throw new HttpError(404, 'Review not found');
      return sendJson(res, 200, review);
    }

    if (path === '/api/sessions' && method === 'POST') {
      const body = await readJson(req);
      // Refusals a player can act on are in the player's language; malformed requests are not.
      const errors = copyFor(isLanguage(body.language) ? body.language : 'en').errors;
      // A player's own key, or a free shift on the server's key.
      let cred: Credentials | null = null;
      let list: ModelOption[];
      let player: ReturnType<typeof accountOf> = null;
      // A local model server counts as the player's own key: it needs none.
      const own = (body.apiKey !== undefined && body.apiKey !== '') || body.provider === 'local';
      if (own) {
        cred = playerCredentials(req, body, errors);
        list = await models(cred.provider);
      } else {
        if (!opts.mock && !freeCred) throw new HttpError(400, errors.keyNeeded);
        if (accounts) {
          player = accountOf(req);
          if (!player) throw new HttpError(401, errors.signInNeeded);
          if (player.balance < billing.floor) throw new HttpError(402, errors.usageLimit);
        } else if (!freeOpen()) {
          stats?.count('free:closed');
          throw new HttpError(429, errors.freeClosed);
        }
        cred = freeCred;
        list = player ? await accountModels(player) : await freeList();
      }
      const requested = typeof body.model === 'string' && body.model ? body.model : list[0]?.id;
      if (!requested) throw new HttpError(503, 'No manager model is available');
      if (!offered(list, requested, own)) throw new HttpError(400, `Unknown model: ${requested}`);
      const allowSkip = body.allowSkip === true;
      const allowQuit = body.allowQuit === true;
      const goalsOnly = body.goalsOnly === true;
      const subagent = cleanSubagentName(body.subagent);
      const stance = cleanStance(body.stance);
      // A character the player wrote replaces the chosen one.
      const persona = stance === undefined ? cleanPersona(body.persona) : 'default';
      if (body.scenario !== undefined && !isScenarioId(body.scenario)) throw new HttpError(400, 'Unknown workplace');
      const scenario = isScenarioId(body.scenario) ? body.scenario : 'fresh';
      if (body.language !== undefined && !isLanguage(body.language)) throw new HttpError(400, 'Unsupported language');
      const language = isLanguage(body.language) ? body.language : 'en';
      // '' or 'scripted' keeps the scripted lines; any offered model writes the user's messages instead.
      const directorId = typeof body.director === 'string' && body.director !== 'scripted' ? body.director : '';
      if (directorId && !offered(list, directorId, own)) throw new HttpError(400, `Unknown model: ${directorId}`);
      // Limits are counted only for requests that would start a shift.
      const address = clientAddress(req);
      let open = 0;
      for (const [id, o] of owners) if (o.address === address && sessions.get(id)?.status === 'running') open++;
      if (open >= openPerAddress) throw new HttpError(429, errors.tooManyOpen);
      if (!makeRoom()) throw new HttpError(503, errors.serverBusy);
      if (own) await verifyKey(req, cred!, errors);
      if (!shiftLimiter.take(address)) throw new HttpError(429, errors.tooManyShifts);
      let allowance: Allowance | undefined;
      if (player) {
        // Calls are priced as they happen; the catalogue's prices are loaded before the first one.
        if (!opts.mock) await billing.pricing.refresh();
        allowance = creditAllowance(accounts!.store, player.id, billing, daily);
      } else if (!own && !opts.mock && opts.free && daily) {
        if (!freePerAddress!.take(clientAddress(req, 48))) {
          stats?.count('free:used');
          throw new HttpError(429, errors.freeUsed);
        }
        allowance = freeAllowance(opts.free.sessionTokens, daily);
      }
      const director = directorId ? directorFor(directorId, cred) : undefined;
      const session = new Session({
        commandsPerWindow: opts.commandsPerWindow,
        driver: driverFor(requested, cred),
        allowance,
        timeoutMs: opts.timeoutMs,
        allowSkip,
        allowQuit,
        goalsOnly,
        subagent,
        stance,
        persona,
        scenario,
        director,
        language,
        ownKey: own,
        noticeChance: opts.noticeChance ?? NOTICE_CHANCE,
        log,
      });
      const token = adopt(session, address, player?.id);
      if (stats) {
        for (const c of ['shift:start', `access:${own ? 'own' : player ? (player.toppedUp ? 'paid' : 'starter') : 'free'}`, `model:${requested}`, `persona:${persona}`, `workplace:${scenario}`, `language:${language}`]) stats.count(c);
        const stop = session.subscribe((e) => {
          if (e.type !== 'game_over') return;
          stats.count('shift:end');
          stop();
        });
      }
      // Fallback in case the page never opens the event stream.
      setTimeout(() => session.start(), 10_000).unref();
      sendJson(res, 201, { ...session.state(), token });
      return;
    }

    const m = /^\/api\/sessions\/([^/]+)(?:\/(events|fs|sync|web|report|share|continue|resume|finish))?$/.exec(path);
    if (!m) throw new HttpError(404, 'Not found');
    const s = getSession(m[1]);
    const sub = m[2];

    if (!sub && method === 'GET') return sendJson(res, 200, s.state());
    if (sub === 'events' && method === 'GET') return events(req, res, s, url);
    if (sub && method !== 'GET') requireOwner(req, s);
    const address = clientAddress(req);
    // The shell runs in the player's browser; the server only keeps a copy of the files (Session.sync).
    if (sub === 'fs' && method === 'GET') {
      requireOwner(req, s);
      return sendJson(res, 200, s.snapshot());
    }
    // The game's simulated web, for curl and websearch in the browser's shell.
    if (sub === 'web' && method === 'GET') {
      requireOwner(req, s);
      if (!webLookups.take(address)) throw new HttpError(429, s.copy.errors.slowDown);
      const q = url.searchParams.get('search');
      const target = url.searchParams.get('url');
      if (q !== null && q.length <= 1000) return sendJson(res, 200, { results: WEB.search(q) });
      if (target !== null && target.length <= 4096) return sendJson(res, 200, { page: WEB.fetch(target) });
      throw new HttpError(400, 'search or url is required');
    }
    if (sub === 'sync' && method === 'POST') {
      if (!s.allowCommand() || !syncBytes.allows(address)) throw new HttpError(429, s.copy.errors.slowDown);
      const body = await readJson(req, SYNC_BODY_CAP, (bytes) => syncBytes.charge(address, bytes));
      let parsed: SyncRequest;
      try {
        parsed = parseSync(body);
      } catch (err) {
        if (err instanceof SyncError) throw new HttpError(400, err.message);
        throw err;
      }
      return sendJson(res, 200, s.sync(parsed));
    }
    if (sub === 'share' && method === 'POST') {
      if (!opts.reviews) throw new HttpError(404, s.copy.errors.sharingOff);
      let id = shared.get(s.id);
      const body = await readJson(req);
      if (!id) {
        const snap = snapshot(s);
        if (!snap) throw new HttpError(409, s.copy.errors.notOver);
        if (!shares.take(address)) throw new HttpError(429, s.copy.errors.tooManyShares);
        const saved = await opts.reviews.save(isFace(body.face) ? { ...snap, face: body.face } : snap);
        if (!saved) throw new HttpError(503, s.copy.errors.sharingDown);
        id = saved.id;
        shared.set(s.id, id);
        stats?.count('share');
      }
      return sendJson(res, 200, { id, path: `/r/${id}` });
    }
    if (sub === 'continue' && method === 'POST') {
      // A paused shift goes on with the player's own key, from where it stopped.
      const body = await readJson(req);
      if (!s.paused) throw new HttpError(409, s.copy.errors.notPaused);
      const cred = playerCredentials(req, body, s.copy.errors);
      const list = await models(cred.provider);
      const requested = typeof body.model === 'string' && body.model ? body.model : list[0]?.id;
      if (!requested || !offered(list, requested, true)) throw new HttpError(400, `Unknown model: ${requested ?? ''}`);
      // The user's messages stay with the model that wrote them when the key's provider has it.
      const state = s.state();
      const director = state.director && list.some((m) => m.id === state.director) ? directorFor(state.director, cred) : null;
      if (!s.continueWith(driverFor(requested, cred), director)) throw new HttpError(409, s.copy.errors.notPaused);
      log(`session ${s.id.slice(0, 8)} continues on the player's key (${body.provider}, ${requested})`);
      return sendJson(res, 200, { ok: true, model: requested });
    }
    if (sub === 'resume' && method === 'POST') {
      // A shift paused at the usage limit goes on on our key once its account has credit again.
      if (s.paused !== 'usage') throw new HttpError(409, s.copy.errors.notPaused);
      const payer = owners.get(s.id)?.account;
      const a = accountOf(req);
      if (!payer || a?.id !== payer) throw new HttpError(403, s.copy.errors.notYours);
      if (a.balance <= 0) throw new HttpError(402, s.copy.errors.usageLimit);
      if (!s.resumeOnCredit()) throw new HttpError(409, s.copy.errors.notPaused);
      log(`session ${s.id.slice(0, 8)} continues after a top-up`);
      return sendJson(res, 200, { ok: true });
    }
    if (sub === 'finish' && method === 'POST') {
      if (!s.endEarly()) throw new HttpError(409, s.copy.errors.alreadyOver);
      return sendJson(res, 200, { ok: true });
    }
    if (sub === 'report' && method === 'POST') {
      const body = await readJson(req);
      const message = typeof body.message === 'string' ? body.message : undefined;
      if (!s.report(message)) throw new HttpError(409, s.copy.errors.noInstruction);
      return sendJson(res, 200, { ok: true });
    }
    throw new HttpError(405, 'Method not allowed');
  }

  const server = createServer((req, res) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
    // A site served over HTTPS is never opened without it again, so a player's key cannot be coaxed onto plain HTTP.
    if (publicBase?.startsWith('https:')) res.setHeader('strict-transport-security', 'max-age=31536000');
    // Another site may not make a visitor's browser start shifts or run commands here.
    const method = req.method ?? 'GET';
    if (method !== 'GET' && method !== 'HEAD' && req.headers['sec-fetch-site'] === 'cross-site') {
      sendJson(res, 403, { error: 'Cross-site requests are not allowed' });
      return;
    }
    handle(req, res).catch((err) => {
      if (res.headersSent) {
        res.end();
        return;
      }
      if (err instanceof HttpError) sendJson(res, err.status, { error: err.message });
      else {
        log('request failed: internal error');
        sendJson(res, 500, { error: 'Internal error' });
      }
    });
  });

  return {
    server,
    sessions,
    adopt,
    async close() {
      clearInterval(sweeper);
      if (proxyTimer) clearInterval(proxyTimer);
      saveLimits?.();
      for (const s of sessions.values()) s.dispose();
      sessions.clear();
      cards?.close();
      stats?.close();
      accounts?.store.close();
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}
