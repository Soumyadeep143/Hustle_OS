import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Sheet } from '../ui/Sheet';
import { Button } from '../Button';
import { api, type ItemType, type Priority, type TimelineEntry } from '../../services/api';
import { useUi } from '../../store/useUi';
import {
  ITEM_TYPE_META,
  ITEM_TYPE_ORDER,
  PRIORITY_META,
  PRIORITY_ORDER,
  REMINDER_OPTIONS,
  browserTimezone,
} from '../../lib/scheduling';

function PillGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; emoji: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={clsx(
            'rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-colors',
            value === opt.value
              ? 'border-[var(--color-blue)] bg-[var(--color-blue-soft)] text-[var(--color-blue)]'
              : 'border-[var(--color-line)] text-[var(--color-ink-2)]'
          )}
        >
          {opt.emoji} {opt.label}
        </button>
      ))}
    </div>
  );
}

const inputClass =
  'rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]';

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

  const [quickText, setQuickText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [ambiguityNote, setAmbiguityNote] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [itemType, setItemType] = useState<ItemType>('task');
  const [priority, setPriority] = useState<Priority>('none');
  const [scheduledDate, setScheduledDate] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuickText('');
    setAmbiguityNote(null);
    setTitle(entry?.title ?? '');
    setNotes(entry?.notes ?? '');
    setItemType(entry?.item_type ?? 'task');
    setPriority(entry?.priority ?? 'none');
    setScheduledDate(entry?.scheduled_date ?? '');
    setAllDay(entry?.all_day ?? false);
    setStartTime(entry?.start_time ?? '');
    setEndTime(entry?.end_time ?? '');
    setReminderMinutesBefore(entry?.reminder_minutes_before ?? null);
  }, [open, entry]);

  const handleQuickParse = async () => {
    if (!quickText.trim()) return;
    setParsing(true);
    setAmbiguityNote(null);
    try {
      const draft = await api.schedule.parse(quickText.trim(), browserTimezone());
      setTitle(draft.title);
      setItemType(draft.item_type);
      setPriority(draft.priority);
      setScheduledDate(draft.date ?? '');
      setAllDay(draft.all_day);
      setStartTime(draft.start_time ?? '');
      setEndTime(draft.end_time ?? '');
      if (draft.ambiguous) {
        setAmbiguityNote(
          draft.ambiguity_reason === 'time_unspecified'
            ? "Couldn't tell the exact time — check it below before saving."
            : 'Not sure about AM/PM — double check the time below before saving.'
        );
      }
    } catch {
      showToast("Couldn't parse that — fill in the details below.");
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        notes: notes.trim() || undefined,
        item_type: itemType,
        priority,
        scheduled_date: scheduledDate || null,
        all_day: allDay,
        start_time: allDay ? null : startTime || null,
        end_time: allDay ? null : endTime || null,
        reminder_minutes_before: reminderMinutesBefore,
        timezone: browserTimezone(),
        clear_scheduled_date: !scheduledDate,
        clear_start_time: allDay || !startTime,
        clear_end_time: allDay || !endTime,
      };
      const saved = entry
        ? await api.home.updateTimelineEntry(entry.id, payload)
        : await api.home.addTimelineEntry({ ...payload, original_phrase: quickText.trim() || undefined });
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

  const handleSyncCalendar = async () => {
    if (!entry) return;
    setSyncing(true);
    try {
      const result = await api.schedule.syncCalendar(entry.id);
      showToast(result.message);
      if (result.synced) {
        onSaved({ ...entry, calendar_target: 'google', calendar_synced_at: new Date().toISOString() });
      }
    } catch {
      showToast("Couldn't sync to Google Calendar — try again");
    } finally {
      setSyncing(false);
    }
  };

  const alreadySynced = Boolean(entry?.calendar_synced_at);

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <h2 className="font-[var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">
          {entry ? 'Edit entry' : 'Add to today'}
        </h2>

        {!entry && (
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <input
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickParse();
                  }
                }}
                placeholder="Try: interview tomorrow 3pm"
                className={clsx(inputClass, 'flex-1')}
              />
              <Button variant="secondary" size="md" onClick={handleQuickParse} loading={parsing} disabled={!quickText.trim()}>
                Parse
              </Button>
            </div>
            <p className="text-[11.5px] text-[var(--color-ink-3)]">
              Type it naturally, or fill in the fields below yourself.
            </p>
          </div>
        )}

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className={inputClass}
        />

        {ambiguityNote && (
          <p className="rounded-[var(--radius-control)] bg-[var(--color-yellow-soft)] px-3 py-2 text-[12.5px] text-[var(--color-ink)]">
            ⚠️ {ambiguityNote}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[.1em] text-[var(--color-ink-3)]">Type</span>
          <PillGroup
            value={itemType}
            onChange={setItemType}
            options={ITEM_TYPE_ORDER.map((t) => ({ value: t, label: ITEM_TYPE_META[t].label, emoji: ITEM_TYPE_META[t].emoji }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[.1em] text-[var(--color-ink-3)]">Priority</span>
          <PillGroup
            value={priority}
            onChange={setPriority}
            options={PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_META[p].label, emoji: PRIORITY_META[p].emoji }))}
          />
        </div>

        <div className="flex gap-2">
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className={clsx(inputClass, 'flex-1')}
          />
          <label className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-[var(--color-ink-2)]">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            All day
          </label>
        </div>

        {!allDay && (
          <div className="flex gap-2">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={clsx(inputClass, 'flex-1')}
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={clsx(inputClass, 'flex-1')}
            />
          </div>
        )}

        <select
          value={reminderMinutesBefore ?? ''}
          onChange={(e) => setReminderMinutesBefore(e.target.value === '' ? null : Number(e.target.value))}
          className={inputClass}
        >
          {REMINDER_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value ?? ''}>
              {opt.label}
            </option>
          ))}
        </select>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Notes (optional)"
          className={clsx(inputClass, 'resize-none')}
        />

        {entry && scheduledDate && (
          <Button
            variant={alreadySynced ? 'secondary' : 'outline'}
            onClick={handleSyncCalendar}
            loading={syncing}
          >
            {alreadySynced ? 'Synced to Google Calendar ✓ — sync again' : 'Sync to Google Calendar'}
          </Button>
        )}

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
