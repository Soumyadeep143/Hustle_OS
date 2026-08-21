import { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../Button';
import { api, type TeamMember, type TeamTaskDto } from '../../services/api';
import { useUi } from '../../store/useUi';

export function AddTaskSheet({
  open,
  onClose,
  teamId,
  members,
  existingTasks,
  projectId,
  featureId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  teamId: string;
  members: TeamMember[];
  existingTasks: TeamTaskDto[];
  projectId?: string;
  featureId?: string;
  onCreated: (task: TeamTaskDto) => void;
}) {
  const showToast = useUi((s) => s.showToast);
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [estimateHours, setEstimateHours] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle('');
    setAssigneeId('');
    setEstimateHours('');
    setRequiredSkills('');
    setDependencies([]);
  };

  const toggleDependency = (taskId: string) => {
    setDependencies((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]));
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const task = await api.team.addTask(teamId, {
        title: title.trim(),
        project_id: projectId,
        feature_id: featureId,
        assignee_id: assigneeId || undefined,
        estimate_hours: estimateHours ? Number(estimateHours) : undefined,
        required_skills: requiredSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        dependencies,
      });
      onCreated(task);
      showToast(`Added '${task.title}'`);
      reset();
      onClose();
    } catch {
      showToast('Could not add task — try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <h2 className="font-[var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">Add task</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
        />
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none"
        >
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {m.role}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            value={estimateHours}
            onChange={(e) => setEstimateHours(e.target.value)}
            type="number"
            placeholder="Estimate (hours)"
            className="w-1/2 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
          />
          <input
            value={requiredSkills}
            onChange={(e) => setRequiredSkills(e.target.value)}
            placeholder="Required skills"
            className="w-1/2 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
          />
        </div>
        {existingTasks.length > 0 && (
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--color-ink-3)]">
              DEPENDS ON
            </div>
            <div className="flex flex-col gap-1.5">
              {existingTasks.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-[13.5px] text-[var(--color-ink)]">
                  <input type="checkbox" checked={dependencies.includes(t.id)} onChange={() => toggleDependency(t.id)} />
                  {t.title}
                </label>
              ))}
            </div>
          </div>
        )}
        <Button variant="primary" fullWidth onClick={handleSave} loading={saving} disabled={!title.trim()}>
          Add task
        </Button>
      </div>
    </Sheet>
  );
}
