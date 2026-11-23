#!/usr/bin/env node
// Stands in for the Claude Code CLI in claude-bridge.test.ts. State lives in FAKE_CLAUDE_DIR.
import { appendFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const dir = process.env.FAKE_CLAUDE_DIR;
const signedIn = join(dir, 'signed-in');
const args = process.argv.slice(2);
appendFileSync(join(dir, 'env.txt'), `${Object.keys(process.env).filter((k) => /^(ANTHROPIC_|CLAUDE_)/.test(k)).join(',')}\n`);

if (args[0] === 'auth' && args[1] === 'status') {
  console.log(JSON.stringify({ loggedIn: existsSync(signedIn), subscriptionType: 'max' }));
} else if (args[0] === 'auth' && args[1] === 'logout') {
  if (existsSync(join(dir, 'logout-fails'))) process.exit(1);
  rmSync(signedIn, { force: true });
} else if (args[0] === 'auth' && args[1] === 'login') {
  process.stdout.write('Opening https://claude.com/cai/oauth/authorize?code=true\nPaste code here if prompted > ');
  createInterface({ input: process.stdin }).once('line', (code) => {
    if (code.trim() === 'code-12345678') writeFileSync(signedIn, '');
    process.exit(0);
  });
} else {
  // A chat session: answers each message with how many it has had, and keeps running.
  appendFileSync(join(dir, 'pids.txt'), `${process.pid}\n`);
  let turns = 0;
  // With tools the bridge asks for one JSON object per reply; without, plain words.
  const system = readFileSync(args[args.indexOf('--system-prompt-file') + 1], 'utf8');
  const json = system.includes('# How you act');
  createInterface({ input: process.stdin }).on('line', (line) => {
    const said = JSON.parse(line).message.content;
    turns += 1;
    const reply = said.includes('call LS')
      ? { text: 'looking', tool_calls: [{ name: 'LS', arguments: { path: '/home/worker' } }] }
      : { text: `turn ${turns}`, tool_calls: [] };
    const result = json ? JSON.stringify(reply) : reply.text;
    console.log(JSON.stringify({ type: 'result', is_error: false, result, usage: { input_tokens: 1, output_tokens: 1 } }));
  });
}
