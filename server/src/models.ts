import { createGateway } from 'ai';
import { DIRECT_MODELS, isDirect, localHeaders, localUrl, providerModelId } from './providers.ts';
import type { Credentials, ProviderId } from './providers.ts';

export interface ModelOption {
  id: string;
  label: string;
}

/**
 * Inexpensive, tool-capable models from different vendors, cheapest-and-steadiest first.
 * Only the ones present in the provider's live catalogue are offered.
 */
export const PREFERRED_MODELS = [
  'anthropic/claude-haiku-5.5',
  'openai/gpt-6-luna',
  'google/gemini-3.1-flash-lite',
  'deepseek/deepseek-v4.1-flash',
  'zai/glm-5.3-flash',
  'moonshotai/kimi-k2.6',
  'anthropic/claude-sonnet-5.5',
];

export const MOCK_MODEL: ModelOption = { id: 'mock/manager', label: 'Scripted manager' };

const CACHE_MS = 10 * 60_000;
const cache = new Map<ProviderId, { at: number; list: ModelOption[] }>();

function envList(name: string): string[] {
  const raw = process.env[name] ?? '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function gatewayCatalogue(): Promise<Map<string, string> | null> {
  try {
    // The catalogue is public; the key is passed only when the server has one.
    const gateway = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY || undefined });
    const res = await gateway.getAvailableModels();
    const map = new Map<string, string>();
    for (const m of res.models) {
      if (m.modelType && m.modelType !== 'language') continue;
      map.set(m.id, m.name || m.id);
    }
    return map;
  } catch (err) {
    const status = (err as { statusCode?: unknown })?.statusCode;
    console.error(`model catalogue request failed${typeof status === 'number' ? ` (HTTP ${status})` : ''}`);
    return null;
  }
}

async function openrouterCatalogue(): Promise<Map<string, string> | null> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw Object.assign(new Error(), { statusCode: res.status });
    const body = (await res.json()) as { data?: { id?: unknown; name?: unknown }[] };
    const map = new Map<string, string>();
    for (const m of body.data ?? []) {
      if (typeof m.id !== 'string') continue;
      // OpenRouter names read "Vendor: Model"; the vendor is already obvious from the id.
      const name = typeof m.name === 'string' ? m.name.replace(/^[^:]+:\s*/, '') : m.id;
      map.set(m.id, name || m.id);
    }
    return map;
  } catch (err) {
    const status = (err as { statusCode?: unknown })?.statusCode;
    console.error(`openrouter catalogue request failed${typeof status === 'number' ? ` (HTTP ${status})` : ''}`);
    return null;
  }
}

/** The models offered for a provider; the first one is the default. */
export async function listModels(provider: ProviderId = 'gateway'): Promise<ModelOption[]> {
  // Vendors' own model lists need the player's key, so their offer is fixed and checked by hand.
  if (isDirect(provider)) return DIRECT_MODELS[provider].map(({ id, label }) => ({ id, label }));
  if (provider === 'local') return localModels().catch(() => []);
  const hit = cache.get(provider);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.list;
  const wanted = envList('MANAGER_MODELS').length ? envList('MANAGER_MODELS') : PREFERRED_MODELS;
  const live = provider === 'openrouter' ? await openrouterCatalogue() : await gatewayCatalogue();
  let list: ModelOption[];
  if (live) {
    list = wanted
      .filter((id) => live.has(providerModelId(provider, id)))
      .map((id) => ({ id, label: live.get(providerModelId(provider, id))! }));
    // MANAGER_MODELS is trusted even if the catalogue does not know an id; the preferred list is not.
    if (!list.length && envList('MANAGER_MODELS').length) list = wanted.map((id) => ({ id, label: id }));
  } else {
    list = wanted.map((id) => ({ id, label: id }));
  }
  if (live && list.length) cache.set(provider, { at: Date.now(), list });
  // A catalogue that did not answer is asked again in a minute, not on every request.
  else if (!live) cache.set(provider, { at: Date.now() - CACHE_MS + 60_000, list });
  return list;
}

/** What free shifts run on unless FREE_MODELS says otherwise: cheap, and good enough to play against. */
export const FREE_DEFAULT_MODELS = ['deepseek/deepseek-v4.1-flash'];

/** The models a free shift may use: FREE_MODELS, or DeepSeek V4.1 Flash (the first model if the catalogue lacks it). */
export function freeModels(all: ModelOption[]): ModelOption[] {
  const env = envList('FREE_MODELS');
  const wanted = env.length ? env : FREE_DEFAULT_MODELS;
  const list = all.filter((m) => wanted.includes(m.id));
  return list.length || env.length ? list : all.slice(0, 1);
}

/** Why a player's key could not list models: rejected, out of credit, or the provider did not answer. */
export type KeyProblem = 'key' | 'credit' | 'down';

const KEY_CHECK_MS = 12_000;
/** More than any provider offers today; keeps a strange answer from flooding the page. */
const MAX_KEY_MODELS = 800;

/** OpenAI's list has every kind of model; only chat models can manage. */
const OPENAI_NOT_CHAT = /embed|whisper|tts|dall-e|image|audio|realtime|transcribe|moderation|search|davinci|babbage|sora/i;

class KeyCheckError extends Error {
  readonly problem: KeyProblem;
  constructor(problem: KeyProblem) {
    super(problem);
    this.problem = problem;
  }
}

function problemOf(status: number): KeyProblem {
  if (status === 401 || status === 403) return 'key';
  if (status === 402) return 'credit';
  return 'down';
}

async function getJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(KEY_CHECK_MS) });
  if (!res.ok) throw new KeyCheckError(problemOf(res.status));
  return res.json();
}

function entries(body: unknown): Record<string, unknown>[] {
  const data = (body as { data?: unknown })?.data;
  return Array.isArray(data) ? data.filter((m): m is Record<string, unknown> => !!m && typeof m === 'object') : [];
}

/** A vendor's own model under the game's id: the known spelling when there is one, else vendor/native. */
function directOption(provider: 'anthropic' | 'openai' | 'deepseek', native: string, name?: unknown): ModelOption {
  const known = DIRECT_MODELS[provider].find((m) => m.native === native);
  if (known) return { id: known.id, label: known.label };
  return { id: `${provider}/${native}`, label: typeof name === 'string' && name ? name : native };
}

/** What the local model server has, by its own names; embedding models cannot manage anyone. */
async function localModels(): Promise<ModelOption[]> {
  const base = localUrl();
  if (!base) return [];
  const key = process.env.LOCAL_LLM_API_KEY;
  const body = await getJson(`${base}/models`, { ...localHeaders(), ...(key ? { authorization: `Bearer ${key}` } : {}) });
  return entries(body)
    .flatMap((m) => (typeof m.id === 'string' && !/embed/i.test(m.id) ? [{ id: m.id, label: m.id }] : []))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function fetchKeyModels(cred: Credentials): Promise<ModelOption[]> {
  const bearer = { authorization: `Bearer ${cred.apiKey}` };
  switch (cred.provider) {
    case 'local':
      return localModels();
    case 'openrouter': {
      // The catalogue is public, so the key is checked on its own.
      await getJson('https://openrouter.ai/api/v1/key', bearer);
      const body = await getJson('https://openrouter.ai/api/v1/models?supported_parameters=tools', {});
      return entries(body).flatMap((m) =>
        typeof m.id === 'string'
          ? [{ id: m.id, label: typeof m.name === 'string' ? m.name.replace(/^[^:]+:\s*/, '') || m.id : m.id }]
          : [],
      );
    }
    case 'gateway': {
      const gateway = createGateway({ apiKey: cred.apiKey });
      try {
        await gateway.getCredits();
      } catch (err) {
        const status = (err as { statusCode?: unknown })?.statusCode;
        throw new KeyCheckError(typeof status === 'number' ? problemOf(status) : 'down');
      }
      const res = await gateway.getAvailableModels();
      return res.models
        .filter((m) => !m.modelType || m.modelType === 'language')
        .map((m) => ({ id: m.id, label: m.name || m.id }));
    }
    case 'anthropic': {
      const body = await getJson('https://api.anthropic.com/v1/models?limit=1000', {
        'x-api-key': cred.apiKey,
        'anthropic-version': '2023-06-01',
      });
      return entries(body).flatMap((m) => (typeof m.id === 'string' ? [directOption('anthropic', m.id, m.display_name)] : []));
    }
    case 'openai': {
      const body = await getJson('https://api.openai.com/v1/models', bearer);
      return entries(body).flatMap((m) =>
        typeof m.id === 'string' && !OPENAI_NOT_CHAT.test(m.id) ? [directOption('openai', m.id)] : [],
      );
    }
    case 'deepseek': {
      const body = await getJson('https://api.deepseek.com/models', bearer);
      return entries(body).flatMap((m) => (typeof m.id === 'string' ? [directOption('deepseek', m.id)] : []));
    }
  }
}

/**
 * Checks a player's key with its provider and lists every model it can use: the game's usual picks
 * first, then the rest by name. The key is sent only to the provider and never logged.
 */
export async function keyModels(cred: Credentials): Promise<{ models: ModelOption[] } | { problem: KeyProblem }> {
  let list: ModelOption[];
  try {
    list = await fetchKeyModels(cred);
  } catch (err) {
    const problem = err instanceof KeyCheckError ? err.problem : 'down';
    console.error(`key check for ${cred.provider} failed (${problem})`);
    return { problem };
  }
  const seen = new Set<string>();
  list = list.filter((m) => !seen.has(m.id) && seen.add(m.id));
  const native = (id: string) => providerModelId(cred.provider, id);
  const rank = (m: ModelOption) => {
    const i = PREFERRED_MODELS.findIndex((id) => native(id) === native(m.id));
    return i < 0 ? PREFERRED_MODELS.length : i;
  };
  list.sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label));
  return { models: list.slice(0, MAX_KEY_MODELS) };
}

/** Shape of a model id a player may pick with their own key: the provider decides if it exists. */
export function isModelId(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9][\w.:@/+-]{0,159}$/.test(v);
}
