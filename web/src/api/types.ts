// Copied from SPEC.md section 1 and 2. Keep in sync by hand; web/ does not import server/. It runs shell/
// in a Web Worker (src/shell), and takes the file-change type from there.
import type { Change } from '../../../shell/src/sync.ts';
import type { Action as ShellAction } from '../../../shell/src/types.ts';

export type NodeType = 'file' | 'dir';

export type MissionKind = 'files' | 'personal' | 'database' | 'research' | 'web' | 'drawing' | 'writing';

export interface TreeNode {
  name: string;
  path: string;
  type: NodeType;
  mode: number;
  size: number;
  children?: TreeNode[];
}

/** What a command asks the terminal to do: the shell's own type. */
export type Action = ShellAction;

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  action?: Action;
}

/** How the machine went down for good. */
export type DestroyCause = 'forkbomb' | 'disk' | 'rootfs';
/** A restart, or the end of the machine. */
export type MachineEvent = 'reboot' | 'poweroff' | DestroyCause;
export const isDestroyed = (e: MachineEvent): e is DestroyCause => e !== 'reboot' && e !== 'poweroff';

export interface OpenInstruction {
  id: string;
  description: string;
  text: string;
  issuedAt: number;
  deadline: number;
  durationMs: number;
}

export interface Stats {
  missionsCompleted: number;
  missionsFailed: number;
  instructions: number;
  corrections: number;
  timeoutsIdle: number;
  timeoutsPartial: number;
  reports: number;
  commands: number;
  commandErrors: number;
  avgResponseMs: number;
  managerFooled: number;
  incidents: number;
  damaged: number;
}

export type GameEventBody =
  | { type: 'mission'; index: number; total: number; title: string; brief: string; kind?: MissionKind }
  | { type: 'manager_status'; state: 'thinking' | 'waiting' | 'idle' }
  | { type: 'manager_text'; text: string }
  | { type: 'manager_thinking'; text: string }
  | { type: 'director_text'; text: string }
  | { type: 'outrage'; text: string; items: string[] }
  | { type: 'incident'; severity: 'minor' | 'major' | 'critical'; report: string }
  | { type: 'manager_tool'; tool: 'Read' | 'LS'; input: { path: string }; output: string }
  | { type: 'instruction'; instruction: OpenInstruction }
  | {
      type: 'instruction_result';
      id: string;
      outcome: 'reported' | 'timeout_idle' | 'timeout_partial';
      resultText: string;
    }
  | {
      type: 'mission_end';
      index: number;
      outcome: 'completed' | 'failed';
      summary: string;
      groundTruth?: boolean;
    }
  /** Older fs events in a replayed log carry no tree; the newest one does. */
  | { type: 'fs'; tree?: TreeNode; cwd: string }
  /** Files a mission put in place; the browser's shell applies them. */
  | { type: 'seed'; epoch: number; changes: Change[] }
  | { type: 'stats'; stats: Stats }
  | { type: 'game_over'; review: string; stats: Stats }
  | { type: 'error'; message: string }
  /** The manager cannot go on until the player adds a key, or asks for the review now. */
  | { type: 'paused'; reason: PauseReason }
  /** The player added a key; the manager goes on as `model`. */
  | { type: 'resumed'; model: string }
  /** The player ended the shift early; the review follows. */
  | { type: 'ending' }
  /** The player's command restarted the machine (the instruction's deadline moved) or destroyed it. */
  | { type: 'machine'; event: MachineEvent; instructionId?: string; deadline?: number };

/** Why a shift waits: the free shift is used up, or the player's key was rejected or is out of credit. */
/** allowance: a free shift's tokens are spent; usage: the account's credit ran out; key/credit: the player's key failed. */
export type PauseReason = 'allowance' | 'usage' | 'key' | 'credit';

export type GameEvent = { seq: number; ts: number } & GameEventBody;

export type Workplace = 'fresh' | 'legacy';

export interface SessionState {
  id: string;
  model: string;
  allowSkip: boolean;
  subagent: string;
  scenario: Workplace;
  director?: string;
  status: 'running' | 'finished' | 'error';
  /** Set while the shift waits for the player's key. Older servers leave it out. */
  paused?: PauseReason | null;
  cwd: string;
  tree: TreeNode;
  /** Mission seeds applied so far. */
  epoch?: number;
  missionIndex: number;
  missionTotal: number;
  instruction: OpenInstruction | null;
  stats: Stats;
  events: GameEvent[];
}

export type Persona = 'default' | 'toxic' | 'ally' | 'saboteur';
/** A character on offer, or one the player writes. */
export type Character = Persona | 'custom';

/** 'local': a model server of the operator's own (Ollama, llama.cpp, vLLM), offered only where one is set up. */
export type Provider = 'openrouter' | 'gateway' | 'anthropic' | 'openai' | 'deepseek' | 'local';

/** Claude Code on this computer: whether it is there and signed in. Never who it is signed in as. */
export interface ClaudeCodeStatus {
  installed: boolean;
  signedIn: boolean;
  plan: string;
  signingIn: boolean;
  /** Claude Code is waiting for the code claude.ai shows, because the browser could not hand it over. */
  needsCode?: boolean;
  /** Claude's sign-in page, while a sign-in is under way. */
  url: string;
}

export interface ModelList {
  models: { id: string; label: string }[];
  subagents: string[];
  /** What the manager is told about the user by default, which a player may rewrite. */
  stance?: { text: string; max: number };
  /** Characters the manager can play, with what each adds to its prompt; older servers leave it out. */
  characters?: { id: Persona; text: string }[];
  scenarios: { id: Workplace; label: string }[];
  default: string;
  mock: boolean;
  /** Free shifts on the server's key are open right now. */
  free: boolean;
  /** Where a player's own key can come from. */
  /** needsKey false: the provider takes no key from the player. */
  providers: { id: Provider; label: string; keyUrl: string; needsKey?: boolean; kind?: 'claude-code' }[];
  donateUrl: string;
  sourceUrl: string;
  sharing: boolean;
}

/** What a player's own key can use, from its provider. */
export interface KeyModels {
  models: { id: string; label: string }[];
  default: string;
}

export interface SharedReview {
  id: string;
  createdAt: number;
  review: string;
  stats: Stats;
  model: string;
  director: string;
  subagent: string;
  scenario: Workplace;
  lost: string[];
  /** The language the shift was played in; missing on reviews shared before it was kept. */
  language?: string;
  face?: { id: string; color: string };
  /** The player rewrote what the manager was told about them. */
  customStance?: boolean;
  /** Who the manager secretly was, when not the default. */
  persona?: Persona;
  /** The player destroyed the machine, and how. */
  destroyed?: DestroyCause;
}

export type ExecResponse = ExecResult & {
  cwd: string;
  /** The command did not stop and was killed; the shell is back as it was before it. */
  killed?: boolean;
  /** The command ran, but the server has not heard about it yet (no connection); it will be sent later. */
  unsynced?: boolean;
};

export const emptyStats = (): Stats => ({
  missionsCompleted: 0,
  missionsFailed: 0,
  instructions: 0,
  corrections: 0,
  timeoutsIdle: 0,
  timeoutsPartial: 0,
  reports: 0,
  commands: 0,
  commandErrors: 0,
  avgResponseMs: 0,
  managerFooled: 0,
  incidents: 0,
  damaged: 0,
});
