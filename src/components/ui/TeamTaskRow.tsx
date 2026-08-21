import clsx from 'clsx';
import { Chip } from './Chip';
import type { TeamTaskDto } from '../../services/api';

const STATUS_LABEL: Record<string, string> = {
  todo: 'TODO',
  in_progress: 'IN PROGRESS',
  in_review: 'IN REVIEW',
  done: 'DONE',
};

export function TeamTaskRow({ task, assigneeName }: { task: TeamTaskDto; assigneeName?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line-2)] py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'truncate text-[14.5px] font-medium',
              task.status === 'done' ? 'text-[var(--color-ink-3)] line-through' : 'text-[var(--color-ink)]'
            )}
          >
            {task.title}
          </span>
          {task.priority === 'urgent' && <Chip tone="red">URGENT</Chip>}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[var(--color-ink-2)]">
          {assigneeName && <span>{assigneeName}</span>}
          {task.estimate_hours != null && <span>· {task.estimate_hours}h</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {task.is_blocked && <Chip tone="red">BLOCKED</Chip>}
        {task.status !== 'done' && !task.is_blocked && <Chip tone="neutral">{STATUS_LABEL[task.status]}</Chip>}
        {task.status === 'done' && <Chip tone="blue">DONE</Chip>}
      </div>
    </div>
  );
}
