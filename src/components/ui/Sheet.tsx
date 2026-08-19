import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0"
        style={{ background: 'var(--color-scrim)', animation: 'hosFade 220ms ease-out' }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[480px] rounded-t-[var(--radius-sheet)] border-t border-[var(--color-line)] bg-[var(--color-surface)] p-5 pb-[max(24px,env(safe-area-inset-bottom))] outline-none"
        style={{
          animation: 'hosSheet 320ms cubic-bezier(.2,.9,.2,1)',
          overscrollBehavior: 'contain',
          maxHeight: '86dvh',
          overflowY: 'auto',
        }}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[var(--color-line)]" />
        {children}
      </div>
    </div>,
    document.body
  );
}
