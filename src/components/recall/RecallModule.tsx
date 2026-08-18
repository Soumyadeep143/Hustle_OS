import React, { useState } from 'react';
import clsx from 'clsx';
import { RecallOverview } from './RecallOverview';
import { ProspectList } from './ProspectList';
import { ProspectDetail } from './ProspectDetail';

type SubView = 'overview' | 'prospects';

export const RecallModule: React.FC = () => {
  const [subView, setSubView] = useState<SubView>('overview');
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);

  if (selectedProspectId) {
    return (
      <ProspectDetail prospectId={selectedProspectId} onBack={() => setSelectedProspectId(null)} />
    );
  }

  const tabs: Array<{ id: SubView; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'prospects', label: 'Prospects' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubView(tab.id)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              subView === tab.id
                ? 'border-fuchsia-500 text-fuchsia-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subView === 'overview' && <RecallOverview onSelectProspect={setSelectedProspectId} />}
      {subView === 'prospects' && <ProspectList onSelectProspect={setSelectedProspectId} />}
    </div>
  );
};
