import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { api, type FeatureDetailResponse, type TeamMember } from '../../services/api';
import { Chip, ProgressBar, SectionLabel, TeamTaskRow } from '../../components/ui';
import { AddTaskSheet } from '../../components/sheets/AddTaskSheet';

const RISK_TONE: Record<string, 'red' | 'blue' | 'yellow'> = { high: 'red', medium: 'yellow', low: 'blue', unknown: 'blue' };
const RISK_LABEL: Record<string, string> = { high: 'AT RISK', medium: 'AT RISK', low: 'ON TRACK', unknown: 'NO DEADLINE' };

const TEAM_ID = 'default';

export function FeatureDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [feature, setFeature] = useState<FeatureDetailResponse | null>(null);
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);

  const load = () => {
    if (!id) return;
    api.team.getFeature(TEAM_ID, id).then(setFeature).catch(() => setError('Could not load this feature'));
    api.team.getState(TEAM_ID).then((state) => setAllMembers(state.members));
  };

  useEffect(load, [id]);

  if (error) {
    return (
      <div className="flex flex-col gap-3 px-5 pt-6">
        <BackLink onClick={() => navigate(-1)} />
        <p className="text-[13px] text-[var(--color-red)]">{error}</p>
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="flex flex-col gap-3 px-5 pt-6">
        <BackLink onClick={() => navigate(-1)} />
        <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-line-2)]" />
      </div>
    );
  }

  const memberName = (id?: string | null) => feature.responsible_members.find((m) => m.id === id)?.name;

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-4">
      <BackLink onClick={() => navigate(`/team/projects/${feature.project_id}`)} />

      <div>
        <div className="flex items-center justify-between gap-2">
          <h1 className="min-w-0 truncate font-[var(--font-display)] text-[24px] font-semibold text-[var(--color-ink)]">
            {feature.name}
          </h1>
          <span className="shrink-0">
            <Chip tone={RISK_TONE[feature.risk_level]}>{RISK_LABEL[feature.risk_level]}</Chip>
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <span className="font-[var(--font-display)] text-[40px] font-semibold leading-none tracking-[-.03em] text-[var(--color-ink)]">
            {feature.percent}%
          </span>
          <span className="pb-1 text-right text-[13px] text-[var(--color-ink-2)]">
            complete
            <br />
            {feature.done} of {feature.total} tasks
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar percent={feature.percent} tone={RISK_TONE[feature.risk_level]} height={4} />
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--color-ink-2)]">{feature.basis}</p>
      </div>

      {feature.blocking_task_details.length > 0 && (
        <div>
          <SectionLabel>BLOCKING TASKS</SectionLabel>
          <div className="mt-3 flex flex-col">
            {feature.blocking_task_details.map((t) => (
              <TeamTaskRow key={t.id} task={t} assigneeName={memberName(t.assignee_id)} />
            ))}
          </div>
        </div>
      )}

      {feature.responsible_members.length > 0 && (
        <div>
          <SectionLabel>RESPONSIBLE MEMBERS</SectionLabel>
          <div className="mt-3 flex flex-col gap-1.5">
            {feature.responsible_members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 text-[13.5px] text-[var(--color-ink)]">
                <span className="min-w-0 truncate">
                  {m.name} <span className="text-[var(--color-ink-2)]">· {m.role}</span>
                </span>
                <span className="shrink-0 text-[12px] text-[var(--color-ink-2)]">{m.remaining_capacity}h free</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowAddTask(true)}
        className="flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-line)] py-3 text-[13.5px] font-semibold text-[var(--color-blue)]"
      >
        <Plus size={15} /> Add task
      </button>

      <AddTaskSheet
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        teamId={TEAM_ID}
        members={allMembers}
        existingTasks={feature.blocking_task_details}
        projectId={feature.project_id}
        featureId={feature.id}
        onCreated={() => load()}
      />
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-[13px] font-medium text-[var(--color-blue)]">
      <ChevronLeft size={16} /> PROJECT
    </button>
  );
}
