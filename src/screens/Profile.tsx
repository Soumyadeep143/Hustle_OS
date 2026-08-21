import { useEffect, useState } from 'react';
import { Check, Pencil, CheckCircle2, Zap } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, type Integration, type MemoryResponse } from '../services/api';
import { useUi, type Workspace } from '../store/useUi';
import { useAuth } from '../store/useAuth';
import { SectionLabel, SegmentedControl } from '../components/ui';
import { Button } from '../components/Button';
import { EditProfileSheet } from '../components/sheets/EditProfileSheet';

const WORKSPACES: Workspace[] = ['Personal', 'Team', 'Enterprise'];

// Brand icons as inline SVG components
const IntegrationIcons: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  gmail: {
    color: '#EA4335',
    bg: '#FEE8E7',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
        <path d="M6 20H4a2 2 0 01-2-2V6.5L12 13l10-6.5V18a2 2 0 01-2 2h-2" stroke="none" />
        <path d="M2 6.5L12 13l10-6.5M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="none" />
        <rect x="2" y="4" width="20" height="16" rx="2" fill="#fff" />
        <path d="M2 6l10 7 10-7" stroke="#EA4335" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <rect x="2" y="4" width="20" height="16" rx="2" stroke="#EA4335" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  calendar: {
    color: '#1A73E8',
    bg: '#E8F0FE',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="#1A73E8" strokeWidth="1.6" />
        <path d="M16 2v4M8 2v4M3 10h18" stroke="#1A73E8" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="7" y="13" width="3" height="3" rx="0.5" fill="#1A73E8" />
        <rect x="11" y="13" width="3" height="3" rx="0.5" fill="#EA4335" />
      </svg>
    ),
  },
  linkedin: {
    color: '#0A66C2',
    bg: '#E7F0FA',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#0A66C2">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  github: {
    color: '#24292F',
    bg: '#F0F0F0',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#24292F">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
  notion: {
    color: '#000000',
    bg: '#F0EFED',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#000">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.887l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
      </svg>
    ),
  },
};

function getIntegrationMeta(key: string) {
  return IntegrationIcons[key.toLowerCase()] ?? {
    color: '#6B7280',
    bg: '#F3F4F6',
    icon: <Zap className="h-4 w-4" style={{ color: '#6B7280' }} />,
  };
}

export function Profile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const logout = useAuth((s) => s.logout);
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);
  const workspace = useUi((s) => s.workspace);
  const setWorkspace = useUi((s) => s.setWorkspace);
  const [memory, setMemory] = useState<MemoryResponse | null>(null);
  const [recallCount, setRecallCount] = useState(0);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const showToast = useUi((s) => s.showToast);

  useEffect(() => {
    api.memory.get().then(setMemory);
    api.recall.getDashboard().then((d) => setRecallCount(d.total)).catch(() => {});
    api.integrations.list().then(setIntegrations).catch(() => {});
  }, []);

  useEffect(() => {
    const calendarStatus = searchParams.get('calendar');
    if (!calendarStatus) return;
    if (calendarStatus === 'connected') {
      showToast('Google Calendar connected');
      api.integrations.list().then(setIntegrations).catch(() => {});
    } else if (calendarStatus === 'error') {
      showToast("Couldn't connect Google Calendar — try again");
    }
    searchParams.delete('calendar');
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleConnect = async (key: string) => {
    setConnecting(key);
    try {
      if (key === 'calendar') {
        const { configured, url } = await api.integrations.calendarAuthUrl();
        if (!configured || !url) {
          showToast('Google Calendar isn\'t configured on this server yet');
          return;
        }
        window.location.href = url;
        return;
      }
      const updated = await api.integrations.connect(key);
      setIntegrations((prev) => prev.map((i) => (i.key === key ? { ...i, connected: updated.connected } : i)));
    } catch {
      showToast('Could not connect — try again');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnectCalendar = async () => {
    setConnecting('calendar');
    try {
      await api.integrations.calendarDisconnect();
      setIntegrations((prev) => prev.map((i) => (i.key === 'calendar' ? { ...i, connected: false } : i)));
      showToast('Google Calendar disconnected');
    } catch {
      showToast('Could not disconnect — try again');
    } finally {
      setConnecting(null);
    }
  };

  const memoryCount = (memory ? memory.applications.length + memory.insights.length : 0) + recallCount;

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] text-[18px] font-semibold text-white"
          style={{ background: 'var(--color-blue)' }}
        >
          {(memory?.user_profile.name ?? 'U').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-[var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">
            {memory?.user_profile.name ?? 'Loading…'}
          </div>
          <div className="truncate text-[13px] text-[var(--color-ink-2)]">
            {memory?.user_profile.target_role
              ? `${memory.user_profile.target_role}${memory.user_profile.target_location ? ` · ${memory.user_profile.target_location}` : ''}`
              : 'Add your target role'}
          </div>
        </div>
        <button
          onClick={() => setShowEditProfile(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-2)]"
        >
          <Pencil size={15} />
        </button>
      </div>

      <div>
        <SectionLabel>APPEARANCE</SectionLabel>
        <div className="mt-3">
          <SegmentedControl
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={theme}
            onChange={setTheme}
          />
        </div>
      </div>

      <div>
        <SectionLabel>WORKSPACE</SectionLabel>
        <div className="mt-3 flex flex-col">
          {WORKSPACES.map((w) => (
            <button
              key={w}
              onClick={() => setWorkspace(w)}
              className="flex items-center justify-between border-b border-[var(--color-line-2)] py-3 text-left last:border-b-0"
            >
              <span
                className="text-[14.5px] font-medium"
                style={{ color: workspace === w ? 'var(--color-blue)' : 'var(--color-ink)' }}
              >
                {w}
              </span>
              {workspace === w && <Check size={17} className="text-[var(--color-blue)]" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>INTEGRATIONS</SectionLabel>
        <div className="mt-3 flex flex-col">
          {integrations.map((i, idx) => {
            const meta = getIntegrationMeta(i.key);
            const isConnecting = connecting === i.key;
            return (
              <div
                key={i.key}
                className="integration-row group flex items-center justify-between border-b border-[var(--color-line-2)] py-2.5 last:border-b-0"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Icon + Name */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="integration-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] transition-all duration-200 group-hover:scale-110 group-hover:shadow-sm"
                    style={{ background: meta.bg }}
                  >
                    {meta.icon}
                  </div>
                  <span
                    className="integration-name text-[14px] font-medium transition-colors duration-200"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {i.name}
                  </span>
                </div>

                {/* Status */}
                {i.connected ? (
                  i.key === 'calendar' ? (
                    <button
                      onClick={handleDisconnectCalendar}
                      disabled={isConnecting}
                      className="integration-badge flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold transition-all duration-200 hover:opacity-80 disabled:opacity-50"
                      style={{ color: meta.color, background: meta.bg }}
                    >
                      <CheckCircle2 size={11} className="shrink-0" />
                      <span className="integration-badge-text">{isConnecting ? 'Disconnecting…' : 'Connected'}</span>
                    </button>
                  ) : (
                    <span className="integration-badge flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold transition-all duration-200 group-hover:opacity-80"
                      style={{ color: meta.color, background: meta.bg }}
                    >
                      <CheckCircle2 size={11} className="shrink-0" />
                      <span className="integration-badge-text">Connected</span>
                    </span>
                  )
                ) : (
                  <button
                    onClick={() => handleConnect(i.key)}
                    disabled={isConnecting}
                    className="integration-connect-btn rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
                    style={{
                      color: isConnecting ? 'var(--color-ink-3)' : meta.color,
                      background: isConnecting ? 'var(--color-line-2)' : meta.bg,
                    }}
                  >
                    {isConnecting ? (
                      <span className="integration-connecting flex items-center gap-1">
                        <span className="integration-dot" />
                        Connecting
                      </span>
                    ) : (
                      'Connect'
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="font-[var(--font-display)] text-[17px] font-semibold text-[var(--color-ink)]">
          {memoryCount.toLocaleString()} memories stored
        </div>
        <p className="mt-1 text-[12.5px] text-[var(--color-ink-2)]">
          From applications, RECALL captures and detected insights
        </p>
      </div>

      <Button
        variant="danger"
        fullWidth
        onClick={() => {
          logout();
          navigate('/login');
        }}
      >
        Sign out
      </Button>

      <EditProfileSheet
        open={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        profile={memory?.user_profile ?? null}
        onSaved={(updated) => setMemory((prev) => (prev ? { ...prev, user_profile: updated } : prev))}
      />
    </div>
  );
}
