import type { RecallPriority, RecallStatus } from '../services/api';
import type { Tone } from './types';

export const RECALL_CATEGORIES = [
  'Career',
  'Job',
  'Internship',
  'Company',
  'Person',
  'Hackathon',
  'Event',
  'AI / Technology',
  'Research',
  'Knowledge',
  'Business Opportunity',
  'Startup',
  'Learning',
  'Other',
];

export const RECALL_STATUSES: { value: RecallStatus; label: string }[] = [
  { value: 'saved', label: 'Saved' },
  { value: 'interested', label: 'Interested' },
  { value: 'applied', label: 'Applied' },
  { value: 'following_up', label: 'Following Up' },
  { value: 'interview', label: 'Interview' },
  { value: 'responded', label: 'Responded' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export const STATUS_CHIP: Record<RecallStatus, { label: string; tone: Tone }> = {
  saved: { label: 'SAVED', tone: 'neutral' },
  interested: { label: 'INTERESTED', tone: 'yellow' },
  applied: { label: 'APPLIED', tone: 'blue' },
  following_up: { label: 'FOLLOWING UP', tone: 'yellow' },
  interview: { label: 'INTERVIEW', tone: 'blue' },
  responded: { label: 'RESPONDED', tone: 'blue' },
  opportunity: { label: 'OPPORTUNITY', tone: 'red' },
  completed: { label: 'COMPLETED', tone: 'neutral' },
  archived: { label: 'ARCHIVED', tone: 'neutral' },
};

export const PRIORITY_LABEL: Record<RecallPriority, { label: string; tone: Tone }> = {
  high: { label: 'HIGH', tone: 'red' },
  medium: { label: 'MEDIUM', tone: 'yellow' },
  low: { label: 'LOW', tone: 'neutral' },
};

export function followUpLabel(isoDate: string): { text: string; overdue: boolean } {
  const due = new Date(`${isoDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (days === 0) return { text: 'Today', overdue: false };
  if (days === 1) return { text: 'Tomorrow', overdue: false };
  if (days === -1) return { text: '1 day overdue', overdue: true };
  if (days < 0) return { text: `${Math.abs(days)} days overdue`, overdue: true };
  return { text: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), overdue: false };
}

export function relativeDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.round((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'TODAY';
  if (days === 1) return 'YESTERDAY';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
}
