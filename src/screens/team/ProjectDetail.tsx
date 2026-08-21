import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { api, type ProjectDetailResponse } from '../../services/api';
import { Chip, ProgressBar, SectionLabel } from '../../components/ui';
import { AddFeatureSheet } from '../../components/sheets/AddFeatureSheet';

const RISK_TONE: Record<string, 'red' | 'blue' | 'yellow'> = { high: 'red', medium: 'yellow', low: 'blue', unknown: 'blue' };
const RISK_LABEL: Record<string, string> = { high: 'AT RISK', medium: 'AT RISK', low: 'ON TRACK', unknown: 'NO DEADLINE' };

const TEAM_ID = 'default';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddFeature, setShowAddFeature] = useState(false);

  const load = () => {
    if (!id) return;
    api.team.getProject(TEAM_ID, id).then(setProject).catch(() => setError('Could not load this project'));
  };

  useEffect(load, [id]);

  if (error) {
    return (
      <div className="flex flex-col gap-3 px-5 pt-6">
        <BackLink onClick={() => navigate('/team')} />
        <p className="text-[13px] text-[var(--color-red)]">{error}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col gap-3 px-5 pt-6">
        <BackLink onClick={() => navigate('/team')} />
        <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-line-2)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-4">
      <BackLink onClick={() => navigate('/team')} />

      <div>
        <div className="flex items-center justify-between gap-2">
          <h1 className="min-w-0 truncate font-[var(--font-display)] text-[24px] font-semibold text-[var(--color-ink)]">
            {project.name}
          </h1>
          <span className="shrink-0">
            <Chip tone={RISK_TONE[project.risk_level]}>{RISK_LABEL[project.risk_level]}</Chip>
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <span className="font-[var(--font-display)] text-[40px] font-semibold leading-none tracking-[-.03em] text-[var(--color-ink)]">
            {project.percent}%
          </span>
          <span className="pb-1 text-right text-[13px] text-[var(--color-ink-2)]">
            complete
            <br />
            {project.done} of {project.total} tasks
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar percent={project.percent} tone={RISK_TONE[project.risk_level]} height={4} />
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--color-ink-2)]">{project.basis}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-control)] border border-[var(--color-line)] p-3">
          <div className="font-[var(--font-display)] text-[20px] font-semibold text-[var(--color-ink)]">{project.at_risk_feature_count}</div>
          <div className="text-[12px] text-[var(--color-ink-2)]">Features at risk</div>
        </div>
        <div className="rounded-[var(--radius-control)] border border-[var(--color-line)] p-3">
          <div className="font-[var(--font-display)] text-[20px] font-semibold text-[var(--color-ink)]">{project.open_blockers}</div>
          <div className="text-[12px] text-[var(--color-ink-2)]">Open blockers</div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>FEATURES</SectionLabel>
          <button onClick={() => setShowAddFeature(true)} className="text-[12.5px] font-medium text-[var(--color-blue)]">
            + Add
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {project.features.map((f) => (
            <button
              key={f.id}
              onClick={() => navigate(`/team/features/${f.id}`)}
              className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-3.5 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-[var(--color-ink)]">{f.name}</span>
                <span className="shrink-0">
                  <Chip tone={RISK_TONE[f.risk_level]}>{RISK_LABEL[f.risk_level]}</Chip>
                </span>
              </div>
              <p className="mt-1 text-[12px] text-[var(--color-ink-2)]">
                {f.done} of {f.total} tasks{f.blocked_count > 0 ? ` · ${f.blocked_count} blocked` : ''}
              </p>
              <div className="mt-2">
                <ProgressBar percent={f.percent} tone={RISK_TONE[f.risk_level]} />
              </div>
            </button>
          ))}
          {project.features.length === 0 && <p className="py-3 text-[13px] text-[var(--color-ink-2)]">No features yet.</p>}
        </div>
      </div>

      <button
        onClick={() => setShowAddFeature(true)}
        className="flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-line)] py-3 text-[13.5px] font-semibold text-[var(--color-blue)]"
      >
        <Plus size={15} /> Add feature
      </button>

      <AddFeatureSheet
        open={showAddFeature}
        onClose={() => setShowAddFeature(false)}
        teamId={TEAM_ID}
        projectId={project.id}
        onCreated={() => load()}
      />
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-[13px] font-medium text-[var(--color-blue)]">
      <ChevronLeft size={16} /> TEAM
    </button>
  );
}
