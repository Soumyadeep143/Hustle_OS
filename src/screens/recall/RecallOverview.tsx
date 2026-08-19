import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, type RecallDashboardResponse, type RecallProspectSummary } from '../../services/api';
import { SectionLabel, StatCell, Chip } from '../../components/ui';
import type { Tone } from '../../lib/types';

const INTENT_CHIP: Record<string, { label: string; tone: Tone }> = {
  high: { label: 'HIGH INTENT', tone: 'blue' },
  medium: { label: 'WARM', tone: 'yellow' },
  low: { label: 'COOLING', tone: 'red' },
  unknown: { label: 'WARM', tone: 'yellow' },
};

export function RecallOverview() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<RecallDashboardResponse | null>(null);
  const [prospects, setProspects] = useState<RecallProspectSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.recall.getDashboard(), api.recall.listProspects()])
      .then(([d, p]) => {
        setSummary(d);
        setProspects(p);
      })
      .catch(() => setError('Could not load RECALL data'));
  }, []);

  return (
    <div className="flex flex-col gap-6 px-5 pt-6">
      <div>
        <span className="text-[11px] font-semibold tracking-[.3em] text-[var(--color-blue)]">RECALL</span>
        <h1 className="mt-1 font-[var(--font-display)] text-[30px] font-semibold leading-[1.1] tracking-[-.028em] text-[var(--color-ink)]">
          Growth
          <br />
          intelligence
        </h1>
      </div>

      {error && <div className="text-[13px] text-[var(--color-red)]">{error}</div>}

      {summary && (
        <div className="grid grid-cols-2 gap-y-5 border-y border-[var(--color-line)] py-5">
          <StatCell value={summary.high_intent} label="high-intent" tone="blue" />
          <StatCell value={summary.followups_today} label="actions today" />
          <StatCell value={summary.total_prospects} label="prospects tracked" />
          <StatCell value={summary.insights.length} label="positive signals" tone="yellow" />
        </div>
      )}

      <div>
        <SectionLabel>PRIORITY QUEUE</SectionLabel>
        <div className="mt-3 flex flex-col">
          {prospects.length === 0 && !error && (
            <p className="py-4 text-[13px] text-[var(--color-ink-2)]">No prospects yet — capture one to get started.</p>
          )}
          {prospects.map((p) => {
            const chip = INTENT_CHIP[p.intent] ?? INTENT_CHIP.unknown;
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/recall/${p.id}`)}
                className="flex items-center justify-between gap-3 border-b border-[var(--color-line-2)] py-3.5 text-left last:border-b-0 active:scale-[.985] transition-transform"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-[var(--font-display)] text-[16px] font-semibold text-[var(--color-ink)]">
                    {p.name}
                  </div>
                  <div className="truncate text-[13px] text-[var(--color-ink-2)]">
                    {p.role ? `${p.role} · ${p.company}` : p.company}
                  </div>
                  <div className="mt-1.5">
                    <Chip tone={chip.tone}>{chip.label}</Chip>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <div className="font-[var(--font-display)] text-[27px] font-semibold leading-none" style={{ color: `var(--color-${chip.tone === 'neutral' ? 'ink' : chip.tone})` }}>
                      {p.lead_score}
                    </div>
                    <div className="mt-1 text-[9px] font-semibold uppercase tracking-[.13em] text-[var(--color-ink-3)]">
                      SCORE
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-[var(--color-ink-3)]" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
