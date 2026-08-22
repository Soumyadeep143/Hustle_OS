import { NavLink } from 'react-router-dom';
import { Home, Briefcase, Radar, Sparkles, User, Plus } from 'lucide-react';
import { useUi } from '../../store/useUi';

const TABS = [
  { to: '/', label: 'Home', Icon: Home },
  { to: '/work', label: 'Work', Icon: Briefcase },
  { to: '/recall', label: 'Recall', Icon: Radar },
  { to: '/ai', label: 'AI', Icon: Sparkles },
  { to: '/profile', label: 'Profile', Icon: User },
];

export function SideNav() {
  const openSheet = useUi((s) => s.openSheet);

  return (
    <aside
      className="
        hidden md:flex
        w-[220px] shrink-0
        flex-col
        sticky top-0 h-dvh
        border-r border-[var(--color-line)]
        pt-6 pb-4
        px-3
      "
      style={{ background: 'var(--color-nav-bg)', backdropFilter: 'blur(18px)' }}
    >
      {/* Wordmark */}
      <div className="flex items-center gap-2 px-3 pb-6">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-[8px]"
          style={{ background: 'var(--color-blue)' }}
        >
          <span className="text-[13px] font-bold text-white">✦</span>
        </div>
        <span className="font-[var(--font-display)] text-[15px] font-semibold tracking-[-.01em] text-[var(--color-ink)]">
          HustleOS
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-medium transition-colors duration-150',
                isActive
                  ? 'bg-[var(--color-blue-soft)] text-[var(--color-blue)]'
                  : 'text-[var(--color-ink-2)] hover:bg-[var(--color-line-2)] hover:text-[var(--color-ink)]',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} strokeWidth={isActive ? 2 : 1.6} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Quick-capture button at bottom of sidebar */}
      <button
        onClick={() => openSheet('capture')}
        className="
          flex items-center gap-3 rounded-[10px] px-3 py-2.5
          text-[14px] font-semibold text-white
          transition-transform active:scale-[.97]
        "
        style={{ background: 'var(--color-blue)' }}
      >
        <Plus size={17} strokeWidth={2.2} />
        Quick capture
      </button>
    </aside>
  );
}
