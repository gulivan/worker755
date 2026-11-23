import { useEffect, useRef, useState } from 'react';
import { client } from '../api/client';
import { ApiError } from '../api/errors';
import type { ClaudeCodeStatus } from '../api/types';
import { t } from '../i18n';
import { rich } from '../i18n/rich';

/** How often the page asks again while a sign-in is under way, and for how long. */
const POLL_MS = 2_500;
const POLL_FOR_MS = 5 * 60_000;

/**
 * Connects the game to the player's Claude account through Claude Code on this computer, and
 * disconnects it again. The sign-in itself is on claude.ai, opened and received by Claude Code:
 * this page never asks for, receives or stores a Claude password, code or token.
 */
export function ClaudeCodeAuth({ className, onChange }: { className?: string; onChange?: (connected: boolean) => void }) {
  const [status, setStatus] = useState<ClaudeCodeStatus | null>(null);
  const [down, setDown] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [busy, setBusy] = useState(false);
  /** What went wrong with the last thing the player asked for, in the server's words. */
  const [problem, setProblem] = useState('');
  const [code, setCode] = useState('');
  const was = useRef<boolean | null>(null);
  const until = useRef(0);

  const load = async (action?: 'signIn' | 'signOut' | 'code', value?: string) => {
    try {
      const s = await client.claudeCode(action, value);
      setStatus(s);
      setDown(false);
      setProblem('');
      if (s.signedIn || (action !== 'signIn' && !s.signingIn)) setWaiting(false);
      // A sign-in already under way (the player switched away and back) is picked up again.
      else if (s.signingIn && !action) {
        if (until.current < Date.now()) until.current = Date.now() + POLL_FOR_MS;
        setWaiting(true);
      }
      // The models on offer follow the connection, so the form hears of it first and whenever it changes.
      if (was.current !== s.signedIn) onChange?.(s.signedIn);
      was.current = s.signedIn;
    } catch (err) {
      // A refused action (a sign-out that did not happen, a code that was not taken) is said as such;
      // anything else means Claude Code is out of reach.
      if (action && err instanceof ApiError && err.status > 0) {
        setProblem(err.message);
        if (action === 'signIn') setWaiting(false);
      } else {
        setDown(true);
        setWaiting(false);
      }
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => {
      if (Date.now() > until.current) setWaiting(false);
      else void load();
    }, POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  const signIn = () => {
    until.current = Date.now() + POLL_FOR_MS;
    setWaiting(true);
    void load('signIn');
  };

  const signOut = async () => {
    setBusy(true);
    await load('signOut');
    setBusy(false);
  };

  const sendCode = async () => {
    setBusy(true);
    await load('code', code.trim());
    setCode('');
    setBusy(false);
  };

  const signedIn = status?.signedIn === true;
  return (
    <div className={`claude-auth${className ? ` ${className}` : ''}`}>
      <div className="key-check">
        {status && status.installed && !signedIn && (
          <button type="button" className="btn btn-small" onClick={signIn} disabled={waiting}>
            {t('claude.signIn')}
          </button>
        )}
        {signedIn && (
          <button type="button" className="btn btn-small" onClick={() => void signOut()} disabled={busy}>
            {t('claude.signOut')}
          </button>
        )}
        {(down || (status && !signedIn && !waiting)) && (
          <button type="button" className="btn btn-small" onClick={() => void load()}>
            {t('claude.recheck')}
          </button>
        )}
        <span className={`key-status${signedIn ? ' key-ok' : down || (status && !waiting) ? ' key-bad' : ''}`} aria-live="polite">
          {down
            ? t('claude.down')
            : !status
              ? t('claude.checking')
              : signedIn
                ? `${t('claude.signedIn')}${status.plan ? ` · ${status.plan}` : ''}`
                : waiting
                  ? t('claude.waiting')
                  : status.installed
                    ? t('claude.signedOut')
                    : t('claude.missing')}
        </span>
        {waiting && !signedIn && status?.url && (
          <a className="key-status" href={status.url} target="_blank" rel="noreferrer">
            {t('claude.openPage')}
          </a>
        )}
        {problem && (
          <span className="key-status key-bad" role="alert">
            {problem}
          </span>
        )}
      </div>
      {waiting && !signedIn && status?.needsCode && (
        <form
          className="key-check"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) void sendCode();
          }}
        >
          <input
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('claude.codeLabel')}
            aria-label={t('claude.codeLabel')}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="btn btn-small" disabled={busy || !code.trim()}>
            {t('claude.codeSend')}
          </button>
        </form>
      )}
      <p className="key-note key-risk" role="note">
        <span>{rich('claude.risk')}</span>
      </p>
      <p className="key-note">
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
          <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <span>{rich('claude.note')}</span>
      </p>
    </div>
  );
}
