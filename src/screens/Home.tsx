import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  api,
  type Brief,
  type MemoryResponse,
  type OrgHealthResponse,
  type Signal,
  type TeamStateResponse,
  type TimelineEntry,
} from '../services/api';
import { useUi } from '../store/useUi';
import { localIsoDate } from '../lib/scheduling';
import { SectionLabel, TimelineRow, TaskRow, ProgressBar, Chip, StatCell } from '../components/ui';
import { Button } from '../components/Button';
import { EditTimelineEntrySheet } from '../components/sheets/EditTimelineEntrySheet';
import { EditSignalSheet } from '../components/sheets/EditSignalSheet';

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ── Time-of-day config — full 24-hour cycle ────────────────────────────
const TIME_CONFIG = {
  midnight: {
    word: 'midnight',
    cssClass: 'greeting-time--midnight',
  },
  dawn: {
    word: 'dawn',
    cssClass: 'greeting-time--dawn',
  },
  morning: {
    word: 'morning',
    cssClass: 'greeting-time--morning',
  },
  midday: {
    word: 'midday',
    cssClass: 'greeting-time--midday',
  },
  afternoon: {
    word: 'afternoon',
    cssClass: 'greeting-time--afternoon',
  },
  dusk: {
    word: 'dusk',
    cssClass: 'greeting-time--dusk',
  },
  evening: {
    word: 'evening',
    cssClass: 'greeting-time--evening',
  },
  night: {
    word: 'night',
    cssClass: 'greeting-time--night',
  },
} as const;

type TimePeriod = keyof typeof TIME_CONFIG;

function getTimePeriod(): TimePeriod {
  const h = new Date().getHours();
  if (h >= 0  && h < 4)  return 'midnight';
  if (h >= 4  && h < 6)  return 'dawn';
  if (h >= 6  && h < 11) return 'morning';
  if (h >= 11 && h < 13) return 'midday';
  if (h >= 13 && h < 17) return 'afternoon';
  if (h >= 17 && h < 19) return 'dusk';
  if (h >= 19 && h < 22) return 'evening';
  return 'night'; // 22–24
}

// ── Typewriter component ────────────────────────────────────────────────
function TypingText({
  text,
  delay = 0,
  speed = 68,
  className = '',
  onDone,
}: {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  onDone?: () => void;
}) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    indexRef.current = 0;
    setDisplayed('');
    setDone(false);

    const tick = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(tick);
        setDone(true);
        onDoneRef.current?.();
      }
    }, speed);

    return () => clearInterval(tick);
  }, [text, started, speed]);

  return (
    <span className={className || undefined}>
      {displayed}
      {!done && <span className="typing-cursor" aria-hidden="true">|</span>}
    </span>
  );
}

// ── Animated subtitle — word by word ───────────────────────────────────
const SUBTITLE_WORDS = ["Here's", 'what', 'matters', 'today.'];

function AnimatedSubtitle() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    // stagger each word in after the greeting finishes (~1.6s total for typing)
    SUBTITLE_WORDS.forEach((_, i) => {
      setTimeout(() => setVisible(i + 1), 1600 + i * 110);
    });
  }, []);

  return (
    <p className="greeting-sub mt-1 text-[15px]">
      {SUBTITLE_WORDS.map((word, i) => (
        <span
          key={word}
          className={`greeting-sub-word${visible > i ? ' visible' : ''}`}
        >
          {word}
          {i < SUBTITLE_WORDS.length - 1 ? '\u00a0' : ''}
        </span>
      ))}
    </p>
  );
}

export function Home() {
  const workspace = useUi((s) => s.workspace);
  const openSheet = useUi((s) => s.openSheet);
  const now = useClock();

  return (
    <div className="flex flex-col gap-6 px-5 pt-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => openSheet('workspace')}
          className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[.16em] text-[var(--color-ink-2)]"
        >
          {workspace.toUpperCase()} <ChevronDown size={13} />
        </button>
        <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-3)]">
          {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>

      {workspace === 'Personal' && <HomePersonal />}
      {workspace === 'Team' && <HomeTeam />}
      {workspace === 'Enterprise' && <HomeEnterprise />}
    </div>
  );
}

function HomePersonal() {
  const navigate = useNavigate();
  const showToast = useUi((s) => s.showToast);
  const [memory, setMemory] = useState<MemoryResponse | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const tasks = useUi((s) => s.tasks);
  const toggleTask = useUi((s) => s.toggleTask);

  const [editingBrief, setEditingBrief] = useState(false);
  const [briefDraft, setBriefDraft] = useState('');
  const [savingBrief, setSavingBrief] = useState(false);

  // undefined = sheet closed, null = create mode, entry = edit mode
  const [timelineSheetEntry, setTimelineSheetEntry] = useState<TimelineEntry | null | undefined>(undefined);
  const [signalSheetItem, setSignalSheetItem] = useState<Signal | null | undefined>(undefined);

  useEffect(() => {
    api.memory.get().then(setMemory);
    api.home.getBrief().then(setBrief);
    api.home.getTimeline(localIsoDate()).then(setTimeline);
    api.home.getSignals().then(setSignals);
  }, []);

  const doneCount = tasks.filter((t) => t.done).length;

  const startEditBrief = () => {
    setBriefDraft(brief?.headline ?? '');
    setEditingBrief(true);
  };

  const saveBrief = async () => {
    setSavingBrief(true);
    try {
      const updated = await api.home.updateBrief(briefDraft.trim() || 'Nothing urgent right now');
      setBrief(updated);
      setEditingBrief(false);
    } catch {
      showToast('Could not save — try again');
    } finally {
      setSavingBrief(false);
    }
  };

  const upsert = <T extends { id: string }>(list: T[], item: T): T[] =>
    list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

  const timePeriod = getTimePeriod();
  const timeConf = TIME_CONFIG[timePeriod];
  // word lengths → stagger delays
  // "Good " = 5 chars × 72ms ≈ 360ms  → time word starts at 380ms
  // time word length × 72ms           → name starts after that
  const timeWordDelay = 380;
  const nameDelay = timeWordDelay + timeConf.word.length * 72 + 80;

  return (
    <>
      <div className="greeting-block">
        <h1 className="greeting-heading font-[var(--font-display)] text-[30px] font-semibold leading-[1.1] tracking-[-.028em] text-[var(--color-ink)]">
          {memory ? (
            <>
              {/* word 1 — "Good " */}
              <TypingText
                text="Good "
                delay={0}
                speed={72}
                className="greeting-word greeting-good"
              />
              {/* word 2 — "evening" / "morning" / "afternoon" */}
              <TypingText
                text={timeConf.word}
                delay={timeWordDelay}
                speed={72}
                className={`greeting-word greeting-time ${timeConf.cssClass}`}
              />
              {/* comma + space rendered immediately after time word is done via CSS opacity */}
              <span className="greeting-comma">,{'\u00a0'}</span>
              {/* word 3 — first name */}
              <TypingText
                text={memory.user_profile.name.split(' ')[0]}
                delay={nameDelay}
                speed={68}
                className="greeting-word greeting-name"
              />
              <span className="greeting-period">.</span>
            </>
          ) : (
            <span className="greeting-placeholder">Good day.</span>
          )}
        </h1>
        <AnimatedSubtitle />
      </div>

      <div
        className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-[.18em] text-[var(--color-blue)]">✦ AI BRIEF</span>
          {!editingBrief && (
            <button onClick={startEditBrief} className="text-[11px] font-medium text-[var(--color-blue)]">
              Edit
            </button>
          )}
        </div>

        {editingBrief ? (
          <div className="mt-3 flex flex-col gap-2">
            <textarea
              value={briefDraft}
              onChange={(e) => setBriefDraft(e.target.value)}
              rows={2}
              className="resize-none rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3 py-2 text-[14px] text-[var(--color-ink)] outline-none"
            />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={saveBrief} loading={savingBrief}>
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditingBrief(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 font-[var(--font-display)] text-[15.5px] leading-[1.5] text-[var(--color-ink)]">
              {brief?.headline ?? 'Loading…'}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-[var(--color-line-2)] pt-3">
              <button onClick={() => navigate('/ai')} className="text-[13px] font-semibold text-[var(--color-blue)]">
                View plan →
              </button>
              <button onClick={() => navigate('/ai')} className="text-[13px] text-[var(--color-ink-2)]">
                Ask
              </button>
            </div>
          </>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>TODAY</SectionLabel>
          <button
            onClick={() => setTimelineSheetEntry(null)}
            className="text-[12.5px] font-medium text-[var(--color-blue)]"
          >
            + Add
          </button>
        </div>
        <div className="mt-3 flex flex-col">
          {timeline.map((item) => (
            <button key={item.id} onClick={() => setTimelineSheetEntry(item)} className="text-left">
              <TimelineRow at={item.at} title={item.title} subtitle={item.subtitle ?? ''} tone={item.tone} flag={item.flag ?? undefined} />
            </button>
          ))}
          {timeline.length === 0 && <p className="py-3 text-[13px] text-[var(--color-ink-2)]">Nothing scheduled today.</p>}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>FOCUS</SectionLabel>
          <span className="text-[12px] text-[var(--color-ink-3)]">{doneCount} of {tasks.length} done</span>
        </div>
        <ProgressBar percent={tasks.length ? (doneCount / tasks.length) * 100 : 0} />
        <div className="mt-3 flex flex-col">
          {tasks.map((t) => (
            <TaskRow key={t.id} title={t.title} meta={t.meta} done={t.done} urgent={t.priority === 'high'} onToggle={() => toggleTask(t.id)} />
          ))}
          {tasks.length === 0 && <p className="py-3 text-[13px] text-[var(--color-ink-2)]">Nothing on your focus list yet.</p>}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>SIGNALS</SectionLabel>
          <button
            onClick={() => setSignalSheetItem(null)}
            className="text-[12.5px] font-medium text-[var(--color-blue)]"
          >
            + Add
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {signals.map((s) => (
            <button
              key={s.id}
              onClick={() => setSignalSheetItem(s)}
              className="flex items-start gap-2 rounded-[var(--radius-control)] p-3 text-left text-[13.5px] leading-relaxed"
              style={{ background: 'var(--color-yellow-soft)' }}
            >
              <span className="mt-0.5 text-[var(--color-yellow-ink)]">✦</span>
              <span className="flex-1 text-[var(--color-ink)]">{s.text}</span>
              <Chip tone="yellow">{s.tag}</Chip>
            </button>
          ))}
          {signals.length === 0 && <p className="py-3 text-[13px] text-[var(--color-ink-2)]">No signals right now.</p>}
        </div>
      </div>

      <EditTimelineEntrySheet
        open={timelineSheetEntry !== undefined}
        onClose={() => setTimelineSheetEntry(undefined)}
        entry={timelineSheetEntry ?? null}
        onSaved={(saved) => setTimeline((prev) => upsert(prev, saved))}
        onDeleted={(id) => setTimeline((prev) => prev.filter((e) => e.id !== id))}
      />
      <EditSignalSheet
        open={signalSheetItem !== undefined}
        onClose={() => setSignalSheetItem(undefined)}
        signal={signalSheetItem ?? null}
        onSaved={(saved) => setSignals((prev) => upsert(prev, saved))}
        onDeleted={(id) => setSignals((prev) => prev.filter((s) => s.id !== id))}
      />
    </>
  );
}

function HomeTeam() {
  const navigate = useNavigate();
  const [state, setState] = useState<TeamStateResponse | null>(null);

  useEffect(() => {
    api.team.getState('default').then(setState);
  }, []);

  if (!state) {
    return <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-line-2)]" />;
  }

  const totalCapacity = state.members.reduce((sum, m) => sum + m.capacity_hours, 0);
  const totalAssigned = state.members.reduce((sum, m) => sum + m.assigned_hours, 0);
  const capacityPercent = totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;
  const activeTasks = state.tasks.filter((t) => t.status !== 'done').length;
  const blockedTasks = state.tasks.filter((t) => t.is_blocked).length;
  const atRiskProjects = state.projects.filter((p) => p.risk_level === 'medium' || p.risk_level === 'high').length;
  const topBottleneck = state.bottlenecks[0];

  return (
    <>
      <div>
        <h1 className="font-[var(--font-display)] text-[24px] font-semibold text-[var(--color-ink)]">{state.team_name}</h1>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <StatCell value={`${capacityPercent}%`} label="Team capacity" />
          <StatCell value={state.members.length} label="Members" />
          <StatCell value={activeTasks} label="Active tasks" />
          <StatCell value={blockedTasks} label="Blocked" tone={blockedTasks > 0 ? 'red' : 'neutral'} />
          <StatCell value={atRiskProjects} label="At risk" tone={atRiskProjects > 0 ? 'yellow' : 'neutral'} />
        </div>
      </div>

      {topBottleneck && (
        <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-red-soft)' }}>
          <div className="flex items-center gap-2">
            <Chip tone="red">{topBottleneck.kind === 'overloaded' ? 'OVERLOADED' : 'BLOCKER'}</Chip>
          </div>
          <p className="mt-2 text-[13.5px] text-[var(--color-ink)]">
            <span className="font-medium">{topBottleneck.member_name}</span> — {topBottleneck.detail}
          </p>
        </div>
      )}

      {state.current_recommendation && (
        <div
          className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <span className="text-[11px] font-semibold tracking-[.18em] text-[var(--color-blue)]">✦ AI RECOMMENDATION</span>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--color-ink)]">{state.current_recommendation.summary}</p>
        </div>
      )}

      <button
        onClick={() => navigate('/team')}
        className="flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-line)] py-3 text-[13.5px] font-semibold text-[var(--color-blue)]"
      >
        View full team →
      </button>
    </>
  );
}

function HomeEnterprise() {
  const [org, setOrg] = useState<OrgHealthResponse | null>(null);

  useEffect(() => {
    api.workspace.getOrgHealth().then(setOrg);
  }, []);

  if (!org) {
    return <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-line-2)]" />;
  }

  return (
    <>
      <div>
        <h1 className="font-[var(--font-display)] text-[24px] font-semibold text-[var(--color-ink)]">Organization</h1>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="font-[var(--font-display)] text-[68px] font-semibold leading-none tracking-[-.05em] text-[var(--color-ink)]">
            {org.execution_health}%
          </span>
          <span className="text-[13px] font-medium text-[var(--color-blue)]">{org.delta}</span>
        </div>
        <p className="mt-1 text-[13px] text-[var(--color-ink-2)]">Execution health</p>
      </div>

      <div className="flex flex-col">
        {org.rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-[var(--color-line)] py-3.5 last:border-b-0">
            <span className="text-[15px] text-[var(--color-ink-2)]">{r.label}</span>
            <span
              className="font-[var(--font-display)] text-[24px] font-semibold"
              style={{ color: r.tone ? `var(--color-${r.tone})` : 'var(--color-ink)' }}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>

      <div
        className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <span className="text-[11px] font-semibold tracking-[.18em] text-[var(--color-blue)]">✦ AI INSIGHT</span>
        <div className="mt-2 flex flex-col gap-1.5">
          {org.insight_lines.map((l, i) => (
            <p
              key={i}
              className="text-[14.5px] leading-relaxed"
              style={{ color: l.tone ? `var(--color-${l.tone})` : 'var(--color-ink)' }}
            >
              {l.text}
            </p>
          ))}
        </div>
      </div>
    </>
  );
}
