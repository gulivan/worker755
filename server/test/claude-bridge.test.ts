import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// tools/claude-bridge.mjs against a fake Claude Code CLI (fixtures/fake-claude.mjs).
const ROOT = new URL('../..', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'w755-bridge-'));
const TOKEN = 'test-token-0123456789';
const PORT = 20000 + Math.floor(Math.random() * 20000);
const base = `http://127.0.0.1:${PORT}/v1`;
let bridge: ChildProcess;

const headers = (conversation?: string): Record<string, string> => ({
  authorization: `Bearer ${TOKEN}`,
  'x-worker755-kind': 'claude-code',
  'content-type': 'application/json',
  ...(conversation && { 'x-worker755-conversation': conversation }),
});
async function call(path: string, init: { method?: string; body?: unknown; conversation?: string; headers?: Record<string, string> } = {}) {
  const res = await fetch(`${base}${path}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: init.headers ?? headers(init.conversation),
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}
const chat = (conversation: string, messages: unknown[], tools = false) =>
  call('/chat/completions', {
    conversation,
    body: {
      model: 'haiku',
      messages,
      ...(tools && { tools: [{ type: 'function', function: { name: 'LS', description: 'list', parameters: { type: 'object' } } }] }),
    },
  });
const said = (r: { body: Record<string, any> }) => r.body.choices?.[0]?.message;
const alive = () =>
  readFileSync(join(dir, 'pids.txt'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .filter((pid) => {
      try {
        process.kill(Number(pid), 0);
        return true;
      } catch {
        return false;
      }
    });

before(async () => {
  bridge = spawn(process.execPath, [join(ROOT, 'tools/claude-bridge.mjs')], {
    env: {
      ...process.env,
      CLAUDE_BIN: join(ROOT, 'server/test/fixtures/fake-claude.mjs'),
      CLAUDE_BRIDGE_TOKEN: TOKEN,
      CLAUDE_BRIDGE_PORT: String(PORT),
      CLAUDE_BRIDGE_CONFIG_DIR: join(dir, 'profile'),
      FAKE_CLAUDE_DIR: dir,
      ANTHROPIC_BASE_URL: 'http://elsewhere.invalid',
      ANTHROPIC_API_KEY: 'sk-not-for-claude-code',
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise<void>((resolve) => bridge.stdout!.on('data', (d) => String(d).includes('model server') && resolve()));
});
after(() => bridge.kill());

test('the bridge answers only the game, and only one that knows it is Claude Code', async () => {
  const { authorization } = headers();
  assert.equal((await call('/auth', { headers: { authorization } })).status, 401, 'no kind header: refused');
  assert.equal((await call('/auth', { headers: { ...headers(), authorization: 'Bearer wrong' } })).status, 401);
  assert.equal((await call('/auth', { headers: { ...headers(), origin: 'http://127.0.0.1:8755' } })).status, 401, 'a page');
  assert.equal((await call('/models')).status, 401, 'no models before signing in');
});

test('sign-in by code, separate conversations, no orphaned processes, and a real sign-out', async () => {
  assert.equal((await call('/auth/login', { body: {} })).status, 202);
  let quick: Record<string, any> = {};
  for (let i = 0; i < 40 && !quick.needsCode; i++) {
    await new Promise((r) => setTimeout(r, 50));
    quick = (await call('/auth?quick=1')).body;
  }
  assert.equal(quick.needsCode, true);
  assert.match(quick.url, /^https:\/\/claude\.com\//, 'the page Claude Code printed, on claude.com too');
  assert.equal((await call('/auth/code', { body: { code: 'bad code!' } })).status, 400);
  assert.equal((await call('/auth/code', { body: { code: 'code-12345678' } })).status, 200);
  let status: Record<string, any> = {};
  for (let i = 0; i < 40 && !status.signedIn; i++) {
    await new Promise((r) => setTimeout(r, 100));
    status = (await call('/auth')).body;
  }
  assert.equal(status.signedIn, true);
  assert.equal((await call('/models')).status, 200);

  // Two shifts' users with the same system prompt: each has a memory of its own.
  const dan = (text: string) => [{ role: 'system', content: 'You are Dan.' }, { role: 'user', content: text }];
  assert.equal(said(await chat('shift-a-dan', dan('hello')))?.content, 'turn 1');
  assert.equal(said(await chat('shift-b-dan', dan('hello')))?.content, 'turn 1', 'shift B does not inherit A');
  assert.equal(said(await chat('shift-a-dan', dan('again')))?.content, 'turn 2');

  // A manager: the tool call comes back, and the next request continues the same session.
  const first = [{ role: 'system', content: 'You manage.' }, { role: 'user', content: 'Task 1: call LS' }];
  const r1 = said(await chat('shift-a-manager', first, true));
  assert.equal(r1.tool_calls[0].function.name, 'LS');
  assert.deepEqual(JSON.parse(r1.tool_calls[0].function.arguments), { path: '/home/worker' });
  const next = [...first, r1, { role: 'tool', tool_call_id: r1.tool_calls[0].id, content: 'a.txt' }];
  assert.equal(said(await chat('shift-a-manager', next, true))?.content, 'turn 2', 'continued');
  // The same opening twice in one conversation: the first session is closed, not left running.
  await chat('shift-c-manager', [{ role: 'system', content: 'x' }, { role: 'user', content: 'go' }], true);
  await chat('shift-c-manager', [{ role: 'system', content: 'x' }, { role: 'user', content: 'go' }], true);
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(alive().length, 4, 'two Dans, two managers');

  // Claude Code got none of the Anthropic settings from the bridge's environment.
  const seen = readFileSync(join(dir, 'env.txt'), 'utf8');
  assert.doesNotMatch(seen, /ANTHROPIC_/);

  writeFileSync(join(dir, 'logout-fails'), '');
  assert.equal((await call('/auth/logout', { body: {} })).status, 502, 'a failed sign-out says so');
  rmSync(join(dir, 'logout-fails'));
  assert.equal((await call('/auth/logout', { body: {} })).status, 200);
  assert.equal((await call('/auth')).body.signedIn, false);
  await new Promise((r) => setTimeout(r, 200));
  assert.deepEqual(alive(), [], 'every Claude Code process is gone');
});
