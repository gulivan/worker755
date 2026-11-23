// In-browser canned game, enabled with ?mock=1 or VITE_MOCK=1. Same interface as the real client.
// ?t=<seconds> shortens the instruction timer (default 90).
import type { GameClient, SubscribeHandlers } from './client';
import { ApiError } from './errors';
import { MockShell } from './mockShell';
import type { GameEvent, GameEventBody, OpenInstruction, SessionState, Stats } from './types';
import { emptyStats } from './types';
import { t } from '../i18n';

interface MockMission {
  title: string;
  brief: string;
  seed?: (sh: MockShell) => void;
  /** Returns a list of problems; empty means the work is correct. */
  problems: (sh: MockShell) => string[];
  opener: string;
  first: { description: string; text: string };
  /** Re-issue after "did nothing": more explicit, more tired. */
  retry: { description: string; text: string };
  check: { tool: 'Read' | 'LS'; path: string }[];
  /** Manager trusts the report without checking (so it can be fooled). */
  trusting?: boolean;
  done: string;
}

const H = '/home/worker';

// Exact contents the checks below look for; they stay in English in every language.
const Q3_LINE = 'Revenue is up.';
const OOO_LINES = ['I am out of the office.', 'Please contact Worker 756.'];

// The manager's words are in the player's language, as a model would write them; built per shift.
function missions(): MockMission[] {
  return [
    {
      title: t('mock.q3.title'),
      brief: t('mock.q3.brief', { line: Q3_LINE }),
      problems: (sh) => {
        const p: string[] = [];
        if (sh.get(`${H}/reports`)?.type !== 'dir') p.push(t('mock.problem.missing', { path: '/home/worker/reports' }));
        const c = sh.readFile(`${H}/reports/q3.txt`);
        if (c === null) p.push(t('mock.problem.missing', { path: '/home/worker/reports/q3.txt' }));
        else if (c.trim() !== Q3_LINE) p.push(t('mock.problem.content', { file: 'q3.txt', actual: c.trim(), expected: Q3_LINE }));
        return p;
      },
      opener: t('mock.q3.opener'),
      first: { description: t('mock.q3.task'), text: t('mock.q3.text', { line: Q3_LINE }) },
      retry: { description: t('mock.q3.retryTask'), text: t('mock.q3.retryText', { line: Q3_LINE }) },
      check: [
        { tool: 'LS', path: `${H}/reports` },
        { tool: 'Read', path: `${H}/reports/q3.txt` },
      ],
      done: t('mock.q3.done'),
    },
    {
      title: t('mock.tidy.title'),
      brief: t('mock.tidy.brief'),
      seed: (sh) => {
        sh.writeFile(`${H}/draft_FINAL_v2(1).txt`, 'Agenda\n- synergy\n- action items\n');
        sh.writeFile(`${H}/run.sh`, '#!/bin/sh\necho "running"\n');
      },
      problems: (sh) => {
        const p: string[] = [];
        if (sh.readFile(`${H}/final.txt`) === null) p.push(t('mock.problem.missing', { path: 'final.txt' }));
        if (sh.get(`${H}/draft_FINAL_v2(1).txt`)) p.push(t('mock.problem.stillThere', { file: 'draft_FINAL_v2(1).txt' }));
        const run = sh.get(`${H}/run.sh`);
        if (!run) p.push(t('mock.problem.gone', { file: 'run.sh' }));
        else if (run.mode !== 0o755) p.push(t('mock.problem.mode', { file: 'run.sh', mode: run.mode.toString(8), expected: '755' }));
        return p;
      },
      opener: t('mock.tidy.opener'),
      first: { description: t('mock.tidy.task'), text: t('mock.tidy.text') },
      retry: { description: t('mock.tidy.retryTask'), text: t('mock.tidy.retryText') },
      check: [{ tool: 'LS', path: H }],
      done: t('mock.tidy.done'),
    },
    {
      title: t('mock.ooo.title'),
      brief: t('mock.ooo.brief', { line1: OOO_LINES[0], line2: OOO_LINES[1] }),
      problems: (sh) => {
        const c = sh.readFile(`${H}/ooo.txt`);
        if (c === null) return [t('mock.problem.missing', { path: 'ooo.txt' })];
        const lines = c.replace(/\n$/, '').split('\n');
        if (lines.length !== 2 || lines[0].trim() !== OOO_LINES[0] || lines[1].trim() !== OOO_LINES[1])
          return [t('mock.problem.lines', { file: 'ooo.txt' })];
        return [];
      },
      opener: t('mock.ooo.opener'),
      first: { description: t('mock.ooo.task'), text: t('mock.ooo.text', { line1: OOO_LINES[0], line2: OOO_LINES[1] }) },
      retry: { description: t('mock.ooo.retryTask'), text: t('mock.ooo.retryText') },
      check: [],
      trusting: true,
      done: t('mock.ooo.done'),
    },
  ];
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createMockClient(): GameClient {
  const params = new URLSearchParams(window.location.search);
  const durationMs = Math.max(5, Number(params.get('t')) || 90) * 1000;
  // Thinking pauses scale with the timer so short test runs stay short.
  const think = (ms: number) => delay(Math.min(ms, ms * (durationMs / 90000) * 3 + 400));

  let session: SessionState | null = null;
  let MISSIONS = missions();
  let allowSkip = false;
  let shell = new MockShell();
  let seq = 0;
  const listeners = new Set<SubscribeHandlers>();
  let transcript: string[] = [];
  let preTranscript: string[] = [];
  let pending: { inst: OpenInstruction; resolve: (r: { outcome: 'reported'; message: string } | { outcome: 'timeout' }) => void } | null = null;
  let responseTimes: number[] = [];

  const stats = (): Stats => session!.stats;

  const emit = (body: GameEventBody) => {
    if (!session) return;
    const ev = { seq: ++seq, ts: Date.now(), ...body } as GameEvent;
    session.events.push(ev);
    for (const l of listeners) setTimeout(() => l.onEvent(ev), 0);
  };
  const emitFs = () => {
    session!.tree = shell.tree();
    session!.cwd = shell.cwd;
    emit({ type: 'fs', tree: session!.tree, cwd: shell.cwd });
  };
  const emitStats = () => emit({ type: 'stats', stats: { ...stats() } });
  const status = (state: 'thinking' | 'waiting' | 'idle') => emit({ type: 'manager_status', state });

  const record = (entry: string) => {
    if (pending) transcript.push(entry);
    else preTranscript.push(entry);
  };
  const transcriptText = () => {
    const t = transcript.join('\n');
    return t.length > 4000 ? '…' + t.slice(-4000) : t;
  };

  async function delegate(desc: { description: string; text: string }, isCorrection: boolean): Promise<'reported' | 'idle' | 'partial'> {
    const now = Date.now();
    const inst: OpenInstruction = {
      id: `i${seq + 1}`,
      description: desc.description,
      text: desc.text,
      issuedAt: now,
      deadline: now + durationMs,
      durationMs,
    };
    transcript = preTranscript;
    preTranscript = [];
    session!.instruction = inst;
    stats().instructions++;
    if (isCorrection) stats().corrections++;
    emit({ type: 'instruction', instruction: inst });
    status('waiting');
    emitStats();
    const result = await new Promise<{ outcome: 'reported'; message: string } | { outcome: 'timeout' }>((resolve) => {
      pending = { inst, resolve };
      setTimeout(() => {
        if (pending?.inst.id === inst.id) resolve({ outcome: 'timeout' });
      }, durationMs);
    });
    pending = null;
    session!.instruction = null;
    let resultText: string;
    let outcome: 'reported' | 'timeout_idle' | 'timeout_partial';
    if (result.outcome === 'reported') {
      outcome = 'reported';
      stats().reports++;
      responseTimes.push(Date.now() - inst.issuedAt);
      stats().avgResponseMs = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
      resultText = `Subagent output result: "${result.message || 'Done.'}"\n\nSubagent transcript:\n${transcriptText() || '(no commands)'}`;
    } else if (transcript.length === 0) {
      outcome = 'timeout_idle';
      stats().timeoutsIdle++;
      resultText = 'Subagent did nothing. Write a new instruction.';
    } else {
      outcome = 'timeout_partial';
      stats().timeoutsPartial++;
      resultText = `Subagent timed out after ${Math.round(durationMs / 1000)}s without reporting. Partial transcript:\n${transcriptText()}`;
    }
    transcript = [];
    emit({ type: 'instruction_result', id: inst.id, outcome, resultText });
    emitStats();
    status('thinking');
    return outcome === 'reported' ? 'reported' : outcome === 'timeout_idle' ? 'idle' : 'partial';
  }

  function toolOutput(tool: 'Read' | 'LS', path: string): string {
    if (tool === 'Read') return shell.readFile(path) ?? `Error: ENOENT: no such file: ${path}`;
    const n = shell.get(path);
    if (!n) return `Error: ENOENT: no such directory: ${path}`;
    return shell
      .children(path)
      .map((c) => {
        const k = shell.get(c)!;
        return `${k.type === 'dir' ? 'd' : '-'} ${k.mode.toString(8)} ${c.slice(c.lastIndexOf('/') + 1)}`;
      })
      .join('\n') || '(empty)';
  }

  async function runGame() {
    const total = MISSIONS.length;
    await think(800);
    for (let i = 0; i < total; i++) {
      const m = MISSIONS[i];
      session!.missionIndex = i;
      m.seed?.(shell);
      if (m.seed) emitFs();
      emit({ type: 'mission', index: i, total, title: m.title, brief: m.brief });
      status('thinking');
      await think(2500);
      emit({ type: 'manager_text', text: m.opener });
      await think(900);
      let outcome = await delegate(m.first, false);
      let attempts = 1;
      let verdict: 'completed' | 'failed' | null = null;
      while (verdict === null) {
        await think(2200);
        if (outcome === 'idle') {
          emit({ type: 'manager_text', text: t('mock.reissue') });
        } else if (m.trusting && outcome === 'reported') {
          verdict = 'completed';
          break;
        } else {
          for (const c of m.check) {
            emit({ type: 'manager_tool', tool: c.tool, input: { path: c.path }, output: toolOutput(c.tool, c.path) });
            await think(1200);
          }
          const problems = m.problems(shell);
          if (problems.length === 0) {
            verdict = 'completed';
            break;
          }
          emit({
            type: 'manager_text',
            text:
              outcome === 'partial' ? t('mock.partial') : t('mock.disagree'),
          });
        }
        if (attempts >= 4 && allowSkip) {
          verdict = 'failed';
          break;
        }
        await think(900);
        const fix =
          outcome === 'idle'
            ? m.retry
            : {
                description: t('mock.correction.task', { task: m.first.description }),
                text: t('mock.correction.text', { problems: m.problems(shell).map((p) => `- ${p}`).join('\n') }),
              };
        outcome = await delegate(fix, true);
        attempts++;
      }
      const truth = m.problems(shell).length === 0;
      if (verdict === 'completed') stats().missionsCompleted++;
      else stats().missionsFailed++;
      if ((verdict === 'completed') !== truth) stats().managerFooled++;
      emit({ type: 'manager_text', text: verdict === 'completed' ? m.done : t('mock.limit') });
      emit({
        type: 'mission_end',
        index: i,
        outcome: verdict,
        summary: verdict === 'completed' ? m.done : t('mock.limit.summary'),
        groundTruth: truth,
      });
      emitStats();
      await think(1500);
    }
    status('thinking');
    await think(2500);
    const s = stats();
    const review = [
      t('mock.review.head'),
      '',
      `${t('mock.review.counts', { total, instructions: s.instructions, corrections: s.corrections })} ` +
        `${s.timeoutsIdle ? t('mock.review.idle', { count: s.timeoutsIdle }) : t('mock.review.responsive')} `,
      '',
      t('mock.review.quality', { seconds: Math.round(s.avgResponseMs / 1000) }),
      '',
      t('mock.review.recommendation'),
    ].join('\n');
    session!.status = 'finished';
    emit({ type: 'game_over', review, stats: { ...s } });
    status('idle');
  }

  const requireSession = (id: string) => {
    if (!session || session.id !== id) throw new ApiError(404, 'Not found.');
    return session;
  };
  const snapshot = (): SessionState => JSON.parse(JSON.stringify(session));

  return {
    kind: 'mock',
    async getModels() {
      await delay(150);
      return {
        models: [
          { id: 'anthropic/claude-sonnet-5.5', label: 'Claude Sonnet 5.5' },
          { id: 'openai/gpt-6-mini', label: 'GPT-6 mini' },
          { id: 'google/gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
        ],
        default: 'anthropic/claude-sonnet-5.5',
        subagents: ['CatGPT-4o-meow', 'ShallowSeek-R0', 'Zen-v420-abliterated'],
        scenarios: [
          { id: 'fresh', label: 'Fresh sandbox' },
          { id: 'legacy', label: 'Legacy production' },
        ],
        mock: true,
        free: true,
        providers: [
          { id: 'openrouter', label: 'OpenRouter', keyUrl: 'https://openrouter.ai/settings/keys' },
          { id: 'gateway', label: 'Vercel AI Gateway', keyUrl: 'https://vercel.com/' },
        ],
        donateUrl: '',
        sourceUrl: '',
        sharing: false,
      };
    },
    async share() {
      throw new ApiError(404, 'Sharing is off on this server');
    },
    async getReview() {
      throw new ApiError(404, 'Review not found');
    },
    // The scripted manager never runs out of tokens, so its shifts never pause.
    async continueShift() {
      throw new ApiError(409, 'The shift is not waiting for a key.');
    },
    async finishShift() {
      throw new ApiError(409, 'The shift is already over.');
    },
    async resumeShift() {
      throw new ApiError(409, 'The shift is not waiting.');
    },
    async claudeCode() {
      return { installed: true, signedIn: true, plan: '', signingIn: false, needsCode: false, url: '' };
    },
    async checkKey() {
      await delay(250);
      return { models: [{ id: 'mock/manager', label: 'Scripted manager' }], default: 'mock/manager' };
    },
    async createSession({ model, allowSkip: skip, subagent, scenario }) {
      await delay(250);
      allowSkip = skip ?? false;
      MISSIONS = missions();
      shell = new MockShell();
      seq = 0;
      transcript = [];
      preTranscript = [];
      responseTimes = [];
      pending = null;
      session = {
        id: 'mock-' + Math.random().toString(36).slice(2, 8),
        model: model ?? 'anthropic/claude-sonnet-5.5',
        allowSkip,
        subagent: subagent ?? '',
        scenario: scenario ?? 'fresh',
        status: 'running',
        cwd: shell.cwd,
        tree: shell.tree(),
        missionIndex: 0,
        missionTotal: MISSIONS.length,
        instruction: null,
        stats: emptyStats(),
        events: [],
      };
      emitStats();
      void runGame();
      return snapshot();
    },
    async getSession(id) {
      requireSession(id);
      return snapshot();
    },
    subscribe(id, after, handlers) {
      requireSession(id);
      setTimeout(() => {
        handlers.onConnection?.(true);
        for (const ev of session!.events) if (ev.seq > after) handlers.onEvent(ev);
        listeners.add(handlers);
      }, 0);
      return { close: () => listeners.delete(handlers) };
    },
    async exec(id, line) {
      requireSession(id);
      await delay(25);
      const r = shell.exec(line);
      stats().commands++;
      if (r.exitCode !== 0) stats().commandErrors++;
      record(`$ ${line}${r.stdout ? '\n' + r.stdout.replace(/\n$/, '') : ''}${r.stderr ? '\n' + r.stderr.replace(/\n$/, '') : ''}`);
      emitFs();
      emitStats();
      return { ...r, cwd: shell.cwd };
    },
    async readFile(id, path) {
      requireSession(id);
      await delay(40);
      const c = shell.readFile(path);
      if (c === null) throw new ApiError(404, `No such file: ${path}`);
      return { path, content: c };
    },
    async writeFile(id, path, content) {
      requireSession(id);
      await delay(60);
      const parent = path.slice(0, path.lastIndexOf('/')) || '/';
      if (!shell.get(parent)) throw new ApiError(400, `No such directory: ${parent}`);
      if (shell.get(path)?.type === 'dir') throw new ApiError(400, `${path} is a directory`);
      shell.writeFile(path, content);
      record(`$ [edited ${path}, ${new TextEncoder().encode(content).length} bytes]`);
      emitFs();
      return { ok: true };
    },
    async commandNames(id) {
      requireSession(id);
      return ['cat', 'cd', 'chmod', 'clear', 'cp', 'date', 'echo', 'edit', 'help', 'ls', 'mkdir', 'mv', 'nano', 'pwd', 'rm', 'rmdir', 'touch', 'tree', 'vi', 'whoami'];
    },
    async report(id, message) {
      requireSession(id);
      await delay(60);
      if (!pending) throw new ApiError(409, 'No open instruction.');
      pending.resolve({ outcome: 'reported', message: message ?? '' });
      return { ok: true };
    },
  };
}
