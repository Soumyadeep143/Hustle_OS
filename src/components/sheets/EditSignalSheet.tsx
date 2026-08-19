import { useEffect, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Button } from '../Button';
import { api, type Signal } from '../../services/api';
import { useUi } from '../../store/useUi';

const TAGS: { value: 'OPPORTUNITY' | 'RECOMMENDATION'; label: string }[] = [
  { value: 'OPPORTUNITY', label: 'Opportunity' },
  { value: 'RECOMMENDATION', label: 'Recommendation' },
];

export function EditSignalSheet({
  open,
  onClose,
  signal,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  signal: Signal | null;
  onSaved: (signal: Signal) => void;
  onDeleted: (id: string) => void;
}) {
  const showToast = useUi((s) => s.showToast);
  const [text, setText] = useState('');
  const [tag, setTag] = useState<'OPPORTUNITY' | 'RECOMMENDATION'>('RECOMMENDATION');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText(signal?.text ?? '');
    setTag((signal?.tag as 'OPPORTUNITY' | 'RECOMMENDATION') ?? 'RECOMMENDATION');
  }, [open, signal]);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const payload = { text: text.trim(), tag, tone: 'yellow' };
      const saved = signal ? await api.home.updateSignal(signal.id, payload) : await api.home.addSignal(payload);
      onSaved(saved);
      showToast(signal ? 'Updated' : 'Signal added');
      onClose();
    } catch {
      showToast('Could not save — try again');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!signal) return;
    setDeleting(true);
    try {
      await api.home.deleteSignal(signal.id);
      onDeleted(signal.id);
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
          {signal ? 'Edit signal' : 'Add signal'}
        </h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What should HustleOS surface?"
          rows={3}
          className="resize-none rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
        />
        <SegmentedControl options={TAGS} value={tag} onChange={setTag} />
        <div className="flex gap-2 pt-1">
          <Button variant="primary" className="flex-1" onClick={handleSave} loading={saving} disabled={!text.trim()}>
            Save
          </Button>
          {signal && (
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
