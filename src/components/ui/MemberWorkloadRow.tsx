import { ProgressBar } from './ProgressBar';
import type { AvailabilityStatus, TeamMember } from '../../services/api';

const AVAILABILITY_TONE: Record<AvailabilityStatus, string> = {
  available: 'var(--color-blue)',
  busy: 'var(--color-yellow-ink)',
  partially_available: 'var(--color-yellow-ink)',
  pto: 'var(--color-ink-3)',
  away: 'var(--color-ink-3)',
};

const AVAILABILITY_LABEL: Record<AvailabilityStatus, string> = {
  available: 'Available',
  busy: 'Busy',
  partially_available: 'Partial',
  pto: 'PTO',
  away: 'Away',
};

export function MemberWorkloadRow({ member }: { member: TeamMember }) {
  const initials = member.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const workloadTone = member.workload_state === 'overloaded' ? 'red' : 'blue';

  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-line-2)] py-3 last:border-b-0">
      <div
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] text-[12px] font-semibold text-white"
        style={{ background: 'var(--color-ink-3)' }}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[14.5px] font-medium text-[var(--color-ink)]">{member.name}</span>
          <span className="shrink-0 font-[var(--font-mono)] text-[11px] text-[var(--color-ink-2)]">
            {member.assigned_hours}h / {member.capacity_hours}h
          </span>
        </div>
        <div className="mt-0.5 truncate text-[12.5px] text-[var(--color-ink-2)]">{member.role}</div>
        <div className="mt-1.5">
          <ProgressBar percent={member.workload_ratio * 100} tone={workloadTone} height={3} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: AVAILABILITY_TONE[member.current_availability] }} />
        <span className="text-[12px] text-[var(--color-ink-2)]">{AVAILABILITY_LABEL[member.current_availability]}</span>
      </div>
    </div>
  );
}
