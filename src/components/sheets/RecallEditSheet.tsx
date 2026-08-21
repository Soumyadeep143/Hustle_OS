import { useEffect, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Button } from '../Button';
import { api, type RecallItem, type RecallPriority, type RecallSource, type RecallStatus } from '../../services/api';
import { useUi } from '../../store/useUi';
import { RECALL_CATEGORIES, RECALL_STATUSES } from '../../lib/recall';

const SOURCES: { value: RecallSource; label: string }[] = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES: { value: string; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const INPUT_CLASS =
  'w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]';

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/^#/, '');
}

export function RecallEditSheet({
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState<RecallSource>('other');
  const [category, setCategory] = useState('Other');
  const [status, setStatus] = useState<RecallStatus>('saved');
  const [priority, setPriority] = useState('');
  const [company, setCompany] = useState('');
  const [person, setPerson] = useState('');
  const [location, setLocation] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const addTag = (raw: string) => {
    const tag = normalizeTag(raw);
    if (!tag) return;
    setTags((t) => (t.includes(tag) ? t : [...t, tag]));
    setTagInput('');
  };
  const removeTag = (tag: string) => setTags((t) => t.filter((x) => x !== tag));

  useEffect(() => {
    if (!open || !item) return;
    setTitle(item.title);
    setDescription(item.description);
    setNotes(item.notes);
    setSource(item.source);
    setCategory(item.category);
    setStatus(item.status);
    setPriority(item.priority || '');
    setCompany(item.company || '');
    setPerson(item.person || '');
    setLocation(item.location || '');
    setUrl(item.url || '');
    setTags(item.tags || []);
    setTagInput('');
  }, [open, item]);

  const handleSave = async () => {
    if (!item || !title.trim()) return;
    setSaving(true);
    try {
      const saved = await api.recall.update(item.id, {
        title: title.trim(),
        description,
        notes,
        source,
        category,
        status,
        priority: (priority || null) as RecallPriority | null,
        company: company.trim() || null,
        person: person.trim() || null,
        location: location.trim() || null,
        url: url.trim() || null,
        tags,
      });
      onSaved(saved);
      showToast('Updated');
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
        <h2 className="font-[var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">Edit item</h2>

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={INPUT_CLASS} />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Description"
          className={INPUT_CLASS + ' resize-none'}
        />

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-ink-3)]">Source</span>
            <select value={source} onChange={(e) => setSource(e.target.value as RecallSource)} className={INPUT_CLASS}>
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-ink-3)]">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT_CLASS}>
              {RECALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-ink-3)]">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as RecallStatus)} className={INPUT_CLASS}>
            {RECALL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-ink-3)]">Priority</span>
          <SegmentedControl options={PRIORITIES} value={priority} onChange={setPriority} />
        </div>

        <div>
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-ink-3)]">Tags</span>
          {tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                  className="group flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium"
                  style={{ background: 'var(--color-blue-soft)', color: 'var(--color-blue)' }}
                >
                  #{tag}
                  <span className="text-[13px] leading-none opacity-60 group-hover:opacity-100">×</span>
                </button>
              ))}
            </div>
          )}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag(tagInput);
              } else if (e.key === 'Backspace' && !tagInput && tags.length) {
                removeTag(tags[tags.length - 1]);
              }
            }}
            onBlur={() => tagInput.trim() && addTag(tagInput)}
            placeholder="Add a tag and press Enter…"
            className={INPUT_CLASS}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className={INPUT_CLASS} />
          <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Person" className={INPUT_CLASS} />
        </div>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className={INPUT_CLASS} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" className={INPUT_CLASS} />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Notes"
          className={INPUT_CLASS + ' resize-none'}
        />

        <Button variant="primary" onClick={handleSave} loading={saving} disabled={!title.trim()}>
          Save changes
        </Button>
      </div>
    </Sheet>
  );
}
