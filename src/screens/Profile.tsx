import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, type Integration, type MemoryResponse } from '../services/api';
import { useUi, type Workspace } from '../store/useUi';
import { SectionLabel, SegmentedControl } from '../components/ui';
import { Button } from '../components/Button';

const WORKSPACES: Workspace[] = ['Personal', 'Team', 'Enterprise'];

export function Profile() {
  const navigate = useNavigate();
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);
  const workspace = useUi((s) => s.workspace);
  const setWorkspace = useUi((s) => s.setWorkspace);
  const [memory, setMemory] = useState<MemoryResponse | null>(null);
  const [prospectCount, setProspectCount] = useState(0);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const showToast = useUi((s) => s.showToast);

  useEffect(() => {
    api.memory.get().then(setMemory);
    api.recall.getDashboard().then((d) => setProspectCount(d.total_prospects)).catch(() => {});
    api.integrations.list().then(setIntegrations).catch(() => {});
  }, []);

  const handleConnect = async (key: string) => {
    setConnecting(key);
    try {
      const updated = await api.integrations.connect(key);
      setIntegrations((prev) => prev.map((i) => (i.key === key ? { ...i, connected: updated.connected } : i)));
    } catch {
      showToast('Could not connect — try again');
    } finally {
      setConnecting(null);
    }
  };

  const memoryCount = (memory ? memory.applications.length + memory.insights.length : 0) + prospectCount;

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-[14px] text-[18px] font-semibold text-white"
          style={{ background: 'var(--color-blue)' }}
        >
          {(memory?.user_profile.name ?? 'U').slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="font-[var(--font-display)] text-[19px] font-semibold text-[var(--color-ink)]">
            {memory?.user_profile.name ?? 'Loading…'}
          </div>
          <div className="text-[13px] text-[var(--color-ink-2)]">Founder · HustleOS Pro</div>
        </div>
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
          {integrations.map((i) => (
            <div key={i.key} className="flex items-center justify-between border-b border-[var(--color-line-2)] py-3 last:border-b-0">
              <span className="text-[14.5px] text-[var(--color-ink)]">{i.name}</span>
              {i.connected ? (
                <span className="text-[12.5px] font-medium text-[var(--color-blue)]">Connected</span>
              ) : (
                <button
                  onClick={() => handleConnect(i.key)}
                  disabled={connecting === i.key}
                  className="text-[12.5px] font-medium text-[var(--color-ink-3)] disabled:opacity-50"
                >
                  {connecting === i.key ? 'Connecting…' : 'Connect'}
                </button>
              )}
            </div>
          ))}
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
          From applications, RECALL prospects and detected insights
        </p>
      </div>

      <Button variant="danger" fullWidth onClick={() => navigate('/')}>
        Sign out
      </Button>
    </div>
  );
}
