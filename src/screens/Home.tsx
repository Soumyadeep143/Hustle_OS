import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, type DashboardResponse, type MemoryResponse, type OrgHealthResponse, type TeamSprintResponse } from '../services/api';
import { briefFromDashboard, timelineFromDashboard } from '../lib/adapters';
import { useUi } from '../store/useUi';
import { SectionLabel, TimelineRow, TaskRow, ProgressBar, Chip } from '../components/ui';

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${part}, ${name}.`;
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
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [memory, setMemory] = useState<MemoryResponse | null>(null);
  const tasks = useUi((s) => s.tasks);
  const toggleTask = useUi((s) => s.toggleTask);

  useEffect(() => {
    Promise.all([api.dashboard.get(), api.memory.get()]).then(([d, m]) => {
      setDashboard(d);
      setMemory(m);
    });
  }, []);

  const brief = dashboard ? briefFromDashboard(dashboard) : null;
  const timeline = dashboard && memory ? timelineFromDashboard(dashboard, memory) : [];
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <>
      <div>
        <h1 className="font-[var(--font-display)] text-[30px] font-semibold leading-[1.1] tracking-[-.028em] text-[var(--color-ink)]">
          {memory ? greeting(memory.user_profile.name.split(' ')[0]) : 'Good day.'}
        </h1>
        <p className="mt-1 text-[15px] text-[var(--color-ink-2)]">Here's what matters today.</p>
      </div>

      {brief && (
        <div
          className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-[.18em] text-[var(--color-blue)]">✦ AI BRIEF</span>
            <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-3)]">now</span>
          </div>
          <p className="mt-3 font-[var(--font-display)] text-[15.5px] leading-[1.5] text-[var(--color-ink)]">
            You have <span className="font-semibold">{brief.headline}</span> today
            {brief.followupsDue > 0 ? `, including ${brief.followupsDue} follow-up${brief.followupsDue === 1 ? '' : 's'} due.` : '.'}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--color-line-2)] pt-3">
            <button onClick={() => navigate('/ai')} className="text-[13px] font-semibold text-[var(--color-blue)]">
              View plan →
            </button>
            <button onClick={() => navigate('/ai')} className="text-[13px] text-[var(--color-ink-2)]">
              Ask
            </button>
          </div>
        </div>
      )}

      {timeline.length > 0 && (
        <div>
          <SectionLabel>TODAY</SectionLabel>
          <div className="mt-3 flex flex-col">
            {timeline.map((item, i) => (
              <TimelineRow key={i} {...item} />
            ))}
          </div>
        </div>
      )}

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

      {memory && memory.insights.length > 0 && (
        <div>
          <SectionLabel>SIGNALS</SectionLabel>
          <div className="mt-3 flex flex-col gap-2">
            {memory.insights.slice(0, 2).map((insight, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-[var(--radius-control)] p-3 text-[13.5px] leading-relaxed"
                style={{ background: 'var(--color-yellow-soft)' }}
              >
                <span className="mt-0.5 text-[var(--color-yellow-ink)]">✦</span>
                <span className="flex-1 text-[var(--color-ink)]">{insight}</span>
                <Chip tone="yellow">{i === 0 ? 'OPPORTUNITY' : 'RECOMMENDATION'}</Chip>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function HomeTeam() {
  const [sprint, setSprint] = useState<TeamSprintResponse | null>(null);
  const STATUS_TONE = { Blocked: 'var(--color-red)', Available: 'var(--color-blue)', Busy: 'var(--color-ink-3)' } as const;

  useEffect(() => {
    api.workspace.getSprint().then(setSprint);
  }, []);

  if (!sprint) {
    return <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-line-2)]" />;
  }

  return (
    <>
      <div>
        <h1 className="font-[var(--font-display)] text-[24px] font-semibold text-[var(--color-ink)]">{sprint.name}</h1>
        <div className="mt-3 flex items-end justify-between">
          <span className="font-[var(--font-display)] text-[46px] font-semibold leading-none tracking-[-.03em] text-[var(--color-ink)]">
            {sprint.percent}%
          </span>
          <span className="pb-1 text-right text-[13px] text-[var(--color-ink-2)]">
            complete
            <br />
            {sprint.done} of {sprint.total} tasks
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar percent={sprint.percent} height={4} />
        </div>
      </div>

      {sprint.blocked.length > 0 && (
        <div className="rounded-[var(--radius-card)] p-4" style={{ background: 'var(--color-red-soft)' }}>
          <div className="flex items-center gap-2">
            <span className="font-[var(--font-display)] text-[22px] font-semibold text-[var(--color-red)]">
              {sprint.blocked.length}
            </span>
            <Chip tone="red">BLOCKED</Chip>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {sprint.blocked.map((b) => (
              <p key={b.task} className="text-[13.5px] text-[var(--color-ink)]">
                {b.task} <span className="text-[var(--color-ink-2)]">· {b.owner}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionLabel>TEAM AVAILABILITY</SectionLabel>
        <div className="mt-3 flex flex-col">
          {sprint.members.map((m) => (
            <div key={m.name} className="flex items-center gap-3 border-b border-[var(--color-line-2)] py-3 last:border-b-0">
              <div
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] text-[12px] font-semibold text-white"
                style={{ background: 'var(--color-ink-3)' }}
              >
                {m.name.split(' ').map((p) => p[0]).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px] font-medium text-[var(--color-ink)]">{m.name}</div>
                <div className="truncate text-[12.5px] text-[var(--color-ink-2)]">{m.role}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_TONE[m.status] }} />
                <span className="text-[12px] text-[var(--color-ink-2)]">{m.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <span className="text-[11px] font-semibold tracking-[.18em] text-[var(--color-blue)]">✦ AI RECOMMENDATION</span>
        <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--color-ink)]">{sprint.recommendation.text}</p>
        <div className="mt-3 flex gap-2">
          <button className="flex-1 rounded-[var(--radius-control)] px-4 py-2 text-[13px] font-semibold text-white" style={{ background: 'var(--color-blue)' }}>
            Review
          </button>
          <button className="rounded-[var(--radius-control)] border border-[var(--color-blue)] px-4 py-2 text-[13px] font-semibold text-[var(--color-blue)]">
            Later
          </button>
        </div>
      </div>
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
