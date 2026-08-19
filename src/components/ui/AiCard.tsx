export function AiCard({
  label = 'AI BRIEF',
  meta,
  children,
  footer,
}: {
  label?: string;
  meta?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-[.18em] text-[var(--color-blue)]">✦ {label}</span>
        {meta && <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-3)]">{meta}</span>}
      </div>
      <div className="mt-3 font-[var(--font-display)] text-[15.5px] leading-[1.5] text-[var(--color-ink)]">
        {children}
      </div>
      {footer && (
        <div className="mt-3 flex items-center justify-between border-t border-[var(--color-line-2)] pt-3">
          {footer}
        </div>
      )}
    </div>
  );
}
