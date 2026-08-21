import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api, type TeamStateResponse } from '../../services/api';
import { AgentStepList, Chip, MemberWorkloadRow, ProgressBar, SectionLabel, StatCell, type AgentStepStatus } from '../../components/ui';
import { Button } from '../../components/Button';
import { AddMemberSheet } from '../../components/sheets/AddMemberSheet';
import { AddTaskSheet } from '../../components/sheets/AddTaskSheet';
import { AddProjectSheet } from '../../components/sheets/AddProjectSheet';
import { useUi } from '../../store/useUi';

const RISK_TONE: Record<string, 'red' | 'blue' | 'yellow'> = { high: 'red', medium: 'yellow', low: 'blue', unknown: 'blue' };
const RISK_LABEL: Record<string, string> = { high: 'AT RISK', medium: 'AT RISK', low: 'ON TRACK', unknown: 'NO DEADLINE' };

const EXECUTE_STEPS = [
  { key: 'validate', label: 'Validate' },
  { key: 'action', label: 'Apply action' },
  { key: 'signals', label: 'Recompute' },
];

const TEAM_ID = 'default';

export function TeamOverview() {
  const navigate = useNavigate();
  const showToast = useUi((s) => s.showToast);
  const [state, setState] = useState<TeamStateResponse | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [steps, setSteps] = useState<Record<string, { status: AgentStepStatus; detail?: string }>>({});

  const load = () => {
    api.team.getState(TEAM_ID).then(setState);
  };

  useEffect(() => {
    load();
  }, []);

  if (!state) {
    return (
      <div className="px-5 pt-6">
        <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-line-2)]" />
      </div>
    );
  }

  const totalCapacity = state.members.reduce((sum, m) => sum + m.capacity_hours, 0);
  const totalAssigned = state.members.reduce((sum, m) => sum + m.assigned_hours, 0);
  const capacityPercent = totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;
  const activeTasks = state.tasks.filter((t) => t.status !== 'done').length;
  const blockedTasks = state.tasks.filter((t) => t.is_blocked);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.team.generateRecommendation(TEAM_ID);
      load();
    } catch {
      showToast('Could not generate a recommendation — try again');
    } finally {
      setGenerating(false);
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    setSteps({});
    try {
      await api.team.executeRecommendation(TEAM_ID, (event) => {
        if (event.agent === 'result') {
          setState(event.team);
          showToast('Action applied · team state updated');
          return;
        }
        setSteps((prev) => ({ ...prev, [event.agent]: { status: event.status, detail: event.detail } }));
      });
    } catch {
      showToast('Could not execute — try again');
      setExecuting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 truncate font-[var(--font-display)] text-[27px] font-semibold text-[var(--color-ink)]">
          {state.team_name}
        </h1>
        <button
          onClick={() => setShowAddMember(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-2)]"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCell value={`${capacityPercent}%`} label="Team capacity" />
        <StatCell value={state.members.length} label="Members" />
        <StatCell value={activeTasks} label="Active tasks" />
        <StatCell value={blockedTasks.length} label="Blocked" tone={blockedTasks.length > 0 ? 'red' : 'neutral'} />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>MEMBER AVAILABILITY</SectionLabel>
          <button onClick={() => setShowAddMember(true)} className="text-[12.5px] font-medium text-[var(--color-blue)]">
            + Add
          </button>
        </div>
        <div className="flex flex-col">
          {state.members.map((m) => (
            <MemberWorkloadRow key={m.id} member={m} />
          ))}
          {state.members.length === 0 && <p className="py-3 text-[13px] text-[var(--color-ink-2)]">No members yet.</p>}
        </div>
      </div>

      {blockedTasks.length > 0 && (
        <div>
          <SectionLabel>BLOCKERS</SectionLabel>
          <div className="mt-3 flex flex-col gap-2">
            {blockedTasks.map((t) => (
              <div key={t.id} className="rounded-[var(--radius-control)] p-3" style={{ background: 'var(--color-red-soft)' }}>
                <span className="text-[13.5px] font-medium text-[var(--color-ink)]">{t.title}</span>
                {t.downstream_impact.length > 0 && (
                  <p className="mt-0.5 text-[12px] text-[var(--color-ink-2)]">
                    Blocking {t.downstream_impact.length} downstream task{t.downstream_impact.length === 1 ? '' : 's'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>PROJECT DELIVERY</SectionLabel>
          <button onClick={() => setShowAddProject(true)} className="text-[12.5px] font-medium text-[var(--color-blue)]">
            + Add
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {state.projects.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/team/projects/${p.id}`)}
              className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-3.5 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-[var(--color-ink)]">{p.name}</span>
                <span className="shrink-0">
                  <Chip tone={RISK_TONE[p.risk_level]}>{RISK_LABEL[p.risk_level]}</Chip>
                </span>
              </div>
              <p className="mt-1 text-[12px] text-[var(--color-ink-2)]">{p.basis}</p>
              <div className="mt-2">
                <ProgressBar percent={p.percent} tone={RISK_TONE[p.risk_level]} />
              </div>
            </button>
          ))}
          {state.projects.length === 0 && <p className="py-3 text-[13px] text-[var(--color-ink-2)]">No projects yet.</p>}
        </div>
      </div>

      <div
        className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <span className="text-[11px] font-semibold tracking-[.18em] text-[var(--color-blue)]">✦ AI RECOMMENDATION</span>

        {!state.current_recommendation && !executing && (
          <div className="mt-3">
            <Button variant="outline" onClick={handleGenerate} loading={generating}>
              Analyze team & recommend
            </Button>
          </div>
        )}

        {state.current_recommendation && !executing && (
          <>
            <p className="mt-2 font-[var(--font-display)] text-[16.5px] font-medium leading-snug text-[var(--color-ink)]">
              {state.current_recommendation.summary}
            </p>
            <div
              className="mt-3 rounded-[var(--radius-control)] p-3 text-[13px] leading-relaxed text-[var(--color-ink-2)]"
              style={{ background: 'var(--color-yellow-soft)' }}
            >
              <span className="mr-1 font-semibold text-[var(--color-yellow)]">WHY</span>
              {state.current_recommendation.reason}
            </div>
            {state.current_recommendation.action_type === 'no_action' ? (
              <p className="mt-3 text-[13px] text-[var(--color-ink-2)]">Nothing to approve right now.</p>
            ) : (
              <div className="mt-4 flex gap-2">
                <Button variant="primary" className="flex-1" onClick={handleExecute}>
                  Approve & Execute
                </Button>
              </div>
            )}
          </>
        )}

        {executing && (
          <div className="mt-4">
            <AgentStepList steps={EXECUTE_STEPS} state={steps} />
          </div>
        )}
      </div>

      <button
        onClick={() => setShowAddTask(true)}
        className="flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-line)] py-3 text-[13.5px] font-semibold text-[var(--color-blue)]"
      >
        <Plus size={15} /> Add task
      </button>

      <AddMemberSheet
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        teamId={TEAM_ID}
        onCreated={() => load()}
      />
      <AddTaskSheet
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        teamId={TEAM_ID}
        members={state.members}
        existingTasks={state.tasks}
        onCreated={() => load()}
      />
      <AddProjectSheet
        open={showAddProject}
        onClose={() => setShowAddProject(false)}
        teamId={TEAM_ID}
        onCreated={() => load()}
      />
    </div>
  );
}
