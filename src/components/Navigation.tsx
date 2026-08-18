import React from 'react';
import { Mic, LayoutDashboard, Briefcase, Settings } from 'lucide-react';
import clsx from 'clsx';

interface NavigationProps {
  activeTab: 'voice' | 'dashboard' | 'applications' | 'settings';
  onTabChange: (tab: 'voice' | 'dashboard' | 'applications' | 'settings') => void;
  isListening?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  isListening = false,
}) => {
  const tabs = [
    {
      id: 'voice' as const,
      label: 'Voice',
      icon: Mic,
      badge: isListening ? 'listening' : null,
    },
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'applications' as const,
      label: 'Applications',
      icon: Briefcase,
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-slate-900 border-b border-slate-800 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">HO</span>
            </div>
            <span className="text-white font-geist font-bold text-lg hidden sm:inline">HustleOS</span>
          </div>

          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={clsx(
                    'relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 font-medium text-sm',
                    isActive
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                  )}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-slate-400 text-xs hidden sm:inline">Online</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
