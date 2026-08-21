import { useEffect, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../Button';
import { api, type RecallItem } from '../../services/api';
import { useUi } from '../../store/useUi';

const INPUT_CLASS =
  'w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]';

export function RecallFollowUpSheet({
  open,
  onClose,
  item,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  item: RecallItem | null;
  onSaved: (item: RecallItem) => void;
}) {
  const showToast = useUi((s) => s.showToast);
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setDate(item.follow_up_at || '');
    setNote(item.follow_up_note || '');
  }, [open, item]);

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const saved = await api.recall.setFollowUp(item.id, date || null, note.trim() || null);
      onSaved(saved);
      showToast(date ? 'Follow-up scheduled' : 'Follow-up cleared');
      onClose();
    } catch {
      showToast('Could not save — try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <h2 className="font-[var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">Follow-up</h2>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-ink-3)]">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT_CLASS} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-ink-3)]">Note</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Ask recruiter about interview timeline"
            className={INPUT_CLASS}
          />
        </label>
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1" onClick={handleSave} loading={saving}>
            {date ? 'Save follow-up' : 'Clear follow-up'}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
