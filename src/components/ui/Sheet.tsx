import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Sheet / Modal
 *
 * Mobile  (< 768px) — slides up from the bottom, full-width, rounded top
 *                      corners, max 86dvh tall. Classic bottom-sheet UX.
 *
 * md+     (≥ 768px) — renders as a centred dialog with rounded corners on
 *                      all sides, max-w-[520px], max-h-[80dvh]. The drag
 *                      handle and bottom-sheet animation are hidden; instead
 *                      a small ✕ close button appears in the top-right corner.
 *
 * Both variants share the same scrim, Escape-key handler, and portal.
 */
export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional accessible title shown in the modal header at md+ */
  title?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Lock body scroll while open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      {/* Scrim */}
      <div
        className="absolute inset-0"
        style={{ background: 'var(--color-scrim)', animation: 'hosFade 220ms ease-out' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="
          relative w-full outline-none

          /* ── mobile: bottom-sheet ── */
          max-w-[480px]
          rounded-t-[var(--radius-sheet)]
          border-t border-[var(--color-line)]
          p-5
          pb-[max(24px,env(safe-area-inset-bottom))]

          /* ── md+: centred modal ── */
          md:max-w-[520px]
          md:rounded-[var(--radius-sheet)]
          md:border
          md:pb-6
          md:shadow-2xl
        "
        style={{
          background: 'var(--color-surface)',
          animation: 'hosSheet 320ms cubic-bezier(.2,.9,.2,1)',
          overscrollBehavior: 'contain',
          maxHeight: '86dvh',
          overflowY: 'auto',
        }}
      >
        {/* ── Mobile drag handle ── */}
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[var(--color-line)] md:hidden" />

        {/* ── md+ header row with optional title + close button ── */}
        <div className="mb-4 hidden items-center justify-between md:flex">
          {title ? (
            <span className="font-[var(--font-display)] text-[17px] font-semibold text-[var(--color-ink)]">
              {title}
            </span>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="
              flex h-8 w-8 items-center justify-center
              rounded-full
              text-[var(--color-ink-3)]
              transition-colors hover:bg-[var(--color-line-2)] hover:text-[var(--color-ink)]
            "
          >
            <X size={17} />
          </button>
        </div>

        {children}
      </div>
    </div>,
    document.body
  );
}
