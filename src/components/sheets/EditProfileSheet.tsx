import { useEffect, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../Button';
import { api, type UserProfile } from '../../services/api';
import { useUi } from '../../store/useUi';

const INPUT_CLASS =
  'rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]';

export function EditProfileSheet({
  open,
  onClose,
  profile,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onSaved: (profile: UserProfile) => void;
}) {
  const showToast = useUi((s) => s.showToast);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [targetLocation, setTargetLocation] = useState('');
  const [skills, setSkills] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(profile?.name ?? '');
    setEmail(profile?.email ?? '');
    setTargetRole(profile?.target_role ?? '');
    setTargetLocation(profile?.target_location ?? '');
    setSkills((profile?.skills ?? []).join(', '));
    setBio(profile?.bio ?? '');
  }, [open, profile]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const updated = await api.memory.updateProfile({
        name: name.trim(),
        email: email.trim(),
        target_role: targetRole.trim(),
        target_location: targetLocation.trim(),
        skills: skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        bio: bio.trim() || null,
      });
      onSaved(updated);
      showToast('Profile updated');
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
        <h2 className="font-[var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">Edit profile</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={INPUT_CLASS} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={INPUT_CLASS} />
        <div className="flex gap-2">
          <input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="Target role"
            className={`flex-1 ${INPUT_CLASS}`}
          />
          <input
            value={targetLocation}
            onChange={(e) => setTargetLocation(e.target.value)}
            placeholder="Location"
            className={`flex-1 ${INPUT_CLASS}`}
          />
        </div>
        <input
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="Skills, comma separated"
          className={INPUT_CLASS}
        />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Bio (optional)"
          rows={2}
          className={`resize-none ${INPUT_CLASS}`}
        />
        <Button variant="primary" fullWidth onClick={handleSave} loading={saving} disabled={!name.trim()}>
          Save
        </Button>
      </div>
    </Sheet>
  );
}
