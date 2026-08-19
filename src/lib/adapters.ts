import type { DashboardResponse, MemoryResponse } from '../services/api';
import type { Tone } from './types';

export interface Brief {
  headline: string;
  actionCount: number;
  highestPriority: string | null;
  followupsDue: number;
  planPrompt: string;
}

export interface TimelineItem {
  at: string;
  title: string;
  subtitle: string;
  tone: Tone;
  flag?: string;
}

/** Derived from /api/dashboard until a real /api/brief endpoint exists. */
export function briefFromDashboard(dashboard: DashboardResponse): Brief {
  const actionCount = dashboard.priorities.length;
  return {
    headline: actionCount
      ? `${actionCount} important action${actionCount === 1 ? '' : 's'}`
      : 'Nothing urgent right now',
    actionCount,
    highestPriority: dashboard.priorities[0] ?? null,
    followupsDue: dashboard.followups_due,
    planPrompt: "What's my plan today?",
  };
}

/** Derived from /api/dashboard + /api/memory until a real /api/timeline/today endpoint exists. */
export function timelineFromDashboard(dashboard: DashboardResponse, memory: MemoryResponse): TimelineItem[] {
  const items: TimelineItem[] = dashboard.priorities.slice(0, 4).map((p, i) => ({
    at: i === 0 ? 'Now' : `+${i}h`,
    title: p,
    subtitle: i === 0 ? 'Highest priority' : 'Follow up',
    tone: i === 0 ? 'blue' : 'neutral',
    flag: i === 0 ? 'HIGHEST PRIORITY' : undefined,
  }));

  const stale = memory.applications.filter((a) => a.status !== 'interview').slice(0, 2);
  for (const app of stale) {
    items.push({
      at: 'Today',
      title: `Follow up · ${app.company}`,
      subtitle: app.role,
      tone: 'red',
      flag: 'OVERDUE',
    });
  }

  return items;
}
