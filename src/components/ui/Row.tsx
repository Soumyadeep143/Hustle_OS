import clsx from 'clsx';

export function Row({
  left,
  right,
  onClick,
  className,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={clsx(
        'flex w-full items-center justify-between gap-3 border-b border-[var(--color-line-2)] py-3 text-left last:border-b-0',
        onClick && 'active:scale-[.985] transition-transform',
        className
      )}
    >
      <div className="min-w-0 flex-1">{left}</div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </Comp>
  );
}
