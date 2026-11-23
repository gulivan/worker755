import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/http.ts';
import { createLiveDriver } from '../src/manager.ts';
import { isProviderId, PROVIDERS, providerList } from '../src/providers.ts';

/** An OpenAI-compatible model server as Ollama runs it: a model list, and chat that calls a tool. */
const chats: Array<{ model: string; tools: number; auth: string; kind: string; conversation: string }> = [];
const fake = createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    res.setHeader('content-type', 'application/json');
    if (req.method === 'GET' && req.url === '/v1/models') {
      res.end(JSON.stringify({ object: 'list', data: [{ id: 'qwen3:8b' }, { id: 'nomic-embed-text' }, { id: 'llama3.1:8b' }] }));
      return;
    }
    if (req.method === 'POST' && req.url === '/v1/chat/completions') {
      const body = JSON.parse(raw);
      chats.push({
        model: body.model,
        tools: body.tools?.length ?? 0,
        auth: String(req.headers.authorization ?? ''),
        kind: String(req.headers['x-worker755-kind'] ?? ''),
        conversation: String(req.headers['x-worker755-conversation'] ?? ''),
      });
      res.end(
        JSON.stringify({
          id: 'c1',
          object: 'chat.completion',
          created: 0,
          model: body.model,
          choices: [
            {
              index: 0,
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                content: 'Checking.',
                tool_calls: [{ id: 't1', type: 'function', function: { name: 'LS', arguments: '{"path":"/home/worker"}' } }],
              },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      );
      return;
    }
    res.statusCode = 404;
    res.end('{}');
  });
});
await new Promise<void>((r) => fake.listen(0, '127.0.0.1', () => r()));
const base = `http://127.0.0.1:${(fake.address() as AddressInfo).port}/v1`;

after(() => {
  delete process.env.LOCAL_LLM_URL;
  delete process.env.LOCAL_LLM_KIND;
  fake.close();
});

test('a local model server is offered only when LOCAL_LLM_URL is set, and needs no key', async () => {
  delete process.env.LOCAL_LLM_URL;
  assert.equal(isProviderId('local'), false);
  assert.deepEqual(providerList(), PROVIDERS);
  process.env.LOCAL_LLM_URL = `${base}/`;
  assert.equal(isProviderId('local'), true);
  assert.equal(providerList()[0].id, 'local');
  assert.equal(providerList()[0].needsKey, false);

  const app = createApp({ mock: false, timeoutMs: 5000, log: () => {} });
  await new Promise<void>((r) => app.server.listen(0, '127.0.0.1', () => r()));
  const url = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  try {
    const listed = await (await fetch(`${url}/api/models?provider=local`)).json();
    assert.deepEqual(
      listed.models.map((m: { id: string }) => m.id),
      ['llama3.1:8b', 'qwen3:8b'],
      'embedding models are left out',
    );
    assert.equal(listed.providers[0].id, 'local');
    const checked = await fetch(`${url}/api/models/check`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'local' }),
    });
    assert.equal(checked.status, 200);
    assert.equal((await checked.json()).models.length, 2);
  } finally {
    await app.close();
  }
});

test('the manager talks to the local server over chat completions, tools included', async () => {
  process.env.LOCAL_LLM_URL = base;
  const driver = createLiveDriver('qwen3:8b', { provider: 'local', apiKey: '' });
  const res = await driver.step({
    system: 'You manage a subagent.',
    messages: [{ role: 'user', content: 'Task 1 of 1: look around.' }],
    tools: true,
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(res.toolCalls[0]?.name, 'LS');
  assert.deepEqual(res.toolCalls[0]?.input, { path: '/home/worker' });
  assert.equal(chats.at(-1)?.model, 'qwen3:8b');
  assert.ok((chats.at(-1)?.tools ?? 0) > 0, 'the tools are sent');
});

test('each model is its own conversation; Claude Code is marked, and offered only to this machine', async () => {
  process.env.LOCAL_LLM_URL = base;
  const step = (d: ReturnType<typeof createLiveDriver>) =>
    d.step({ system: 's', messages: [{ role: 'user', content: 'go' }], tools: true, signal: AbortSignal.timeout(5000) });
  await step(createLiveDriver('qwen3:8b', { provider: 'local', apiKey: '' }));
  await step(createLiveDriver('qwen3:8b', { provider: 'local', apiKey: '' }));
  const [a, b] = chats.slice(-2);
  assert.ok(a.conversation && b.conversation && a.conversation !== b.conversation, 'two drivers, two conversations');
  assert.equal(a.kind, '', 'a plain local server is not told it is Claude Code');

  process.env.LOCAL_LLM_KIND = 'claude-code';
  try {
    await step(createLiveDriver('qwen3:8b', { provider: 'local', apiKey: '' }));
    assert.equal(chats.at(-1)?.kind, 'claude-code');
    const app = createApp({ mock: false, timeoutMs: 5000, log: () => {} });
    await new Promise<void>((r) => app.server.listen(0, '127.0.0.1', () => r()));
    const url = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
    try {
      const here = await (await fetch(`${url}/api/models`)).json();
      assert.equal(here.providers[0].kind, 'claude-code');
      const relayed = await (await fetch(`${url}/api/models`, { headers: { 'x-forwarded-for': '203.0.113.9' } })).json();
      assert.ok(!relayed.providers.some((p: { id: string }) => p.id === 'local'), 'not offered through a proxy');
      const refused = await fetch(`${url}/api/claude-code?language=ru`, { headers: { 'x-forwarded-for': '203.0.113.9' } });
      assert.equal(refused.status, 403);
      assert.match((await refused.json()).error, /\p{Script=Cyrillic}|Claude Code/u);
    } finally {
      await app.close();
    }
  } finally {
    delete process.env.LOCAL_LLM_KIND;
  }
});
