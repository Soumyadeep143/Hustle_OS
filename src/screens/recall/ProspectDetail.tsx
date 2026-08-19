import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { api, type RecallProspect } from '../../services/api';
import { Chip, ProgressBar, SectionLabel } from '../../components/ui';
import { Button } from '../../components/Button';
import { useUi } from '../../store/useUi';
import type { Tone } from '../../lib/types';

const INTENT_CHIP: Record<string, { label: string; tone: Tone }> = {
  high: { label: 'HIGH INTENT', tone: 'blue' },
  medium: { label: 'WARM', tone: 'yellow' },
  low: { label: 'COOLING', tone: 'red' },
  unknown: { label: 'WARM', tone: 'yellow' },
};

const AGENT_STEPS = [
  { key: 'research', label: 'Research Agent', detail: 'context gathered' },
  { key: 'memory', label: 'Memory', detail: 'facts recalled' },
  { key: 'strategy', label: 'Strategy Agent', detail: 'action drafted' },
  { key: 'execution', label: 'Execution Agent', detail: 'sending' },
] as const;

function confidenceLabel(c: number | null | undefined): string {
  if (c == null) return 'Medium';
  if (c >= 0.8) return 'High';
  if (c >= 0.5) return 'Medium';
  return 'Low';
}

function relativeDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.round((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'TODAY';
  if (days === 1) return 'YESTERDAY';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
}

export function ProspectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const showToast = useUi((s) => s.showToast);

  const [prospect, setProspect] = useState<RecallProspect | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [agentStep, setAgentStep] = useState(-1);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.recall.getProspect(id).then(setProspect).catch(() => setError('Could not load this prospect'));
  }, [id]);

  const handleExecute = async () => {
    if (!id) return;
    setExecuting(true);
    setAgentStep(0);

    const stagePromise = new Promise<void>((resolve) => {
      let i = 0;
      const tick = () => {
        i += 1;
        setAgentStep(i);
        if (i < AGENT_STEPS.length - 1) window.setTimeout(tick, 700);
        else resolve();
      };
      window.setTimeout(tick, 700);
    });

    const [result] = await Promise.all([
      api.recall.approve(id).catch(() => null),
      stagePromise,
    ]);

    setAgentStep(AGENT_STEPS.length);
    setDone(true);
    if (result) {
      setProspect(result.prospect);
      showToast('Outreach sent · memory updated');
    } else {
      showToast('Could not execute — try again');
    }
  };

  if (error) {
    return (
      <div className="flex flex-col gap-3 px-5 pt-6">
        <BackLink onClick={() => navigate('/recall')} />
        <p className="text-[13px] text-[var(--color-red)]">{error}</p>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="flex flex-col gap-3 px-5 pt-6">
        <BackLink onClick={() => navigate('/recall')} />
        <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-line-2)]" />
      </div>
    );
  }

  const chip = INTENT_CHIP[prospect.intent] ?? INTENT_CHIP.unknown;

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-4">
      <BackLink onClick={() => navigate('/recall')} />

      <div>
        <h1 className="font-[var(--font-display)] text-[27px] font-semibold leading-tight text-[var(--color-ink)]">
          {prospect.name}
        </h1>
        {prospect.role && <p className="mt-0.5 text-[14px] text-[var(--color-ink-2)]">{prospect.role} · {prospect.company}</p>}
        <div className="mt-2">
          <Chip tone={chip.tone}>{chip.label}</Chip>
        </div>
      </div>

      <div className="border-t border-[var(--color-line)] pt-5">
        <div
          className="font-[var(--font-display)] font-semibold leading-none"
          style={{ fontSize: 54, color: `var(--color-${chip.tone === 'neutral' ? 'ink' : chip.tone})` }}
        >
          {prospect.lead_score}
        </div>
        <div className="mt-1 text-[13px] text-[var(--color-ink-2)]">lead score</div>
        <div className="mt-3">
          <ProgressBar percent={prospect.lead_score} height={4} />
        </div>
      </div>

      {prospect.next_best_action && (
        <div
          className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <span className="text-[11px] font-semibold tracking-[.18em] text-[var(--color-blue)]">
            ✦ NEXT BEST ACTION
          </span>
          <p className="mt-2 font-[var(--font-display)] text-[16.5px] font-medium leading-snug text-[var(--color-ink)]">
            {prospect.next_best_action.action}
          </p>
          <div
            className="mt-3 rounded-[var(--radius-control)] p-3 text-[13px] leading-relaxed text-[var(--color-ink-2)]"
            style={{ background: 'var(--color-yellow-soft)' }}
          >
            <span className="mr-1 font-semibold text-[var(--color-yellow)]">WHY</span>
            {prospect.next_best_action.reason}
          </div>

          {!executing ? (
            <div className="mt-4 flex gap-2">
              <Button variant="primary" className="flex-1" onClick={handleExecute}>
                Approve & Execute
              </Button>
              <Button variant="outline">Edit</Button>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {AGENT_STEPS.map((step, i) => (
                <div
                  key={step.key}
                  className={clsx('flex items-center justify-between text-[13.5px] transition-opacity', i > agentStep && 'opacity-32')}
                  style={{ opacity: i > agentStep ? 0.32 : 1 }}
                >
                  <div className="flex items-center gap-2.5">
                    {i < agentStep || (done && i <= agentStep) ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: 'var(--color-blue)' }}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                    ) : i === agentStep && !done ? (
                      <Loader2 size={18} className="animate-spin text-[var(--color-blue)]" />
                    ) : (
                      <span className="h-5 w-5 rounded-full border border-[var(--color-line)]" />
                    )}
                    <span className="text-[var(--color-ink)]">{step.label}</span>
                  </div>
                  {i <= agentStep && <span className="text-[var(--color-ink-3)]">{step.detail}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {prospect.memory.length > 0 && (
        <div>
          <SectionLabel>MEMORY</SectionLabel>
          <div className="mt-3 flex flex-col">
            {prospect.memory.map((m) => (
              <div key={m.id} className="border-b border-[var(--color-line-2)] py-3 last:border-b-0">
                <p className="text-[14.5px] leading-relaxed text-[var(--color-ink)]">{m.text}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[12px] text-[var(--color-ink-3)]">
                    {m.source_url ? new URL(m.source_url).hostname.replace(/^www\./, '') : 'HustleOS'} · {new Date(m.created_at).toLocaleDateString()}
                  </span>
                  <Chip tone="blue">{confidenceLabel(m.confidence)}</Chip>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {prospect.timeline.length > 0 && (
        <div>
          <SectionLabel>TIMELINE</SectionLabel>
          <div className="mt-3 flex flex-col gap-4">
            {prospect.timeline.map((t) => (
              <div key={t.id} className="grid grid-cols-[74px_1px_1fr] gap-x-[14px]">
                <div className="pt-0.5 text-right text-[10px] font-semibold uppercase tracking-[.1em] text-[var(--color-ink-3)]">
                  {relativeDay(t.created_at)}
                </div>
                <div className="relative flex justify-center">
                  <div className="w-px bg-[var(--color-line)]" />
                  <span className="absolute top-0.5 h-2 w-2 rounded-full bg-[var(--color-ink-3)] ring-[3px] ring-[var(--color-bg)]" />
                </div>
                <div className="pb-1 text-[14px] text-[var(--color-ink)]">
                  {t.label}
                  {t.detail && <span className="text-[var(--color-ink-2)]"> · {t.detail}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-[13px] font-medium text-[var(--color-blue)]">
      <ChevronLeft size={16} /> RECALL
    </button>
  );
}
