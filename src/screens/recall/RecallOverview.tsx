import { useEffect, useState } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, type RecallDashboardResponse, type RecallItem } from '../../services/api';
import { SectionLabel, StatCell, Chip } from '../../components/ui';
import { SourceIcon } from '../../components/icons/SourceIcon';
import { useUi } from '../../store/useUi';
import { STATUS_CHIP, PRIORITY_LABEL, followUpLabel } from '../../lib/recall';

export function RecallOverview() {
  const navigate = useNavigate();
  const openRecallCapture = useUi((s) => s.openRecallCapture);
  const recallCaptureOpen = useUi((s) => s.recallCaptureOpen);
  const [summary, setSummary] = useState<RecallDashboardResponse | null>(null);
  const [items, setItems] = useState<RecallItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = () => {
    Promise.all([api.recall.getDashboard(), api.recall.list()])
      .then(([d, i]) => {
        setSummary(d);
        setItems(i.filter((it) => it.status !== 'archived'));
        setLoaded(true);
      })
      .catch(() => {
        setError('Could not load RECALL data');
        setLoaded(true);
      });
  };

  // Loads on mount, then refetches whenever the capture sheet (mounted
  // globally at AppShell level) closes, so a save from anywhere in the app
  // shows up here immediately.
  useEffect(() => {
    if (!recallCaptureOpen) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recallCaptureOpen]);

  const hasData = summary?.has_data && items.length > 0;

  return (
    <div className="flex flex-col gap-6 px-5 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold tracking-[.3em] text-[var(--color-blue)]">RECALL</span>
          <h1 className="mt-1 font-[var(--font-display)] text-[30px] font-semibold leading-[1.1] tracking-[-.028em] text-[var(--color-ink)]">
            Your intelligence
            <br />
            layer
          </h1>
        </div>
        <button
          onClick={() => openRecallCapture()}
          aria-label="Capture something"
          className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white active:scale-95"
          style={{ background: 'var(--color-blue)' }}
        >
          <Plus size={20} />
        </button>
      </div>

      {error && <div className="text-[13px] text-[var(--color-red)]">{error}</div>}

      {!loaded && <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-line-2)]" />}

      {loaded && !hasData && !error && (
        <div className="flex flex-col items-center gap-5 py-10 text-center">
          <p className="text-[15px] leading-relaxed text-[var(--color-ink)]">
            Nothing captured yet.
            <br />
            Found something useful? Drop the link here.
          </p>
          <div className="flex items-center gap-3">
            <SourceIcon source="linkedin" size={26} />
            <SourceIcon source="x" size={26} />
            <SourceIcon source="instagram" size={26} />
            <SourceIcon source="reddit" size={26} />
          </div>
          <p className="max-w-[280px] text-[13px] leading-relaxed text-[var(--color-ink-2)]">
            HustleOS will understand it, categorize it, remember it, track it, and remind you about it.
          </p>
          <button
            onClick={() => openRecallCapture()}
            className="rounded-[var(--radius-control)] px-5 py-2.5 text-[13.5px] font-semibold text-white active:scale-[.97]"
            style={{ background: 'var(--color-blue)' }}
          >
            Capture something
          </button>
        </div>
      )}

      {hasData && summary && (
        <>
          <div className="grid grid-cols-2 gap-y-5 border-y border-[var(--color-line)] py-5">
            <StatCell value={summary.saved} label="saved" />
            <StatCell value={summary.applications} label="applications" tone="blue" />
            <StatCell value={summary.follow_ups} label="follow-ups" tone="yellow" />
            <StatCell value={summary.opportunities} label="opportunities" tone="red" />
            {summary.interviews > 0 && <StatCell value={summary.interviews} label="interviews" tone="blue" />}
          </div>

          <div>
            <SectionLabel>CAPTURED</SectionLabel>
            <div className="mt-3 flex flex-col">
              {items.map((item) => {
                const chip = STATUS_CHIP[item.status];
                const priority = item.priority ? PRIORITY_LABEL[item.priority] : null;
                const followUp = item.follow_up_at ? followUpLabel(item.follow_up_at) : null;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/recall/${item.id}`)}
                    className="flex items-start gap-3 border-b border-[var(--color-line-2)] py-3.5 text-left last:border-b-0 active:scale-[.985] transition-transform"
                  >
                    <SourceIcon source={item.source} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-[var(--font-display)] text-[15.5px] font-semibold text-[var(--color-ink)]">
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="mt-0.5 line-clamp-1 text-[13px] text-[var(--color-ink-2)]">{item.description}</div>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Chip tone="neutral">{item.category.toUpperCase()}</Chip>
                        <Chip tone={chip.tone}>{chip.label}</Chip>
                        {priority && <Chip tone={priority.tone}>{priority.label}</Chip>}
                        {followUp && (
                          <span
                            className="text-[11px] font-medium"
                            style={{ color: followUp.overdue ? 'var(--color-red)' : 'var(--color-ink-3)' }}
                          >
                            Follow up: {followUp.text}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="mt-1 shrink-0 text-[var(--color-ink-3)]" />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
