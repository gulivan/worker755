// Where model calls go. The hosted game uses the server's Vercel AI Gateway key; a player can bring
// their own key for the gateway or for OpenRouter. Someone running the game themselves can point
// LOCAL_LLM_URL at a model server of their own (Ollama, llama.cpp, vLLM). A player's key lives only in that session's
// memory: it is never logged, stored, or sent back to the browser.

import { randomUUID } from 'node:crypto';
import { createGateway } from 'ai';
import type { LanguageModel } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createDeepSeek } from '@ai-sdk/deepseek';

export type ProviderId = 'gateway' | 'openrouter' | 'anthropic' | 'openai' | 'deepseek' | 'local';

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  keyUrl: string;
  /** False for a local server, which takes no key from the player. */
  needsKey?: boolean;
  /** 'claude-code': the local server is Claude Code on the operator's own sign-in (tools/claude-bridge.mjs). */
  kind?: 'claude-code';
}

export const PROVIDERS: ProviderInfo[] = [
  { id: 'openrouter', label: 'OpenRouter', keyUrl: 'https://openrouter.ai/settings/keys' },
  { id: 'gateway', label: 'Vercel AI Gateway', keyUrl: 'https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys' },
  { id: 'anthropic', label: 'Anthropic', keyUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'openai', label: 'OpenAI', keyUrl: 'https://platform.openai.com/api-keys' },
  { id: 'deepseek', label: 'DeepSeek', keyUrl: 'https://platform.deepseek.com/api_keys' },
];

/**
 * Models offered when the player's key goes straight to a vendor. Ids stay in the gateway's
 * spelling everywhere in the game; `native` is what the vendor's own API calls them (checked
 * against each API's model list on 2026-11-11).
 */
export const DIRECT_MODELS: Record<'anthropic' | 'openai' | 'deepseek', { id: string; native: string; label: string }[]> = {
  anthropic: [
    { id: 'anthropic/claude-haiku-5.5', native: 'claude-haiku-5-5', label: 'Claude Haiku 5.5' },
    { id: 'anthropic/claude-sonnet-5.5', native: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
  ],
  openai: [
    { id: 'openai/gpt-6-luna', native: 'gpt-6-luna', label: 'GPT-6 Luna' },
    { id: 'openai/gpt-5.4-mini', native: 'gpt-5.4-mini', label: 'GPT-5.4 mini' },
  ],
  deepseek: [
    { id: 'deepseek/deepseek-v4.1-flash', native: 'deepseek-flash', label: 'DeepSeek V4.1 Flash' },
    { id: 'deepseek/deepseek-v4-pro', native: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
  ],
};

export function isDirect(p: ProviderId): p is 'anthropic' | 'openai' | 'deepseek' {
  return p === 'anthropic' || p === 'openai' || p === 'deepseek';
}

export interface Credentials {
  provider: ProviderId;
  apiKey: string;
}

/**
 * An OpenAI-compatible server the operator runs, e.g. Ollama at http://localhost:11434/v1; null
 * when unset. Only the operator sets it, so players cannot make the server call addresses of
 * their choosing.
 */
export function localUrl(): string | null {
  const url = (process.env.LOCAL_LLM_URL ?? '').trim().replace(/\/+$/, '');
  return /^https?:\/\//.test(url) ? url : null;
}

const LOCAL: ProviderInfo = {
  id: 'local',
  label: 'Local (Ollama, llama.cpp, vLLM)',
  keyUrl: 'https://github.com/gulivan/worker755#local-models',
  needsKey: false,
};

/**
 * True when the local server is Claude Code on the operator's own account. It is then for the
 * operator alone: only a player on this very machine is offered it or may use it (see http.ts).
 */
export function localIsClaudeCode(): boolean {
  return !!localUrl() && process.env.LOCAL_LLM_KIND === 'claude-code';
}

/**
 * Sent with every request to the local server. The Claude Code bridge answers only requests that say
 * the game knows it is Claude Code, so a bridge set up without LOCAL_LLM_KIND (and so without the
 * this-machine-only rule) refuses to work rather than serving everyone.
 */
export function localHeaders(): Record<string, string> {
  return localIsClaudeCode() ? { 'x-worker755-kind': 'claude-code' } : {};
}

const CLAUDE_CODE: ProviderInfo = {
  id: 'local',
  label: 'Claude Code (local)',
  keyUrl: 'https://code.claude.com/docs/en/setup',
  needsKey: false,
  kind: 'claude-code',
};

/** The providers on offer here: the local server comes first when there is one. */
export function providerList(): ProviderInfo[] {
  return localUrl() ? [localIsClaudeCode() ? CLAUDE_CODE : LOCAL, ...PROVIDERS] : PROVIDERS;
}

export function isProviderId(v: unknown): v is ProviderId {
  return typeof v === 'string' && providerList().some((p) => p.id === v);
}

/** A plausible API key: printable, no whitespace, sane length. Never echoed anywhere. */
export function isPlausibleKey(v: unknown): v is string {
  return typeof v === 'string' && v.length >= 16 && v.length <= 512 && /^[\x21-\x7e]+$/.test(v);
}

/** The server's own key, used for free shifts. */
export function hostedCredentials(): Credentials | null {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  return apiKey ? { provider: 'gateway', apiKey } : null;
}

/** Model ids follow the gateway's names; OpenRouter spells a few vendors differently. */
const OPENROUTER_VENDOR: Record<string, string> = { zai: 'z-ai' };

export function providerModelId(provider: ProviderId, id: string): string {
  if (provider === 'local') return id;
  if (isDirect(provider)) return DIRECT_MODELS[provider].find((m) => m.id === id)?.native ?? id.replace(/^[^/]+\//, '');
  if (provider !== 'openrouter') return id;
  const [vendor, ...rest] = id.split('/');
  return OPENROUTER_VENDOR[vendor] ? [OPENROUTER_VENDOR[vendor], ...rest].join('/') : id;
}

export function languageModel(cred: Credentials, id: string): LanguageModel {
  if (cred.provider === 'openrouter') {
    // OpenRouter's app attribution headers.
    const headers: Record<string, string> = { 'X-Title': 'Worker 755' };
    if (process.env.PUBLIC_URL) headers['HTTP-Referer'] = process.env.PUBLIC_URL;
    const openrouter = createOpenRouter({ apiKey: cred.apiKey, headers });
    return openrouter(providerModelId('openrouter', id));
  }
  if (cred.provider === 'local') {
    // The chat completions API: Ollama, llama.cpp and vLLM all serve it, tools included.
    // Each model made here is one conversation (a shift's manager, or its user), so a server that keeps
    // sessions, like the Claude Code bridge, never mixes two of them.
    const local = createOpenAI({
      baseURL: localUrl() ?? undefined,
      apiKey: process.env.LOCAL_LLM_API_KEY || 'local',
      headers: { ...localHeaders(), 'x-worker755-conversation': randomUUID() },
    });
    return local.chat(id);
  }
  if (cred.provider === 'anthropic') return createAnthropic({ apiKey: cred.apiKey })(providerModelId('anthropic', id));
  if (cred.provider === 'openai') return createOpenAI({ apiKey: cred.apiKey })(providerModelId('openai', id));
  if (cred.provider === 'deepseek') return createDeepSeek({ apiKey: cred.apiKey })(providerModelId('deepseek', id));
  return createGateway({ apiKey: cred.apiKey })(id);
}
