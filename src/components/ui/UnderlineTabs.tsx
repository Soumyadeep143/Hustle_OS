import clsx from 'clsx';

export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-[22px] overflow-x-auto border-b border-[var(--color-line-2)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={clsx(
            'relative shrink-0 pb-2.5 text-[14px] font-medium transition-colors',
            value === tab ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-3)]'
          )}
        >
          {tab}
          {value === tab && (
            <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--color-ink)]" />
          )}
        </button>
      ))}
    </div>
  );
}
