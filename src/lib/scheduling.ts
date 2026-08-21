import type { CalendarTarget, ItemType, Priority, TimelineEntry } from '../services/api';
import type { Tone } from './types';

// Single source of truth for priority display — never hardcode "Highest
// Priority" etc. elsewhere. One tone per level so the backend's derived
// `tone`/`flag` fields line up with what's rendered here.
export const PRIORITY_ORDER: Priority[] = ['highest', 'high', 'medium', 'low', 'none'];

export const PRIORITY_META: Record<Priority, { emoji: string; label: string; tone: Tone }> = {
  highest: { emoji: '🎯', label: 'Highest Priority', tone: 'blue' },
  high: { emoji: '🔴', label: 'High', tone: 'red' },
  medium: { emoji: '🟡', label: 'Medium', tone: 'yellow' },
  low: { emoji: '🟢', label: 'Low', tone: 'green' },
  none: { emoji: '⚪', label: 'No Priority', tone: 'neutral' },
};

export const ITEM_TYPE_ORDER: ItemType[] = ['task', 'event', 'interview', 'follow_up', 'reminder', 'deadline'];

export const ITEM_TYPE_META: Record<ItemType, { emoji: string; label: string }> = {
  task: { emoji: '📌', label: 'Task' },
  event: { emoji: '💻', label: 'Event' },
  interview: { emoji: '🎤', label: 'Interview' },
  follow_up: { emoji: '🚩', label: 'Follow-up' },
  reminder: { emoji: '⏰', label: 'Reminder' },
  deadline: { emoji: '📅', label: 'Deadline' },
};

export const CALENDAR_TARGET_META: Record<CalendarTarget, string> = {
  none: 'None',
  google: 'Google Calendar',
};

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'None' },
  { value: 0, label: 'At the time' },
  { value: 10, label: '10 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function localIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  const period = h < 12 ? 'AM' : 'PM';
  const displayHour = h % 12 || 12;
  return `${displayHour}:${String(m).padStart(2, '0')} ${period}`;
}

/** Relative day label for a scheduled_date against "today" — "Today" /
 * "Tomorrow" / a short date — used by the Quick Edit sheet and the
 * confirmation card, never hardcoded per-entry. */
export function relativeDayLabel(isoDate: string, today: Date = new Date()): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((target.getTime() - base.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 2) return 'Day after tomorrow';
  return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Live "Now"-relative label for a timed entry on today's timeline — the
 * server can't compute this since only the browser knows the current time. */
export function timelineLabel(entry: TimelineEntry, now: Date = new Date()): string {
  if (entry.all_day) return 'All day';
  if (!entry.scheduled_date) return 'Anytime';
  if (!entry.start_time) return relativeDayLabel(entry.scheduled_date, now);

  const isToday = entry.scheduled_date === localIsoDate(now);
  if (isToday) {
    const [h, m] = entry.start_time.split(':').map(Number);
    const entryMinutes = h * 60 + m;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (Math.abs(entryMinutes - nowMinutes) <= 15) return 'Now';
  }
  return formatTime12h(entry.start_time);
}

export function isAnytime(entry: TimelineEntry): boolean {
  return !entry.scheduled_date;
}

export function sortTimelineEntries(entries: TimelineEntry[]): TimelineEntry[] {
  return [...entries].sort((a, b) => {
    if (a.all_day !== b.all_day) return a.all_day ? -1 : 1;
    if (!a.start_time && !b.start_time) return a.created_at.localeCompare(b.created_at);
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return a.start_time.localeCompare(b.start_time);
  });
}
