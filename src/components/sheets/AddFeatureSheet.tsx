import { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../Button';
import { api, type TeamFeature } from '../../services/api';
import { useUi } from '../../store/useUi';

export function AddFeatureSheet({
  open,
  onClose,
  teamId,
  projectId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  teamId: string;
  projectId: string;
  onCreated: (feature: TeamFeature) => void;
}) {
  const showToast = useUi((s) => s.showToast);
  const [name, setName] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const feature = await api.team.addFeature(teamId, { project_id: projectId, name: name.trim(), due_at: dueAt || undefined });
      onCreated(feature);
      showToast(`Added feature '${feature.name}'`);
      setName('');
      setDueAt('');
      onClose();
    } catch {
      showToast('Could not add feature — try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <h2 className="font-[var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">Add feature</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Feature name"
          className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
        />
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[var(--color-ink-2)]">Due</span>
          <input
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            type="date"
            className="flex-1 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3 py-2 text-[14px] text-[var(--color-ink)] outline-none"
          />
        </div>
        <Button variant="primary" fullWidth onClick={handleSave} loading={saving} disabled={!name.trim()}>
          Add feature
        </Button>
      </div>
    </Sheet>
  );
}
