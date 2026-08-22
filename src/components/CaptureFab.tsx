import { Plus } from 'lucide-react';
import { useUi } from '../store/useUi';

/**
 * Floating action button for quick-capture.
 *
 * Mobile  — fixed bottom-LEFT, above the bottom nav. Every screen's own
 *           inline section-header actions ("+ Add", "Ask", …) are
 *           right-aligned via justify-between, so a bottom-right FAB sits
 *           in the exact same column and can land directly on top of one
 *           whenever a page is short enough that the section lands near
 *           the fold — left-aligned space only ever has a plain-text
 *           SectionLabel, never a tap target, so it's safe here.
 * md+     — hidden: the SideNav renders its own "Quick capture" button at
 *           the bottom of the sidebar, so the FAB would be redundant and
 *           visually misplaced on a wide screen.
 */
export function CaptureFab() {
  const openSheet = useUi((s) => s.openSheet);

  return (
    <button
      onClick={() => openSheet('capture')}
      aria-label="Quick capture"
      className="
        fixed z-40
        flex h-[54px] w-[54px] items-center justify-center
        rounded-[17px] text-white
        transition-transform active:scale-[.93]
        md:hidden
      "
      style={{
        left: 'max(18px, calc(50vw - 240px + 18px))',
        bottom: 96,
        background: 'var(--color-blue)',
        boxShadow: 'var(--shadow-fab)',
      }}
    >
      <Plus size={24} strokeWidth={2} />
    </button>
  );
}
