import { NavLink } from 'react-router-dom';
import { Home, Briefcase, Radar, Sparkles, User } from 'lucide-react';

const TABS = [
  { to: '/', label: 'Home', Icon: Home },
  { to: '/work', label: 'Work', Icon: Briefcase },
  { to: '/recall', label: 'Recall', Icon: Radar },
  { to: '/ai', label: 'AI', Icon: Sparkles },
  { to: '/profile', label: 'Profile', Icon: User },
];

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-line)] backdrop-blur-[18px] md:hidden"
      style={{ background: 'var(--color-nav-bg)' }}
    >
      {/* The bar itself spans the full width (so its background/blur reaches
          both screen edges), but the tabs stay aligned to the same
          max-w-[480px] column every other screen uses — without this, the
          nav visibly detaches from the content above it on anything wider
          than a phone. */}
      <div
        className="mx-auto grid max-w-[480px] grid-cols-5 px-1.5 pt-[9px]"
        style={{ paddingBottom: 'max(26px, env(safe-area-inset-bottom))' }}
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
      </div>
    </nav>
  );
}
