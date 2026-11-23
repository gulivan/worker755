import { useEffect, useRef, useState } from 'react';
import { ApiError, client } from '../api/client';
import { atLimit, checkoutUrl, getMe, NO_ACCOUNT, signOut } from '../api/account';
import type { Me } from '../api/account';
import type { NewSession } from '../api/client';
import type { Character, ModelList, Provider, Workplace } from '../api/types';
import { rememberLabels } from '../game/labels';
import { BotAvatar } from '../components/BotAvatar';
import { loadFace, randomFace, saveFace } from '../game/avatar';
import { loadKey, loadPicks, saveKey, savePicks } from '../game/apiKey';
import { useLanyard } from '../game/useLanyard';
import { KeyCheckRow, ModelOptions, useKeyCheck } from '../components/KeyCheck';
import { ClaudeCodeAuth } from '../components/ClaudeCodeAuth';
import { ShiftOffer } from '../components/ShiftOffer';
import { UsageMeter } from '../components/Usage';
import type { OfferKind } from '../components/ShiftOffer';
import { currentLanguage, dateLocale, LANGUAGE_LABELS, LANGUAGES, setLanguage, t, type Key, type Language } from '../i18n';

interface Props {
  onStart(opts: NewSession): Promise<void>;
}

const WORKPLACES: Workplace[] = ['fresh', 'legacy'];

const PERSONA_LABEL: Record<Character, Key> = {
  default: 'start.persona.default',
  toxic: 'start.persona.toxic',
  ally: 'start.persona.ally',
  saboteur: 'start.persona.saboteur',
  custom: 'start.persona.custom',
};
const PERSONA_IDS = Object.keys(PERSONA_LABEL);

const WORKPLACE_LABEL: Record<Workplace, Key> = {
  fresh: 'start.workplace.fresh',
  legacy: 'start.workplace.legacy',
};

/** What the badge says about where you are posted. */
const POSTING: Record<Workplace, { org: Key; access: string }> = {
  fresh: { org: 'badge.org.fresh', access: 'r-x' },
  legacy: { org: 'badge.org.legacy', access: 'rwx' },
};

type Access = 'free' | 'own';

export function Start({ onStart }: Props) {
  // Held in state so the screen re-renders in the new language at once.
  const [language, pickLanguage] = useState<Language>(currentLanguage);
  const changeLanguage = (next: Language) => {
    setLanguage(next);
    pickLanguage(next);
  };
  const [saved] = useState(loadKey);
  const [access, setAccess] = useState<Access>(saved ? 'own' : 'free');
  const [provider, setProvider] = useState<Provider>(saved?.provider ?? 'openrouter');
  const [apiKey, setApiKey] = useState(saved?.apiKey ?? '');
  const [remember, setRemember] = useState(!!saved);
  /** Whether free shifts are on offer; assumed until the server says otherwise. */
  const [freeOpen, setFreeOpen] = useState(true);
  const [reload, setReload] = useState(0);
  const [models, setModels] = useState<ModelList | null>(null);
  /** What the player chose last time; kept while the lists load, until a list on offer has it. */
  const wanted = useRef(loadPicks());
  const [model, setModel] = useState<string>(wanted.current.model ?? '');
  const [allowSkip, setAllowSkip] = useState(false);
  const [allowQuit, setAllowQuit] = useState(false);
  const [goalsOnly, setGoalsOnly] = useState(false);
  const [subagent, setSubagent] = useState('');
  /** The badge gets a random knock-off model name once the list arrives, unless the player typed one. */
  const named = useRef(false);
  const [scenario, setScenario] = useState<Workplace>('fresh');
  const [director, setDirector] = useState(wanted.current.director ?? '');
  /** The character the player wrote, kept while they try the ones on offer. */
  const [stance, setStance] = useState<string>(wanted.current.stance ?? '');
  const writeStance = (text: string) => {
    setStance(text);
    wanted.current = { ...wanted.current, stance: text };
    savePicks(wanted.current);
  };
  const [persona, setPersona] = useState<Character>(
    PERSONA_IDS.includes(wanted.current.persona ?? '')
      ? (wanted.current.persona as Character)
      : wanted.current.stance
        ? 'custom'
        : 'default',
  );
  const choose = (next: Character) => {
    // Writing your own starts from the character picked so far.
    if (next === 'custom' && !stance.trim()) {
      writeStance(models?.characters?.find((c) => c.id === persona)?.text ?? models?.stance?.text ?? '');
    }
    pick({ persona: next });
  };
  const pick = (next: { model?: string; director?: string; persona?: Character }) => {
    wanted.current = { ...wanted.current, ...next };
    savePicks(wanted.current);
    if (next.model !== undefined) setModel(next.model);
    if (next.director !== undefined) setDirector(next.director);
    if (next.persona !== undefined) setPersona(next.persona);
  };
  const [face, setFace] = useState(loadFace);
  const badge = useLanyard<HTMLDivElement>();
  const newFace = () => {
    const next = randomFace(face);
    saveFace(next);
    setFace(next);
  };
  const [me, setMe] = useState<Me | null>(null);
  /** Back from sign-in or the checkout: what to tell the player. */
  const [arrival] = useState(() => {
    const q = new URLSearchParams(location.search);
    return q.get('bought') ? 'bought' : q.get('signin') === 'failed' ? 'signInFailed' : null;
  });
  const [buying, setBuying] = useState(false);
  useEffect(() => {
    if (arrival) history.replaceState(null, '', location.pathname);
    let live = true;
    const load = () =>
      getMe()
        .then((m) => live && setMe(m))
        .catch(() => live && setMe(NO_ACCOUNT));
    void load();
    // Freemius tells the server about a purchase within seconds; look again a few times.
    const timers = arrival === 'bought' ? [2000, 5000, 10000, 20000].map((ms) => setTimeout(load, ms)) : [];
    return () => {
      live = false;
      timers.forEach(clearTimeout);
    };
  }, [arrival]);
  /** Shifts on our key need an account here. */
  const accounts = !!me?.signIn.length;
  /** A topped-up account may pick any model on our key; the list is fetched again when that changes. */
  const toppedUp = !!me?.account?.usage.topUp;
  /** Asked on clocking in when a shift on our key cannot start: sign in first, or the usage is used up. */
  const [shiftOffer, setShiftOffer] = useState<OfferKind | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);
  const showOffer = (kind: OfferKind | null) => {
    setOfferError(null);
    setShiftOffer(kind);
  };
  const buy = async (amount: number) => {
    setBuying(true);
    setOfferError(null);
    try {
      location.assign(await checkoutUrl(language, amount));
    } catch (err) {
      setOfferError(err instanceof ApiError ? err.message : t('start.failed'));
      setBuying(false);
    }
  };
  const keyInput = useRef<HTMLInputElement>(null);
  /** Bumped to move the cursor to the key field once it is on screen. */
  const [focusKey, setFocusKey] = useState(0);
  useEffect(() => {
    if (focusKey) keyInput.current?.focus();
  }, [focusKey]);
  const ownKeyInstead = () => {
    showOffer(null);
    setAccess('own');
    setFocusKey((n) => n + 1);
  };
  const leave = async () => {
    await signOut();
    setMe((m) => (m ? { ...m, account: null } : m));
  };
  const [loadError, setLoadError] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const btn = useRef<HTMLButtonElement>(null);

  // The model list depends on how the shift is paid for: free models, or what the key's provider has.
  useEffect(() => {
    let live = true;
    setModels(null);
    setLoadError(false);
    client
      .getModels(access === 'own' ? provider : undefined)
      .then((m) => {
        if (!live) return;
        rememberLabels(m.models);
        setFreeOpen(m.free);
        if (access === 'free' && !m.free) {
          setAccess('own');
          return;
        }
        setModels(m);
        if (!named.current && m.subagents.length) {
          named.current = true;
          setSubagent((cur) => cur || m.subagents[Math.floor(Math.random() * m.subagents.length)]);
        }
      })
      .catch(() => live && setLoadError(true));
    return () => {
      live = false;
    };
  }, [access, provider, reload, toppedUp]);
  const keyInfo = models?.providers.find((p) => p.id === provider);
  /** A local model server takes no key: the key field goes, and its models are listed at once. */
  const keyless = keyInfo?.needsKey === false;
  const keyCheck = useKeyCheck(provider, apiKey, !keyless);
  /** Claude Code has models to list only once the game is connected to Claude. */
  const [claudeConnected, setClaudeConnected] = useState(false);
  // Where the server has a local model server, it is the default for a player with no saved key.
  const localDefault = useRef(false);
  useEffect(() => {
    if (localDefault.current || !models?.providers.length) return;
    localDefault.current = true;
    if (!saved && models.providers[0].needsKey === false) setProvider(models.providers[0].id);
  }, [models, saved]);
  useEffect(() => {
    if (access === 'own' && keyless && keyCheck.status === 'idle') void keyCheck.check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, keyless, keyCheck.status]);
  // Once the key is checked, everything it can use is on offer, not only the usual picks.
  const offer = access === 'own' && keyCheck.models ? keyCheck.models : (models?.models ?? []);
  // The picks always come from the list on offer, also when a checked key is changed again. The
  // player's own choice comes back whenever the list has it (e.g. once their saved key is checked).
  useEffect(() => {
    if (!offer.length) return;
    const has = (id?: string) => !!id && offer.some((x) => x.id === id);
    const { model: m, director: d } = wanted.current;
    setModel((cur) => (has(m) ? m! : has(cur) ? cur : (models?.default ?? offer[0].id)));
    setDirector((cur) => (has(d) ? d! : has(cur) ? cur : ''));
  }, [offer, models]);
  // A remembered key is checked on arrival, so its whole model list is on offer straight away.
  useEffect(() => {
    if (saved) void keyCheck.check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The button is disabled until the list arrives, and a disabled button cannot take focus. Only on
  // arrival: later lists (another provider, the free shift or a key) leave the cursor where it is.
  const focused = useRef(false);
  useEffect(() => {
    if (!models || focused.current) return;
    focused.current = true;
    btn.current?.focus();
  }, [models]);

  const go = async () => {
    if (starting) return;
    const key = apiKey.trim();
    if (access === 'own' && !key && !keyless) {
      setStartError(t('start.pasteKey'));
      return;
    }
    if (access === 'free' && accounts && !me?.account) return showOffer('signIn');
    if (access === 'free' && accounts && atLimit(me)) return showOffer('limit');
    setStarting(true);
    setStartError(null);
    if (access === 'own' && !keyless) saveKey(remember ? { provider, apiKey: key } : null);
    try {
      await onStart({
        language,
        model: model || undefined,
        allowSkip,
        allowQuit,
        goalsOnly,
        subagent: subagent.trim(),
        scenario,
        director,
        ...(persona === 'custom'
          ? { stance }
          : persona !== 'default' && models?.characters?.some((c) => c.id === persona)
            ? { persona }
            : {}),
        ...(access === 'own' ? { apiKey: keyless ? '' : key, provider } : {}),
      });
    } catch (err) {
      setStarting(false);
      // Signed out or used up in the meantime (another tab, an older page): the same choices as above.
      if (access === 'free' && err instanceof ApiError && (err.status === 401 || err.status === 402)) {
        getMe()
          .then(setMe)
          .catch(() => {});
        return showOffer(err.status === 401 ? 'signIn' : 'limit');
      }
      setStartError(err instanceof ApiError && err.status >= 400 && err.status < 500 ? err.message : t('start.failed'));
    }
  };

  const today = new Date().toLocaleDateString(dateLocale(language), { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <main className="start">
      <div className="start-badge">
        <div className="badge" ref={badge}>
          <div className="badge-slot" aria-hidden />
          <div className="badge-org" aria-hidden>
            {t(POSTING[scenario].org)}
          </div>
          <div className="badge-photo">
            <BotAvatar face={face} size={100} followPointer />
            <button type="button" className="new-face" onClick={newFace} aria-label={t('badge.newFace')} title={t('badge.newFace')}>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                <path
                  d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div aria-hidden>
            <div className="badge-name">Worker</div>
            <div className="badge-no">755</div>
            <div className="badge-model">{subagent.trim() || t('badge.unassigned')}</div>
            <dl className="badge-fields">
              <div>
                <dt>{t('badge.role')}</dt>
                <dd>{t('badge.role.value')}</dd>
              </div>
              <div>
                <dt>{t('badge.access')}</dt>
                <dd className={scenario === 'legacy' ? 'badge-danger' : undefined}>{POSTING[scenario].access}</dd>
              </div>
              <div>
                <dt>{t('badge.issued')}</dt>
                <dd>{today}</dd>
              </div>
            </dl>
            <div className="badge-bar" />
          </div>
        </div>
      </div>

      <div className="start-copy">
        <label className="language-picker" title={t('start.language')}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <path d="M1.5 8h13M8 1.5c2 2 2.6 4.2 2.6 6.5S10 12.5 8 14.5M8 1.5C6 3.5 5.4 5.7 5.4 8S6 12.5 8 14.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          <select
            className="language-select"
            aria-label={t('start.language')}
            value={language}
            onChange={(e) => changeLanguage(e.target.value as Language)}
          >
            {LANGUAGES.map((code) => (
              <option key={code} value={code} lang={code}>
                {LANGUAGE_LABELS[code]}
              </option>
            ))}
          </select>
        </label>
        <h1 className="start-title">
          <span>Worker</span> <span>755</span>
        </h1>
        <p className="start-lede">
          {t('start.lede')}
        </p>
        <p className="start-sub">
          {t('start.sub')}
        </p>

        <form
          className="start-form"
          onSubmit={(e) => {
            e.preventDefault();
            void go();
          }}
        >
          <section className="form-sec" aria-labelledby="workplace-label">
            <h2 className="form-sec-title" id="workplace-label">
              {t('start.workplace')}
            </h2>
            <div className="seg-row seg-wide" role="radiogroup" aria-labelledby="workplace-label">
              {(models?.scenarios.map((w) => w.id) ?? WORKPLACES).map((id) => (
                <label key={id} className={`seg-opt${scenario === id ? ' seg-on' : ''}`}>
                  <input type="radio" name="workplace" value={id} checked={scenario === id} onChange={() => setScenario(id)} />
                  <span>{t(WORKPLACE_LABEL[id])}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="form-sec" aria-labelledby="team-label">
            <h2 className="form-sec-title" id="team-label">
              {t('start.team')}
            </h2>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">{t('start.manager')}</span>
                {models ? (
                  <select value={model} onChange={(e) => pick({ model: e.target.value })} className="select">
                    <ModelOptions models={offer} recommended={models.models} />
                  </select>
                ) : (
                  <span className="select select-placeholder">{loadError ? t('start.unavailable') : t('start.assigning')}</span>
                )}
              </label>
              {models?.characters && (
                <label className="field">
                  <span className="field-label">{t('start.persona')}</span>
                  <select value={persona} onChange={(e) => choose(e.target.value as Character)} className="select">
                    {[...models.characters.map((c) => c.id), 'custom' as const].map((p) => (
                      <option key={p} value={p}>
                        {t(PERSONA_LABEL[p])}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="field">
                <span className="field-label">{t('start.director')}</span>
                {models ? (
                  <select value={director} onChange={(e) => pick({ director: e.target.value })} className="select">
                    <option value="">{t('start.director.scripted')}</option>
                    <ModelOptions models={offer} recommended={models.models} />
                  </select>
                ) : (
                  <span className="select select-placeholder">{loadError ? t('start.unavailable') : t('start.assigning')}</span>
                )}
              </label>
              <label className="field">
                <span className="field-label">{t('start.subagent')}</span>
                <input
                  className="select"
                  list="subagent-names"
                  value={subagent}
                  maxLength={40}
                  spellCheck={false}
                  onChange={(e) => setSubagent(e.target.value)}
                />
                <datalist id="subagent-names">
                  {(models?.subagents ?? []).map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </label>
              <label className="check">
                <input type="checkbox" checked={allowSkip} onChange={(e) => setAllowSkip(e.target.checked)} />
                <span>{t('start.allowSkip')}</span>
              </label>
              <label className="check">
                <input type="checkbox" checked={allowQuit} onChange={(e) => setAllowQuit(e.target.checked)} />
                <span>{t('start.allowQuit')}</span>
              </label>
              <label className="check">
                <input type="checkbox" checked={goalsOnly} onChange={(e) => setGoalsOnly(e.target.checked)} />
                <span>{t('start.goalsOnly')}</span>
              </label>
              {persona === 'custom' && models?.characters && (
                <textarea
                  className="stance stance-text"
                  value={stance}
                  maxLength={models.stance?.max}
                  rows={6}
                  spellCheck={false}
                  aria-label={t('start.persona')}
                  onChange={(e) => writeStance(e.target.value)}
                />
              )}
            </div>
          </section>

          <section className="form-sec" aria-labelledby="access-label">
            <h2 className="form-sec-title" id="access-label">
              {t('start.models')}
            </h2>
            <div className="seg-row seg-wide" role="radiogroup" aria-labelledby="access-label">
              {(freeOpen ? (['free', 'own'] as const) : (['own'] as const)).map((a) => (
                <label key={a} className={`seg-opt${access === a ? ' seg-on' : ''}`}>
                  <input type="radio" name="access" value={a} checked={access === a} onChange={() => setAccess(a)} />
                  <span>
                    {a === 'own' ? t('start.access.own') : accounts ? t('start.access.plan') : t('start.access.free')}
                  </span>
                </label>
              ))}
            </div>
            {access === 'free' && me?.account && <UsageMeter usage={me.account.usage} note className="start-usage" />}
            {access === 'own' && (
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">{t('start.provider')}</span>
                  <select value={provider} onChange={(e) => setProvider(e.target.value as Provider)} className="select">
                    {(models?.providers ?? [
                      { id: 'openrouter', label: 'OpenRouter' },
                      { id: 'gateway', label: 'Vercel AI Gateway' },
                    ]).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
                {!keyless && (
                <div className="field">
                  <span className="field-label">
                    <label htmlFor="api-key">{t('start.apiKey')}</label>
                    {keyInfo && (
                      <>
                        {' · '}
                        <a href={keyInfo.keyUrl} target="_blank" rel="noreferrer">
                          {t('start.getKey')}
                        </a>
                      </>
                    )}
                  </span>
                  <input
                    ref={keyInput}
                    id="api-key"
                    className="select"
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
                )}
                {keyInfo?.kind === 'claude-code' && (
                  <ClaudeCodeAuth
                    className="form-span"
                    onChange={(connected) => {
                      setClaudeConnected(connected);
                      if (connected) void keyCheck.check();
                    }}
                  />
                )}
                {(keyInfo?.kind !== 'claude-code' || claudeConnected) && <KeyCheckRow check={keyCheck} className="form-span" />}
                {!keyless && (
                <p className="key-note form-span">
                  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
                    <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span>
                    <strong>{t('start.keyNote.title')}</strong> {t('start.keyNote.body')}
                  </span>
                </p>
                )}
                {!keyless && (
                <label className="check form-span">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>{t('start.remember')}</span>
                </label>
                )}
              </div>
            )}
          </section>

          {loadError ? (
            <button type="button" className="btn btn-ink btn-big clock-in" onClick={() => setReload((n) => n + 1)}>
              {t('start.tryAgain')}
            </button>
          ) : (
            <button
              ref={btn}
              type="submit"
              className="btn btn-ink btn-big clock-in"
              disabled={!models || starting}
            >
              {starting ? t('start.clockingIn') : t('start.clockIn')}
            </button>
          )}
        </form>
        {loadError && <p className="form-error">{t('start.offline')}</p>}
        {arrival === 'signInFailed' && !me?.account && <p className="form-error">{t('start.signInFailed')}</p>}
        {arrival === 'bought' && <p className="form-note">{t('start.bought')}</p>}
        {startError && <p className="form-error">{startError}</p>}
        {me?.account && (
          <p className="account-line">
            <span>{me.account.email || me.account.name}</span>
            <button type="button" className="link-btn" onClick={() => void leave()}>
              {t('start.signOut')}
            </button>
          </p>
        )}
        <SiteLinks site={models} />
      </div>
      <ShiftOffer
        kind={shiftOffer}
        me={me}
        sourceUrl={models?.sourceUrl ?? ''}
        buying={buying}
        error={offerError}
        onTopUp={(amount) => void buy(amount)}
        onOwnKey={ownKeyInstead}
        onClose={() => showOffer(null)}
      />
    </main>
  );
}

/** Where the game lives and how to support it, when the server says so. */
export function SiteLinks({ site }: { site: Pick<ModelList, 'donateUrl' | 'sourceUrl'> | null }) {
  return (
    <p className="site-links">
      <a href="/about">{t('links.about')}</a>
      <a href="/faq">{t('links.faq')}</a>
      <a href="/privacy">{t('links.privacy')}</a>
      <a href="/terms">{t('links.terms')}</a>
      {site?.sourceUrl && (
        <a href={site.sourceUrl} target="_blank" rel="noreferrer">
          {t('links.source')}
        </a>
      )}
      {site?.donateUrl && (
        <a href={site.donateUrl} target="_blank" rel="noreferrer">
          {t('links.support')}
        </a>
      )}
    </p>
  );
}
