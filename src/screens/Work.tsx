import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type MemoryResponse, type Application, type TeamProject } from '../services/api';
import { useUi } from '../store/useUi';
import { UnderlineTabs, TaskRow, ProgressBar, Chip } from '../components/ui';
import { EditApplicationSheet } from '../components/sheets/EditApplicationSheet';
import { NetworkTab } from './work/NetworkTab';
import { ReadinessTab } from './work/ReadinessTab';
import type { Tone } from '../lib/types';

const RISK_TONE: Record<string, 'red' | 'blue' | 'yellow'> = { high: 'red', medium: 'yellow', low: 'blue', unknown: 'blue' };

const STATUS_CHIP: Record<string, { label: string; tone: Tone }> = {
  interview: { label: 'INTERVIEW', tone: 'blue' },
  reviewing: { label: 'REVIEWING', tone: 'yellow' },
  applied: { label: 'APPLIED', tone: 'neutral' },
  captured: { label: 'CAPTURED', tone: 'yellow' },
};

function chipFor(app: Application): { label: string; tone: Tone } {
  if (app.status === 'applied' && app.last_followup) {
    const days = (Date.now() - new Date(app.last_followup).getTime()) / 86400000;
    if (days > 5) return { label: 'STALE', tone: 'red' };
  }
  return STATUS_CHIP[app.status] ?? { label: app.status.toUpperCase(), tone: 'neutral' };
}

export function Work() {
  const navigate = useNavigate();
  const workTab = useUi((s) => s.workTab);
  const setWorkTab = useUi((s) => s.setWorkTab);
  const tasks = useUi((s) => s.tasks);
  const toggleTask = useUi((s) => s.toggleTask);
  const [memory, setMemory] = useState<MemoryResponse | null>(null);
  const [projects, setProjects] = useState<TeamProject[]>([]);
  // undefined = sheet closed, null = create mode, application = edit mode
  const [applicationSheet, setApplicationSheet] = useState<Application | null | undefined>(undefined);

  useEffect(() => {
    api.memory.get().then(setMemory);
    api.team.getState('default').then((state) => setProjects(state.projects));
  }, []);

  const openTasks = tasks.filter((t) => !t.done).length;
  const appCount = memory?.applications.length ?? 0;

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <div>
        <h1 className="font-[var(--font-display)] text-[30px] font-semibold leading-[1.1] tracking-[-.028em] text-[var(--color-ink)]">
          Work
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-ink-2)]">
          {openTasks} open task{openTasks === 1 ? '' : 's'} · {appCount} application{appCount === 1 ? '' : 's'} · {projects.length} project{projects.length === 1 ? '' : 's'}
        </p>
      </div>

      <UnderlineTabs
        tabs={['Tasks', 'Applications', 'Projects', 'Network', 'Readiness'] as Array<typeof workTab>}
        value={workTab}
        onChange={setWorkTab}
      />

      {workTab === 'Tasks' && (
        <div className="flex flex-col">
          {tasks.map((t) => (
            <TaskRow key={t.id} title={t.title} meta={t.meta} done={t.done} urgent={t.priority === 'high'} onToggle={() => toggleTask(t.id)} />
          ))}
          {tasks.length === 0 && <p className="py-4 text-[13px] text-[var(--color-ink-2)]">No tasks yet.</p>}
        </div>
      )}

      {workTab === 'Applications' && (
        <div className="flex flex-col">
          <div className="flex justify-end pb-1">
            <button onClick={() => setApplicationSheet(null)} className="text-[12.5px] font-medium text-[var(--color-blue)]">
              + Add
            </button>
          </div>
          {memory?.applications.map((app) => {
            const chip = chipFor(app);
            return (
              <button
                key={app.id}
                onClick={() => setApplicationSheet(app)}
                className="flex items-center justify-between gap-3 border-b border-[var(--color-line-2)] py-3.5 text-left last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-[var(--font-display)] text-[17px] font-semibold text-[var(--color-ink)]">
                    {app.company}
                  </div>
                  <div className="truncate text-[13px] text-[var(--color-ink-2)]">{app.role}</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Chip tone={chip.tone}>{chip.label}</Chip>
                    {chip.label === 'STALE' && app.last_followup && (
                      <span className="text-[11px] text-[var(--color-ink-3)]">
                        No reply · {Math.round((Date.now() - new Date(app.last_followup).getTime()) / 86400000)} days
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 font-[var(--font-mono)] text-[12px] font-medium text-[var(--color-blue)]">
                  {app.match_score}%
                </span>
              </button>
            );
          })}
          {(!memory || memory.applications.length === 0) && (
            <p className="py-4 text-[13px] text-[var(--color-ink-2)]">No applications tracked yet.</p>
          )}
        </div>
      )}

      {workTab === 'Projects' && (
        <div className="flex flex-col gap-4">
          {projects.map((p) => (
            <button key={p.id} onClick={() => navigate(`/team/projects/${p.id}`)} className="text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-[15.5px] font-medium text-[var(--color-ink)]">{p.name}</span>
                <span className="shrink-0 font-[var(--font-mono)] text-[12px] text-[var(--color-ink-2)]">{p.percent}%</span>
              </div>
              <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-2)]">
                {p.done} of {p.total} tasks · {p.risk_level === 'unknown' ? 'no deadline' : `${p.risk_level} risk`}
              </p>
              <div className="mt-2">
                <ProgressBar percent={p.percent} tone={RISK_TONE[p.risk_level]} />
              </div>
            </button>
          ))}
          {projects.length === 0 && <p className="py-4 text-[13px] text-[var(--color-ink-2)]">No projects yet.</p>}
        </div>
      )}

      {workTab === 'Network' && <NetworkTab />}

      {workTab === 'Readiness' && <ReadinessTab />}

      <EditApplicationSheet
        open={applicationSheet !== undefined}
        onClose={() => setApplicationSheet(undefined)}
        application={applicationSheet ?? null}
        onSaved={(saved) =>
          setMemory((prev) => {
            if (!prev) return prev;
            const exists = prev.applications.some((a) => a.id === saved.id);
            return {
              ...prev,
              applications: exists
                ? prev.applications.map((a) => (a.id === saved.id ? saved : a))
                : [saved, ...prev.applications],
            };
          })
        }
        onDeleted={(id) =>
          setMemory((prev) => (prev ? { ...prev, applications: prev.applications.filter((a) => a.id !== id) } : prev))
        }
      />
    </div>
  );
}
