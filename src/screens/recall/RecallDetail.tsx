import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { api, type RecallItem } from '../../services/api';
import { Chip, SectionLabel } from '../../components/ui';
import { Button } from '../../components/Button';
import { SourceIcon } from '../../components/icons/SourceIcon';
import { RecallEditSheet } from '../../components/sheets/RecallEditSheet';
import { RecallFollowUpSheet } from '../../components/sheets/RecallFollowUpSheet';
import { useUi } from '../../store/useUi';
import { STATUS_CHIP, PRIORITY_LABEL, followUpLabel, relativeDay } from '../../lib/recall';

export function RecallDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const showToast = useUi((s) => s.showToast);

  const [item, setItem] = useState<RecallItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.recall.get(id).then(setItem).catch(() => setError('Could not load this item'));
  }, [id]);

  const handleMarkApplied = async () => {
    if (!item) return;
    setBusy(true);
    try {
      const updated = await api.recall.markApplied(item.id);
      setItem(updated);
      showToast('Marked as applied · Application created in Work');
    } catch {
      showToast('Could not mark as applied — try again');
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!item) return;
    setBusy(true);
    try {
      const updated = await api.recall.archive(item.id);
      setItem(updated);
      showToast('Archived');
    } catch {
      showToast('Could not archive — try again');
    } finally {
      setBusy(false);
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

  if (!item) {
    return (
      <div className="flex flex-col gap-3 px-5 pt-6">
        <BackLink onClick={() => navigate('/recall')} />
        <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-line-2)]" />
      </div>
    );
  }

  const statusChip = STATUS_CHIP[item.status];
  const priority = item.priority ? PRIORITY_LABEL[item.priority] : null;
  const followUp = item.follow_up_at ? followUpLabel(item.follow_up_at) : null;
  const details = [
    item.company && { label: 'Company', value: item.company },
    item.person && { label: 'Person', value: item.person },
    item.location && { label: 'Location', value: item.location },
    item.event_date && { label: 'Date', value: item.event_date },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-4">
      <BackLink onClick={() => navigate('/recall')} />

      <div>
        <div className="flex items-center gap-2">
          <SourceIcon source={item.source} size={20} />
          <span className="text-[11px] font-semibold tracking-[.18em] text-[var(--color-ink-3)]">
            {item.source_display.toUpperCase()} · {item.category.toUpperCase()}
          </span>
        </div>
        <h1 className="mt-2 font-[var(--font-display)] text-[24px] font-semibold leading-tight text-[var(--color-ink)]">
          {item.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Chip tone={statusChip.tone}>{statusChip.label}</Chip>
          {priority && <Chip tone={priority.tone}>{priority.label} PRIORITY</Chip>}
        </div>
      </div>

      {item.description && (
        <div>
          <SectionLabel>DESCRIPTION</SectionLabel>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--color-ink)]">{item.description}</p>
        </div>
      )}

      {item.ai_summary && item.ai_summary !== item.description && (
        <div>
          <SectionLabel>AI SUMMARY</SectionLabel>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--color-ink-2)]">{item.ai_summary}</p>
        </div>
      )}

      {details.length > 0 && (
        <div>
          <SectionLabel>DETAILS</SectionLabel>
          <div className="mt-2 flex flex-col divide-y divide-[var(--color-line-2)]">
            {details.map((d) => (
              <div key={d.label} className="flex items-center justify-between py-2 text-[13.5px]">
                <span className="text-[var(--color-ink-3)]">{d.label}</span>
                <span className="text-[var(--color-ink)]">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {item.notes && (
        <div>
          <SectionLabel>NOTES</SectionLabel>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--color-ink)]">{item.notes}</p>
        </div>
      )}

      <div
        className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <span className="text-[11px] font-semibold tracking-[.18em] text-[var(--color-blue)]">✦ FOLLOW-UP</span>
        {followUp ? (
          <>
            <p
              className="mt-2 font-[var(--font-display)] text-[16.5px] font-medium"
              style={{ color: followUp.overdue ? 'var(--color-red)' : 'var(--color-ink)' }}
            >
              {followUp.text}
            </p>
            {item.follow_up_note && (
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--color-ink-2)]">{item.follow_up_note}</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-[13.5px] text-[var(--color-ink-2)]">Not scheduled.</p>
        )}
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setFollowUpOpen(true)}>
          {followUp ? 'Edit follow-up' : 'Add follow-up'}
        </Button>
      </div>

      {item.timeline.length > 0 && (
        <div>
          <SectionLabel>TIMELINE</SectionLabel>
          <div className="mt-3 flex flex-col gap-4">
            {item.timeline.map((t) => (
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

      <div className="flex flex-col gap-2 pt-2">
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          {!item.related_application_id && item.status !== 'archived' && (
            <Button variant="outline" className="flex-1" onClick={handleMarkApplied} loading={busy}>
              Mark Applied
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {item.url && (
            <Button
              variant="outline"
              className="flex-1"
              icon={<ExternalLink size={15} />}
              onClick={() => window.open(item.url!, '_blank', 'noopener,noreferrer')}
            >
              Open Source
            </Button>
          )}
          {item.status !== 'archived' && (
            <Button variant="danger" className="flex-1" onClick={handleArchive} loading={busy}>
              Archive
            </Button>
          )}
        </div>
      </div>

      <RecallEditSheet open={editOpen} onClose={() => setEditOpen(false)} item={item} onSaved={setItem} />
      <RecallFollowUpSheet open={followUpOpen} onClose={() => setFollowUpOpen(false)} item={item} onSaved={setItem} />
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
