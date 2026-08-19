export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[.18em] leading-none text-[var(--color-ink-3)]">
      {children}
    </div>
  );
}
