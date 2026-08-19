import type { Tone } from './types';

/**
 * Static seed data shaped exactly like the future backend responses documented in
 * API_CONTRACT.md (`GET /api/team/{id}/sprint`, `GET /api/org/health`). There is no
 * multi-user/team data model in hustleos-backend yet — swap these calls for real
 * fetches once routes/workspaces.py exists.
 */

export interface TeamSprint {
  name: string;
  percent: number;
  done: number;
  total: number;
  blocked: { task: string; owner: string }[];
  members: { name: string; role: string; status: 'Blocked' | 'Available' | 'Busy' }[];
  recommendation: { text: string; actions: string[] };
}

export function getTeamSprint(): TeamSprint {
  return {
    name: 'Sprint 04',
    percent: 72,
    done: 18,
    total: 25,
    blocked: [
      { task: 'API contract review', owner: 'Aditi Rao' },
      { task: 'Voice pipeline latency fix', owner: 'Marcus Chen' },
    ],
    members: [
      { name: 'Aditi Rao', role: 'Backend', status: 'Blocked' },
      { name: 'Marcus Chen', role: 'Voice/ML', status: 'Blocked' },
      { name: 'Priya Nair', role: 'Frontend', status: 'Available' },
      { name: 'Jordan Lee', role: 'Design', status: 'Available' },
      { name: 'Sam Okafor', role: 'QA', status: 'Busy' },
    ],
    recommendation: {
      text: 'Unblock Aditi and Marcus first — both blockers are on the critical path for the sprint demo.',
      actions: ['Review', 'Later'],
    },
  };
}

export interface OrgHealth {
  executionHealth: number;
  delta: string;
  rows: { label: string; value: string; tone?: Tone }[];
  insight: { lines: { text: string; tone?: Tone }[] };
}

export function getOrgHealth(): OrgHealth {
  return {
    executionHealth: 91,
    delta: '▲ 4 pts',
    rows: [
      { label: 'Projects at risk', value: '2', tone: 'red' },
      { label: 'Critical blockers', value: '3', tone: 'red' },
      { label: 'Teams overloaded', value: '1', tone: 'yellow' },
      { label: 'Shipped this month', value: '12' },
    ],
    insight: {
      lines: [
        { text: 'Execution health is trending up across all teams this quarter.' },
        { text: 'Two projects are at risk of missing their deadline this sprint.', tone: 'red' },
        { text: 'Consider reallocating QA capacity to the platform team.' },
      ],
    },
  };
}

export interface SeedProject {
  id: string;
  name: string;
  percent: number;
  meta: string;
  atRisk: boolean;
}

export function getProjects(): SeedProject[] {
  return [
    { id: 'p1', name: 'RECALL v2 rollout', percent: 64, meta: '4 of 9 milestones', atRisk: false },
    { id: 'p2', name: 'Voice pipeline latency', percent: 30, meta: '2 of 6 milestones', atRisk: true },
    { id: 'p3', name: 'Mobile redesign', percent: 85, meta: '6 of 7 milestones', atRisk: false },
  ];
}
