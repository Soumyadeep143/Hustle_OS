import { useUi } from '../../store/useUi';

export function Toast() {
  const toast = useUi((s) => s.toast);
  if (!toast) return null;

  return (
    <div
      className="fixed left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-[var(--radius-control)] px-4 py-3 text-[13px] font-medium"
      style={{
        bottom: 104,
        background: 'var(--color-ink)',
        color: 'var(--color-bg)',
        animation: 'hosUp 220ms ease-out',
      }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-yellow-ink)' }} />
      {toast}
    </div>
  );
}
