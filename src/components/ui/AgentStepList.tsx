import { Check, Loader2, X } from 'lucide-react';

export type AgentStepStatus = 'pending' | 'running' | 'done' | 'error';

export interface AgentStepDef {
  key: string;
  label: string;
}

export function AgentStepList({
  steps,
  state,
}: {
  steps: AgentStepDef[];
  state: Record<string, { status: AgentStepStatus; detail?: string }>;
}) {
  return (
    <div className="flex flex-col gap-3">
      {steps.map((step) => {
        const s = state[step.key] ?? { status: 'pending' as AgentStepStatus };
        return (
          <div
            key={step.key}
            className="flex items-center justify-between text-[13.5px] transition-opacity"
            style={{ opacity: s.status === 'pending' ? 0.32 : 1 }}
          >
            <div className="flex items-center gap-2.5">
              {s.status === 'done' ? (
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-white"
                  style={{ background: 'var(--color-blue)' }}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
              ) : s.status === 'error' ? (
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-white"
                  style={{ background: 'var(--color-red)' }}
                >
                  <X size={12} strokeWidth={3} />
                </span>
              ) : s.status === 'running' ? (
                <Loader2 size={18} className="animate-spin text-[var(--color-blue)]" />
              ) : (
                <span className="h-5 w-5 rounded-full border border-[var(--color-line)]" />
              )}
              <span className="text-[var(--color-ink)]">{step.label}</span>
            </div>
            {s.status !== 'pending' && (
              <span className={s.status === 'error' ? 'text-[var(--color-red)]' : 'text-[var(--color-ink-3)]'}>
                {s.detail ?? 'working…'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
