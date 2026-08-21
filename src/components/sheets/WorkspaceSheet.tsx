import { Check } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { useUi, type Workspace } from '../../store/useUi';

// Team/Enterprise workspaces are disabled for now — HustleOS is scoped to
// personal use. The rendering code for both (Home.tsx's HomeTeam/HomeEnterprise,
// the /team routes) is untouched on disk, just unreachable with only one
// selectable option here.
const OPTIONS: Workspace[] = ['Personal'];

export function WorkspaceSheet() {
  const sheet = useUi((s) => s.sheet);
  const workspace = useUi((s) => s.workspace);
  const setWorkspace = useUi((s) => s.setWorkspace);
  const closeSheet = useUi((s) => s.closeSheet);

  return (
    <Sheet open={sheet === 'workspace'} onClose={closeSheet}>
      <h2 className="mb-4 font-[var(--font-display)] text-[17px] font-semibold text-[var(--color-ink)]">
        Switch workspace
      </h2>
      <div className="flex flex-col">
        {OPTIONS.map((w) => (
          <button
            key={w}
            onClick={() => setWorkspace(w)}
            className="flex items-center justify-between border-b border-[var(--color-line-2)] py-3.5 text-left last:border-b-0"
          >
            <span className="text-[15px] font-medium text-[var(--color-ink)]">{w}</span>
            {workspace === w && <Check size={18} className="text-[var(--color-blue)]" />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
