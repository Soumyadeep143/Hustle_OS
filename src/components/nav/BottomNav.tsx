import { NavLink } from 'react-router-dom';
import { Home, Radar, Sparkles, User } from 'lucide-react';

const TABS = [
  { to: '/', label: 'Home', Icon: Home },
  { to: '/recall', label: 'Recall', Icon: Radar },
  { to: '/ai', label: 'AI', Icon: Sparkles },
  { to: '/profile', label: 'Profile', Icon: User },
];

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--color-line)] px-1.5 pt-[9px] backdrop-blur-[18px]"
      style={{ background: 'var(--color-nav-bg)', paddingBottom: 'max(26px, env(safe-area-inset-bottom))' }}
    >
      {TABS.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className="flex flex-col items-center gap-[5px] py-[5px]">
          {({ isActive }) => (
            <>
              <Icon
                size={21}
                strokeWidth={isActive ? 1.9 : 1.5}
                color={isActive ? 'var(--color-blue)' : 'var(--color-ink-3)'}
              />
              <span
                className="text-[10px] leading-none"
                style={{ fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--color-blue)' : 'var(--color-ink-3)' }}
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
