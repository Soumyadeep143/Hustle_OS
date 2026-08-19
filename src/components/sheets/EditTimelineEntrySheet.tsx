import { useEffect, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Button } from '../Button';
import { api, type TimelineEntry } from '../../services/api';
import { useUi } from '../../store/useUi';

const TONES: { value: 'neutral' | 'blue' | 'red'; label: string }[] = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'blue', label: 'Priority' },
  { value: 'red', label: 'Overdue' },
];

export function EditTimelineEntrySheet({
  open,
  onClose,
  entry,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  entry: TimelineEntry | null;
  onSaved: (entry: TimelineEntry) => void;
  onDeleted: (id: string) => void;
}) {
  const showToast = useUi((s) => s.showToast);
  const [title, setTitle] = useState('');
  const [at, setAt] = useState('Today');
  const [subtitle, setSubtitle] = useState('');
  const [tone, setTone] = useState<'neutral' | 'blue' | 'red'>('neutral');
  const [flag, setFlag] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(entry?.title ?? '');
    setAt(entry?.at ?? 'Today');
    setSubtitle(entry?.subtitle ?? '');
    setTone(entry?.tone ?? 'neutral');
    setFlag(entry?.flag ?? '');
  }, [open, entry]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        at: at.trim() || 'Today',
        subtitle: subtitle.trim() || undefined,
        tone,
        flag: flag.trim() || undefined,
      };
      const saved = entry ? await api.home.updateTimelineEntry(entry.id, payload) : await api.home.addTimelineEntry(payload);
      onSaved(saved);
      showToast(entry ? 'Updated' : 'Added to today');
      onClose();
    } catch {
      showToast('Could not save — try again');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    setDeleting(true);
    try {
      await api.home.deleteTimelineEntry(entry.id);
      onDeleted(entry.id);
      showToast('Removed');
      onClose();
    } catch {
      showToast('Could not delete — try again');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <h2 className="font-[var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">
          {entry ? 'Edit entry' : 'Add to today'}
        </h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
        />
        <div className="flex gap-2">
          <input
            value={at}
            onChange={(e) => setAt(e.target.value)}
            placeholder="When (Now, +1h, Today)"
            className="flex-1 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
          />
          <input
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
            placeholder="Flag (optional)"
            className="flex-1 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
          />
        </div>
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Subtitle (optional)"
          className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
        />
        <SegmentedControl options={TONES} value={tone} onChange={setTone} />
        <div className="flex gap-2 pt-1">
          <Button variant="primary" className="flex-1" onClick={handleSave} loading={saving} disabled={!title.trim()}>
            Save
          </Button>
          {entry && (
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
