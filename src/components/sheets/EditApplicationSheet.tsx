import { useEffect, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Button } from '../Button';
import { api, type Application } from '../../services/api';
import { useUi } from '../../store/useUi';

const INPUT_CLASS =
  'rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]';

const STATUSES: { value: string; label: string }[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'interview', label: 'Interview' },
];

export function EditApplicationSheet({
  open,
  onClose,
  application,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  application: Application | null;
  onSaved: (application: Application) => void;
  onDeleted: (id: string) => void;
}) {
  const showToast = useUi((s) => s.showToast);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('applied');
  const [matchScore, setMatchScore] = useState('0');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCompany(application?.company ?? '');
    setRole(application?.role ?? '');
    setStatus(application?.status ?? 'applied');
    setMatchScore(String(application?.match_score ?? 0));
    setDescription(application?.description ?? '');
    setNotes(application?.notes ?? '');
  }, [open, application]);

  const handleSave = async () => {
    if (!company.trim() || !role.trim()) return;
    setSaving(true);
    try {
      const payload = {
        company: company.trim(),
        role: role.trim(),
        status,
        match_score: Number(matchScore) || 0,
        description: description.trim(),
        notes: notes.trim(),
      };
      const saved = application
        ? await api.memory.updateApplication(application.id, payload)
        : await api.memory.addApplication(payload);
      onSaved(saved);
      showToast(application ? 'Updated' : 'Application added');
      onClose();
    } catch {
      showToast('Could not save — try again');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!application) return;
    setDeleting(true);
    try {
      await api.memory.deleteApplication(application.id);
      onDeleted(application.id);
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
          {application ? 'Edit application' : 'Add application'}
        </h2>
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className={INPUT_CLASS} />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" className={INPUT_CLASS} />
        <SegmentedControl options={STATUSES} value={status} onChange={setStatus} />
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[var(--color-ink-2)]">Match score</span>
          <input
            value={matchScore}
            onChange={(e) => setMatchScore(e.target.value)}
            type="number"
            min={0}
            max={100}
            className="w-20 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-2 py-1.5 text-[14px] text-[var(--color-ink)] outline-none"
          />
        </div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className={INPUT_CLASS}
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className={INPUT_CLASS}
        />
        <div className="flex gap-2 pt-1">
          <Button variant="primary" className="flex-1" onClick={handleSave} loading={saving} disabled={!company.trim() || !role.trim()}>
            Save
          </Button>
          {application && (
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
