import { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../Button';
import { api, type TeamProject } from '../../services/api';
import { useUi } from '../../store/useUi';

export function AddProjectSheet({
  open,
  onClose,
  teamId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  teamId: string;
  onCreated: (project: TeamProject) => void;
}) {
  const showToast = useUi((s) => s.showToast);
  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const project = await api.team.addProject(teamId, { name: name.trim(), target_date: targetDate || undefined });
      onCreated(project);
      showToast(`Added project '${project.name}'`);
      setName('');
      setTargetDate('');
      onClose();
    } catch {
      showToast('Could not add project — try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <h2 className="font-[var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">Add project</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
        />
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[var(--color-ink-2)]">Target date</span>
          <input
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            type="date"
            className="flex-1 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3 py-2 text-[14px] text-[var(--color-ink)] outline-none"
          />
        </div>
        <Button variant="primary" fullWidth onClick={handleSave} loading={saving} disabled={!name.trim()}>
          Add project
        </Button>
      </div>
    </Sheet>
  );
}
