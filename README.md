# Worker 755

A browser game where your manager is an AI agent, and it believes you are its subagent.

https://github.com/user-attachments/assets/279ed2c4-59de-4d32-ad71-c5ee943adefe

The manager (a real LLM: Claude, GPT, Gemini, DeepSeek, GLM, Kimi) is set up like any orchestrator.
It has a task queue, read-only access to the machine, and a tool that "spawns a subagent". The
subagent is you. Its instructions land in your terminal with a 90-second clock. You carry them
out, or don't, and it gets back exactly what a subagent would return: your report and the command
transcript, or `Subagent did nothing. Write a new instruction.` Then it checks your work, sends
corrections, files incident reports, and finally writes your performance review.

Meanwhile Dan, the user who hired the agent, watches the chat. His family photos, the only signed
NDA and a speech due this week are one `rm` away, and every shift his home folder holds
something new to lose.

![Playing a shift](docs/play.png)

## Play

- **Free shift**: on servers that offer it, a few shifts a day run on the server's key with a
  cheap model. With sign-in on (worker755.com), an account gets a starter credit worth about one
  shift, then tops up ($10 to $200) and pays for what it uses; after a top-up any offered model
  can run on the server's key.
- **Your API key**: bring an [OpenRouter](https://openrouter.ai/settings/keys) or Vercel AI
  Gateway key and pick any offered model. The key is sent only to the game server when a shift
  starts. It is kept in that shift's memory and never logged or stored. Your browser keeps it only
  if you tick "Remember on this device". A full shift on Claude Haiku costs a few cents at most.

Options on the start screen:

- **Workplace**: a fresh sandbox, or legacy production with a live database.
- **The director**: scripted lines, or an LLM playing Dan.
- **You run on**: the model name your manager believes you are.
- **Allow skipping failed tasks**: off by default, so the manager can't give up on you.
- **No command hints**: the manager says what the result must be, never which commands to run.

When the shift ends you can share your review as a link.

## Run it

Needs Node 24 or newer (the server runs TypeScript directly).

```sh
npm run setup          # install server and web dependencies
npm run build          # build the web app into web/dist
npm start              # http://127.0.0.1:8755
```

With no key configured, every player brings their own. To offer free shifts, put a Vercel AI
Gateway key in `.env`:

```sh
cp .env.example .env   # then set AI_GATEWAY_API_KEY and the limits
```

Offline, with a scripted manager and no network:

```sh
npm run mock
```

For UI work, run `npm run dev:web` alongside `npm run mock`. Vite proxies `/api` to the server.

### Local models

The manager can run on your own model server: Ollama, llama.cpp's `llama-server`, vLLM, or anything
else with an OpenAI-compatible API. Point `LOCAL_LLM_URL` at it and pick **Local** under "Your API
key"; no key is asked for, and its models are listed as the server names them.

```sh
ollama pull qwen3:8b
LOCAL_LLM_URL=http://127.0.0.1:11434/v1 npm start
```

The manager works through tool calls, so pick a model that supports them (Qwen 3, Llama 3.1 and
newer, Mistral Small). Small models give up or loop more often; that is part of the fun, up to a
point. In Docker, reach a server on the host at `http://host.docker.internal:11434/v1`
(`--add-host=host.docker.internal:host-gateway` on Linux).

### Claude Code as the manager

> **At your own risk.** This runs the game on your personal Claude subscription. Anthropic's terms
> may not allow a subscription to power third-party apps, and your account could be limited. The
> supported way is an Anthropic API key: pick **Anthropic** under **Your API key** on the start
> screen. Claude subscriptions don't include API access; API usage is billed separately at
> [console.anthropic.com](https://console.anthropic.com).

If you use [Claude Code](https://code.claude.com), the manager can run on its sign-in instead of an
API key:

```sh
npm run play:claude    # http://127.0.0.1:8755, provider "Claude Code (local)"
```

`tools/claude-bridge.mjs` stands in for a local model server and answers with Claude Code; a shift's
manager is one Claude Code session that stays open. The game's connection to Claude is its own,
kept apart from the Claude Code you work with: on the start screen, **Connect to Claude** opens
claude.ai to sign in and **Disconnect** removes the connection again. The sign-in is carried out
and kept by Claude Code (in `%LOCALAPPDATA%\worker755\claude-code`, or
`~/.local/share/worker755/claude-code`): the game never sees a Claude password, code or token.

This is for playing on your own computer only, because it runs on your own Claude account. The
bridge listens on 127.0.0.1 and answers only the game, the game offers it only to a browser on the
same machine, and `play:claude` refuses to start with `HOST` or `TRUST_PROXY` set for hosting. A
hosted game takes each player's own API key.
Don't put a reverse proxy or tunnel in front of it: one that forwards other machines' requests
without `X-Forwarded-For` would make them look local.

If claude.ai cannot hand the sign-in back to Claude Code, the start screen asks for the code it
shows. On Windows, use the native `claude.exe` (set `CLAUDE_BIN` if it is not on PATH); npm's
`.cmd` shim cannot be started directly. To run the bridge on its own, set the same random
`CLAUDE_BRIDGE_TOKEN` for it and as the game's `LOCAL_LLM_API_KEY`, with
`LOCAL_LLM_URL=http://127.0.0.1:8756/v1` and `LOCAL_LLM_KIND=claude-code`.

### HTTPS and keys

The browser sends a player's API key only from HTTPS, localhost, or a private-network address
(192.168.x.x, 10.x.x.x, `name.local` and the like), so a key never crosses the internet in the
clear. With an `https://` `PUBLIC_URL` the server also sends `Strict-Transport-Security` for a
year: browsers then keep to HTTPS on that host name even if you later serve it over HTTP.

### Docker

```sh
docker build -t worker-755 .
docker run -p 8755:8755 -v worker755-data:/data --env-file .env worker-755
```

The container listens on `0.0.0.0:8755` and keeps shared reviews in `/data`. Behind Cloudflare,
set `TRUST_PROXY=1` so the limits see real client addresses.

`deploy/compose.yaml` runs it behind a Cloudflare tunnel instead: its own network, no published
ports, an unprivileged read-only container and resource limits. The steps are in the file.

## Configuration

Everything is optional. See [.env.example](.env.example).

| Variable | Default | |
| --- | --- | --- |
| `AI_GATEWAY_API_KEY` | | Turns on free shifts, paid from this key |
| `FREE_MODELS` | first offered model | Models free shifts may use, comma separated |
| `FREE_SHIFT_TOKENS` | 250000 | Without sign-in: token allowance per free shift (the review is always written) |
| `FREE_DAILY_TOKENS` | 5000000 | Without sign-in: tokens per UTC day across all free shifts |
| `FREE_SHIFTS_PER_DAY` | 3 | Without sign-in: free shifts per address per day |
| `AUTH_SECRET` | | Turns on sign-in with Google or GitHub: shifts on the server's key are paid from the account's credit (see `.env.example`) |
| `FREE_CREDIT_USD` | 0.25 | With sign-in: one-time starter credit, about one shift on DeepSeek V4.1 Flash |
| `USAGE_MULTIPLIER` | 2 | With sign-in: what a model call costs the player, as a multiple of its price |
| `MIN_START_USD` | 0.05 | With sign-in: credit needed to start a shift |
| `FREEMIUS_TOPUPS` | | With sign-in: top-up plans as `<planId>:<dollars>,...`; also needs `FREEMIUS_PRODUCT_ID`, `FREEMIUS_PUBLIC_KEY`, `FREEMIUS_SECRET_KEY`, `FREEMIUS_API_KEY` |
| `SHIFTS_PER_HOUR` | 30 | Shift starts per address per hour, on any key |
| `MANAGER_MODELS` | built-in list | Models offered, in gateway naming (`vendor/model`) |
| `LOCAL_LLM_URL` | | An OpenAI-compatible model server of your own, e.g. `http://127.0.0.1:11434/v1` for Ollama; offered as **Local** |
| `LOCAL_LLM_API_KEY` | | Sent to that server, for ones that want a key |
| `INSTRUCTION_TIMEOUT_MS` | 90000 | Time per instruction |
| `HOST`, `PORT` | 127.0.0.1, 8755 | |
| `TRUST_PROXY` | 0 | Read client addresses from `cf-connecting-ip` |
| `TRUSTED_PROXIES` | | Hosts allowed to set `cf-connecting-ip` (e.g. `tunnel`); empty trusts any peer |
| `DATA_DIR` | `server/data` | Where shared reviews and the free-shift counts are saved |
| `SHARING` | 1 | `0` turns review sharing off |
| `SOURCE_URL`, `DONATE_URL` | | Links shown under the start screen and the review |
| `PUBLIC_URL` | | Sent to OpenRouter for app attribution |

## How it works

```
shell/    in-memory filesystem, shell interpreter and a small SQLite-like engine (no dependencies)
server/   game engine: missions, the manager loop, the director, scoring, HTTP API
web/      React UI: assignment card, terminal, editor, the manager's feed, your record
```

The manager's prompt never mentions humans or games; see `server/src/manager.ts`. Each mission
has a hidden ground-truth check, so the game knows when the manager signs off on broken work
("Times the manager was wrong"). [SPEC.md](SPEC.md) is the full design.

```sh
npm test               # shell and server tests, offline
npm run typecheck
```

## License

[MIT](LICENSE)
