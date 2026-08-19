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
        right: 18,
        bottom: 96,
        background: 'var(--color-blue)',
        boxShadow: 'var(--shadow-fab)',
      }}
    >
      <Plus size={24} strokeWidth={2} />
    </button>
  );
}
