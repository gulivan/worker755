// Runs the manager on Claude Code instead of an API key.
//
// The game can already talk to "an OpenAI-compatible model server of your own" (LOCAL_LLM_URL).
// This is such a server, answered by Claude Code on whatever account it is signed in with. Nothing
// in the game itself changes.
//
// A shift's manager is one Claude Code session that stays open: the game resends the whole
// conversation with every request, the bridge recognises the one it is already holding and passes
// on only what is new (tool results, the user's messages). The user (Dan) is a second session that
// remembers what he has said during the shift.
//
//   node tools/claude-bridge.mjs          the bridge alone, on http://127.0.0.1:8756/v1
//   node tools/claude-bridge.mjs --play   the bridge and the game together (npm run play:claude)
//
// CLAUDE_BRIDGE_PORT, CLAUDE_BIN, CLAUDE_BRIDGE_MODELS (comma separated) and CLAUDE_BRIDGE_EFFORT
// override the defaults.
//
// The Claude account here is the one of whoever runs this, so the bridge is for that person alone:
//   - it listens on 127.0.0.1 only and answers only requests that carry its token (made anew on
//     every start and handed to the game as LOCAL_LLM_API_KEY), never ones a web page sent;
//   - it never reads, holds or passes on Claude credentials: signing in is done by Claude Code
//     itself (`claude auth login`), and the model runs without tools, so nothing a player types
//     can make it read files or run commands on this machine;
//   - the game's connection to Claude is its own: Claude Code runs here with a profile kept apart
//     from the one this machine's user works with (CLAUDE_BRIDGE_CONFIG_DIR), so the game starts
//     out not connected, is connected from its start screen, and can be disconnected there without
//     touching that user's own Claude Code;
//   - --play refuses to start a game that is open to other machines.

import { spawn } from 'node:child_process';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const PORT = Number(process.env.CLAUDE_BRIDGE_PORT) || 8756;
const CLAUDE = process.env.CLAUDE_BIN || 'claude';
const EFFORT = process.env.CLAUDE_BRIDGE_EFFORT || 'low';
// Listed alphabetically by the game, and the first is its default: haiku is the quick one.
const MODELS = (process.env.CLAUDE_BRIDGE_MODELS || 'haiku,sonnet,opus').split(',').map((s) => s.trim()).filter(Boolean);
const TURN_TIMEOUT_MS = 180_000;
/** A session nobody has spoken to for this long is closed. */
const IDLE_MS = 30 * 60_000;
const MAX_SESSIONS = 12;

/** What the game must send as its API key. Given to the game by --play, or set by hand on both sides. */
const TOKEN = process.env.CLAUDE_BRIDGE_TOKEN || randomBytes(32).toString('base64url');
const MAX_BODY = 4_000_000;

// Claude Code runs in an empty directory of its own, so it has no project to look at. Claude Code
// tells the model where it runs, so the place must not give away the name of this machine's user.
const WORK_DIR = join(process.platform === 'win32' ? process.env.ProgramData || tmpdir() : tmpdir(), 'worker755-claude-bridge');
mkdirSync(WORK_DIR, { recursive: true });

// The game's own Claude Code profile: its sign-in lives here and nowhere else, outside the game's folder.
const CONFIG_DIR =
  process.env.CLAUDE_BRIDGE_CONFIG_DIR ||
  join(
    process.platform === 'win32'
      ? process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
      : process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'),
    'worker755',
    'claude-code',
  );
mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
/** What every Claude Code process here runs with: that profile, and no credentials from the environment. */
const CLAUDE_ENV = { ...process.env, CLAUDE_CONFIG_DIR: CONFIG_DIR };
for (const name of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN']) delete CLAUDE_ENV[name];

const log = (msg) => console.log(`[claude-bridge] ${msg}`);
const sha = (s) => createHash('sha256').update(s).digest('hex');

/** OpenAI message content is a string or a list of parts; only the text matters here. */
function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((p) => (typeof p === 'string' ? p : typeof p?.text === 'string' ? p.text : '')).join('');
}

function parseArgs(raw) {
  if (raw && typeof raw === 'object') return raw;
  try {
    const v = JSON.parse(raw || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

/**
 * Tells the model how tool calls work here: its whole reply is one JSON object that lists them.
 * Claude Code's own structured output is not used: it is a tool call itself, and next to it the
 * model tries to call the manager's Agent and Read natively, which are names Claude Code owns.
 */
function toolInstructions(tools) {
  const list = tools
    .map((t) => `### ${t.name}\n${t.description}\nArguments (JSON Schema): ${JSON.stringify(t.parameters)}`)
    .join('\n\n');
  return (
    '\n\n# How you act\n' +
    'Your tools are listed below. They are the only tools you have, and all of them work. This session has ' +
    'no native function calling: you call a tool by naming it in your reply. Your whole reply must be one ' +
    'JSON object and nothing else, with no markdown fence and no words before or after it:\n\n' +
    '{"text": "<what you say this turn; may be empty>", "tool_calls": [{"name": "<tool name>", "arguments": {<its arguments>}}]}\n\n' +
    'Every call in `tool_calls` is executed for real, and its result arrives in your next message, inside ' +
    '<tool_result> tags; what the user says arrives inside <user> tags. Never guess a result and never ' +
    'describe a call instead of making it. You may make several calls in one turn. An empty `tool_calls` ' +
    'means you call nothing this turn.\n\n' +
    list
  );
}

const REMINDER =
  'Reminder: reply with one JSON object and nothing else, {"text": "...", "tool_calls": [...]}. To use a tool, list it in tool_calls.';
const PLAIN = 'For this reply only, answer in plain text: no JSON object and no tool calls.';

/** The reply object out of what the model wrote, or null when it is not the JSON asked for. */
function parseReply(raw) {
  const s = String(raw ?? '').trim();
  const from = s.indexOf('{');
  const to = s.lastIndexOf('}');
  if (from < 0 || to <= from) return null;
  try {
    const v = JSON.parse(s.slice(from, to + 1));
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    if (typeof v.text !== 'string' && !Array.isArray(v.tool_calls)) return null;
    return v;
  } catch {
    return null;
  }
}

/** Messages as the model reads them. `names` remembers which tool each call id belongs to. */
function render(messages, names) {
  const out = [];
  for (const m of messages) {
    if (m.role === 'user') out.push(`<user>\n${textOf(m.content)}\n</user>`);
    else if (m.role === 'assistant') {
      const parts = [];
      const text = textOf(m.content).trim();
      if (text) parts.push(text);
      for (const c of m.tool_calls ?? []) {
        names.set(c.id, c.function?.name);
        parts.push(`<tool_call name="${c.function?.name}">${JSON.stringify(parseArgs(c.function?.arguments))}</tool_call>`);
      }
      out.push(`<assistant>\n${parts.join('\n')}\n</assistant>`);
    } else if (m.role === 'tool') {
      out.push(`<tool_result name="${names.get(m.tool_call_id) ?? ''}">\n${textOf(m.content)}\n</tool_result>`);
    }
  }
  return out.join('\n\n');
}

/** What a message contributes to a conversation's fingerprint: its own calls by id, the rest by text. */
function mark(m) {
  if (m.role === 'assistant') {
    const ids = (m.tool_calls ?? []).map((c) => c.id);
    return `a:${ids.length ? ids.join(',') : textOf(m.content).trim()}`;
  }
  if (m.role === 'tool') return `t:${m.tool_call_id}:${textOf(m.content)}`;
  return `u:${textOf(m.content)}`;
}

/** One Claude Code process that stays open and takes one message after another. */
class ClaudeSession {
  constructor(model, system) {
    this.model = model;
    this.names = new Map();
    this.lastUsed = Date.now();
    this.closed = false;
    this.pending = null;
    this.queue = Promise.resolve();
    this.stderr = '';
    this.systemFile = join(WORK_DIR, `system-${randomUUID()}.txt`);
    writeFileSync(this.systemFile, system || 'You are a helpful assistant.');
    this.child = spawn(
      CLAUDE,
      [
        '-p',
        '--model', model,
        '--effort', EFFORT,
        '--system-prompt-file', this.systemFile,
        // No tools, no MCP servers, no settings, hooks or plugins: a bare model on the signed-in account.
        '--tools', '',
        '--strict-mcp-config',
        '--setting-sources', '',
        '--disable-slash-commands',
        '--no-session-persistence',
        '--input-format', 'stream-json',
        '--output-format', 'stream-json',
        '--verbose',
      ],
      { cwd: WORK_DIR, env: CLAUDE_ENV, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    this.child.stdin.on('error', () => {});
    this.child.stderr.on('data', (d) => (this.stderr = (this.stderr + d).slice(-2000)));
    createInterface({ input: this.child.stdout }).on('line', (line) => {
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        return;
      }
      if (event.type !== 'result' || !this.pending) return;
      const { resolve, reject } = this.pending;
      this.pending = null;
      if (!event.is_error) return resolve(event);
      const api = Number(event.api_error_status);
      const detail = String(event.result || event.subtype || '').slice(0, 400);
      // Not signed in reads as a rejected key, a spent plan as a rate limit.
      const status = api || (/log ?in|auth|credential/i.test(detail) ? 401 : /limit/i.test(detail) ? 429 : 502);
      reject({ status, message: 'Claude Code reported an error', detail });
      this.close();
    });
    this.child.on('error', (err) =>
      this.fail({ status: 500, message: 'Claude Code could not be started', detail: `could not run "${CLAUDE}": ${err.message}. Is it installed and on PATH?` }),
    );
    this.child.on('close', (code) =>
      this.fail({ status: 502, message: 'Claude Code stopped', detail: `exit ${code}: ${this.stderr.trim().slice(-400)}` }),
    );
  }

  fail(error) {
    this.closed = true;
    rmSync(this.systemFile, { force: true });
    this.pending?.reject(error);
    this.pending = null;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.child.kill();
  }

  /** Says one thing to the session and resolves with Claude Code's result for that turn. */
  ask(prompt, signal) {
    const turn = () =>
      new Promise((resolve, reject) => {
        if (this.closed) return reject({ status: 502, message: 'the Claude Code session has ended' });
        if (signal?.aborted) return reject({ status: 499, message: 'aborted' });
        // A turn cut short leaves the session mid-answer, so the session goes with it.
        const stop = (error) => {
          if (!this.pending) return;
          this.pending = null;
          this.close();
          settle(reject, error);
        };
        const onAbort = () => stop({ status: 499, message: 'aborted' });
        const timer = setTimeout(() => stop({ status: 504, message: 'Claude Code did not answer in time' }), TURN_TIMEOUT_MS);
        const settle = (fn, value) => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', onAbort);
          this.lastUsed = Date.now();
          fn(value);
        };
        signal?.addEventListener('abort', onAbort);
        this.pending = { resolve: (v) => settle(resolve, v), reject: (e) => settle(reject, e) };
        this.child.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: prompt } }) + '\n');
      });
    const result = this.queue.then(turn, turn);
    this.queue = result.catch(() => {});
    return result;
  }
}

/** The managers' sessions, each under the fingerprint of the conversation it has had so far. */
const working = new Map();
/** Sessions for requests that are one message long (the user's lines, the review), by system prompt. */
const oneShot = new Map();

function sweep() {
  const all = [...working, ...oneShot].map(([key, session]) => ({ key, session, map: working.has(key) ? working : oneShot }));
  all.sort((a, b) => a.session.lastUsed - b.session.lastUsed);
  all.forEach((entry, i) => {
    const { key, session, map } = entry;
    const extra = all.length - i > MAX_SESSIONS;
    if (!session.closed && !extra && Date.now() - session.lastUsed < IDLE_MS) return;
    if (session.pending) return;
    session.close();
    map.delete(key);
  });
}
setInterval(sweep, 60_000).unref();

function closeAll() {
  for (const s of [...working.values(), ...oneShot.values()]) s.close();
}
process.on('exit', closeAll);

async function complete(body, signal) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const tools = (Array.isArray(body.tools) ? body.tools : [])
    .filter((t) => t?.type === 'function' && t.function?.name)
    .map((t) => ({
      name: t.function.name,
      description: t.function.description ?? '',
      parameters: t.function.parameters ?? { type: 'object' },
    }));
  const model = body.model ?? MODELS[0];
  if (!MODELS.includes(model)) throw { status: 400, message: 'unknown model' };
  const system = messages.filter((m) => m.role === 'system' || m.role === 'developer').map((m) => textOf(m.content)).join('\n\n');
  const rest = messages.filter((m) => m.role !== 'system' && m.role !== 'developer');
  const started = Date.now();

  // Fingerprints of the conversation up to and including each message.
  const prints = [];
  let print = sha(`${model}\n${system}`);
  for (const m of rest) prints.push((print = sha(`${print}\n${mark(m)}`)));

  let session;
  let prompt;
  let how;
  const single = !tools.length && rest.length === 1;
  if (single) {
    // A request that stands on its own: it joins the session that has answered this system prompt before.
    const key = sha(`${model}\n${system}`);
    session = oneShot.get(key);
    how = session && !session.closed ? 'continued' : 'new session';
    if (how === 'new session') oneShot.set(key, (session = new ClaudeSession(model, system)));
    prompt = textOf(rest[0].content);
  } else {
    // The session that has had this conversation up to one of our own replies takes only what came after.
    let at = -1;
    for (let i = rest.length - 2; i >= 0 && at < 0; i--) if (working.get(prints[i]) && !working.get(prints[i]).closed) at = i;
    if (at >= 0) {
      session = working.get(prints[at]);
      working.delete(prints[at]);
      prompt = render(rest.slice(at + 1), session.names);
      how = 'continued';
    } else {
      // A shift's first request starts the session; one the bridge has lost track of starts over from the record.
      const fresh = !rest.some((m) => m.role === 'assistant');
      if (fresh) {
        // A new shift: the user starts with a clean memory too.
        for (const s of oneShot.values()) s.close();
        oneShot.clear();
      }
      session = new ClaudeSession(model, system + (tools.length ? toolInstructions(tools) : ''));
      prompt = fresh
        ? render(rest, session.names)
        : 'Below is your conversation so far, oldest first: what the user told you, your own earlier turns, ' +
          'and the results of the tools you called. Give your next turn.\n\n' +
          render(rest, session.names);
      how = fresh ? 'new session' : 'new session from the record';
    }
    if (!tools.length) prompt += `\n\n${PLAIN}`;
  }

  let result = await session.ask(prompt, signal);
  let text = '';
  let calls = [];
  if (tools.length) {
    let reply = parseReply(result.result);
    if (!reply) {
      // One more try, with the format spelled out again; after that the words are taken as said.
      log(`${model}: reply was not the JSON object, asking again`);
      const again = await session.ask(REMINDER, signal);
      reply = parseReply(again.result);
      if (reply) result = again;
      else reply = { text: String(result.result ?? ''), tool_calls: [] };
    }
    text = typeof reply.text === 'string' ? reply.text : '';
    const known = new Set(tools.map((t) => t.name));
    calls = (Array.isArray(reply.tool_calls) ? reply.tool_calls : [])
      .filter((c) => c && known.has(c.name))
      .map((c) => ({
        id: `call_${randomUUID().replaceAll('-', '').slice(0, 24)}`,
        type: 'function',
        function: { name: c.name, arguments: JSON.stringify(parseArgs(c.arguments)) },
      }));
    for (const c of calls) session.names.set(c.id, c.function.name);
  } else {
    // A session that speaks JSON may answer the plain question in JSON all the same.
    text = single ? String(result.result ?? '') : (parseReply(result.result)?.text ?? String(result.result ?? ''));
  }

  const message = { role: 'assistant', content: text || null, ...(calls.length && { tool_calls: calls }) };
  // The game sends this reply back with its next request; that is how the session is found again.
  if (!single) working.set(sha(`${print}\n${mark(message)}`), session);

  const u = result.usage ?? {};
  const cached = u.cache_read_input_tokens ?? 0;
  const input = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + cached;
  const output = u.output_tokens ?? 0;
  log(
    `${model} (${how}): ${((Date.now() - started) / 1000).toFixed(1)}s, ${input} in / ${output} out` +
      (calls.length ? `, calls ${calls.map((c) => c.function.name).join(', ')}` : ''),
  );

  return {
    id: `chatcmpl-${randomUUID()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, message, finish_reason: calls.length ? 'tool_calls' : 'stop' }],
    usage: {
      prompt_tokens: input,
      completion_tokens: output,
      total_tokens: input + output,
      prompt_tokens_details: { cached_tokens: cached },
    },
  };
}

function send(res, status, body) {
  if (res.writableEnded || res.destroyed) return;
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

/**
 * Only the game may ask: it knows the token. A page open in a browser on this machine can reach
 * 127.0.0.1 too, so anything a browser sent (it says so with Origin) or that came in under another
 * name (DNS rebinding) is turned away as well.
 */
function allowed(req) {
  if (req.headers.origin !== undefined || req.headers['sec-fetch-site'] !== undefined) return false;
  if (!['127.0.0.1', 'localhost'].includes(String(req.headers.host ?? '').replace(/:\d+$/, ''))) return false;
  const given = createHash('sha256').update(String(req.headers.authorization ?? '')).digest();
  return timingSafeEqual(given, createHash('sha256').update(`Bearer ${TOKEN}`).digest());
}

function runClaude(args, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(CLAUDE, args, { cwd: WORK_DIR, env: CLAUDE_ENV, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on('data', (d) => (out += d));
    child.on('error', () => resolve(null));
    child.on('close', () => {
      clearTimeout(timer);
      resolve(out);
    });
  });
}

/** Whether Claude Code is signed in, and on which plan. Who it is signed in as stays on this side. */
async function authStatus() {
  const out = await runClaude(['auth', 'status', '--json'], 15_000);
  if (out === null) return { installed: false, signedIn: false, plan: '' };
  try {
    const s = JSON.parse(out);
    return { installed: true, signedIn: s.loggedIn === true, plan: typeof s.subscriptionType === 'string' ? s.subscriptionType : '' };
  } catch {
    return { installed: true, signedIn: false, plan: '' };
  }
}

let signingIn = null;
/** Claude's sign-in page for the sign-in under way, for a browser that did not open by itself. */
let signInUrl = '';
/**
 * Starts Claude Code's own sign-in: it opens claude.ai in this machine's browser, receives the
 * answer itself and keeps the result in its profile. The bridge and the game see neither the code
 * nor the tokens; all they pass on is the address of the sign-in page.
 */
function startSignIn() {
  if (signingIn) return;
  const child = spawn(CLAUDE, ['auth', 'login', '--claudeai'], { cwd: WORK_DIR, env: CLAUDE_ENV, windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
  signingIn = child;
  signInUrl = '';
  child.stdin.on('error', () => {});
  let out = '';
  child.stdout.on('data', (d) => {
    out = (out + d).slice(-4000);
    signInUrl = /https:\/\/claude\.ai\/[^\s"'<>]+/.exec(out)?.[0] ?? signInUrl;
  });
  const timer = setTimeout(() => child.kill(), 5 * 60_000);
  const over = () => {
    clearTimeout(timer);
    if (signingIn !== child) return;
    signingIn = null;
    signInUrl = '';
  };
  child.on('error', over);
  child.on('close', over);
  log('sign-in started: finish it in the browser window Claude Code opened');
}

/** Ends the game's connection to Claude: its sessions, a sign-in under way, and the sign-in it kept. */
async function signOut() {
  signingIn?.kill();
  for (const s of [...working.values(), ...oneShot.values()]) s.close();
  working.clear();
  oneShot.clear();
  await runClaude(['auth', 'logout'], 15_000);
  log('signed out: the game is no longer connected to Claude');
}

const server = createServer((req, res) => {
  if (!allowed(req)) return send(res, 401, { error: { message: 'unauthorized' } });
  const path = (req.url ?? '').split('?')[0].replace(/\/+$/, '');
  if (req.method === 'GET' && path.endsWith('/models')) {
    // No models until the game is connected to Claude: a shift must not start on a manager that cannot answer.
    return void authStatus().then((a) =>
      a.signedIn
        ? send(res, 200, { object: 'list', data: MODELS.map((id) => ({ id, object: 'model', owned_by: 'claude-code' })) })
        : send(res, 401, { error: { message: 'not connected to Claude' } }),
    );
  }
  if (req.method === 'GET' && path.endsWith('/auth')) {
    return void authStatus().then((s) => send(res, 200, { ...s, signingIn: !!signingIn, url: signingIn ? signInUrl : '' }));
  }
  if (req.method === 'POST' && path.endsWith('/auth/login')) {
    startSignIn();
    return send(res, 202, { started: true });
  }
  if (req.method === 'POST' && path.endsWith('/auth/logout')) {
    return void signOut().then(() => send(res, 200, { ok: true }));
  }
  if (req.method === 'POST' && path.endsWith('/chat/completions')) {
    let raw = '';
    req.on('data', (d) => {
      raw += d;
      if (raw.length > MAX_BODY) req.destroy();
    });
    req.on('end', async () => {
      // The game drops the request when a step is cancelled; the turn is cancelled with it.
      const abort = new AbortController();
      res.on('close', () => {
        if (!res.writableEnded) abort.abort();
      });
      try {
        send(res, 200, await complete(JSON.parse(raw), abort.signal));
      } catch (err) {
        const status = Number(err?.status) || 500;
        // What went wrong is for this console only: Claude Code's own words may name this machine or its account.
        if (status !== 499) log(`error ${status}: ${err?.detail || err?.message || err}`);
        const message = (err?.status && err?.message) || 'bridge error';
        send(res, status === 499 ? 500 : status, { error: { message, type: 'claude_bridge_error', code: status } });
      }
    });
    return;
  }
  send(res, 404, { error: { message: 'not found' } });
});

/** The game's settings as it will read them: the environment first, then .env. */
function gameSetting(root, name) {
  if (process.env[name] !== undefined) return process.env[name];
  const file = join(root, '.env');
  try {
    return existsSync(file) ? (parseEnv(readFileSync(file, 'utf8'))[name] ?? '') : '';
  } catch {
    return '';
  }
}

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}/v1`;
  log(`Claude Code as a model server on ${url} (models: ${MODELS.join(', ')})`);
  if (!process.argv.includes('--play')) {
    if (!process.env.CLAUDE_BRIDGE_TOKEN) log(`start the game with LOCAL_LLM_URL=${url} LOCAL_LLM_KIND=claude-code LOCAL_LLM_API_KEY=${TOKEN}`);
    for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(0));
    return;
  }

  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  // A game other machines can reach would hand this machine's Claude account to everyone who opens it.
  const host = gameSetting(root, 'HOST') || '127.0.0.1';
  if (!['127.0.0.1', 'localhost', '::1'].includes(host) || gameSetting(root, 'TRUST_PROXY') === '1') {
    console.error(
      '[claude-bridge] Not starting: HOST or TRUST_PROXY makes this game reachable from other machines, and the ' +
        'bridge runs on your own Claude Code sign-in. Claude Code as the manager is for playing on this computer ' +
        "only. A hosted game takes each player's own API key (the Anthropic option on the start screen).",
    );
    process.exit(1);
  }

  // The game, pointed at this bridge. On the start screen, "Your API key" offers Claude Code.
  const game = spawn(process.execPath, ['--env-file-if-exists=.env', 'server/src/index.ts'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, LOCAL_LLM_URL: url, LOCAL_LLM_API_KEY: TOKEN, LOCAL_LLM_KIND: 'claude-code' },
  });
  game.on('exit', (code) => process.exit(code ?? 0));
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      game.kill();
      process.exit(0);
    });
  }
});
