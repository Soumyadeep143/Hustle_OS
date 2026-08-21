import { Plus } from 'lucide-react';
import { useUi } from '../store/useUi';

export function CaptureFab() {
  const openSheet = useUi((s) => s.openSheet);

  return (
    <button
      onClick={() => openSheet('capture')}
      aria-label="Quick capture"
      className="fixed z-40 flex h-[54px] w-[54px] items-center justify-center rounded-[17px] text-white transition-transform active:scale-[.93]"
      style={{
        // Anchored to the right edge of the app's own max-w-[480px] content
        // column, not the browser viewport -- on a phone-width screen this
        // is identical to `right: 18px`; on anything wider it stays glued
        // to the content instead of drifting off to the real screen edge.
        right: 'max(18px, calc(50vw - 240px + 18px))',
        bottom: 96,
        background: 'var(--color-blue)',
        boxShadow: 'var(--shadow-fab)',
      }}
    >
      <Plus size={24} strokeWidth={2} />
    </button>
  );
}
