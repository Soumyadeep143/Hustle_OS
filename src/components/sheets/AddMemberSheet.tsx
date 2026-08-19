import { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../Button';
import { api, type TeamMember } from '../../services/api';
import { useUi } from '../../store/useUi';

export function AddMemberSheet({
  open,
  onClose,
  teamId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  teamId: string;
  onCreated: (member: TeamMember) => void;
}) {
  const showToast = useUi((s) => s.showToast);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [skills, setSkills] = useState('');
  const [capacity, setCapacity] = useState('40');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setRole('');
    setSkills('');
    setCapacity('40');
  };

  const handleSave = async () => {
    if (!name.trim() || !role.trim()) return;
    setSaving(true);
    try {
      const member = await api.team.addMember(teamId, {
        name: name.trim(),
        role: role.trim(),
        skills: skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        capacity_hours_per_week: Number(capacity) || 40,
      });
      onCreated(member);
      showToast(`Added ${member.name} to the team`);
      reset();
      onClose();
    } catch {
      showToast('Could not add member — try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <h2 className="font-[var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">Add team member</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role (e.g. Backend, Frontend)"
          className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
        />
        <input
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="Skills, comma separated (e.g. backend, ai)"
          className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
        />
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[var(--color-ink-2)]">Capacity (hours/week)</span>
          <input
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            type="number"
            className="w-20 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-2 py-1.5 text-[14px] text-[var(--color-ink)] outline-none"
          />
        </div>
        <Button variant="primary" fullWidth onClick={handleSave} loading={saving} disabled={!name.trim() || !role.trim()}>
          Add member
        </Button>
      </div>
    </Sheet>
  );
}
