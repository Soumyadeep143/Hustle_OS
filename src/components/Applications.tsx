import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { api, getErrorMessage, type Application } from '../services/api';

const COLUMNS: Array<{ key: string; title: string; color: string }> = [
  { key: 'applied', title: 'Applied', color: 'border-l-fuchsia-500' },
  { key: 'reviewing', title: 'Reviewing', color: 'border-l-amber-500' },
  { key: 'interview', title: 'Interview', color: 'border-l-emerald-500' },
];

const KanbanColumn: React.FC<{
  title: string;
  applications: Application[];
  color: string;
}> = ({ title, applications, color }) => {
  return (
    <div className="flex-1 min-w-0">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-white">{title}</h3>
          <Badge variant="info" size="sm">
            {applications.length}
          </Badge>
        </div>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {applications.length === 0 && (
          <p className="text-sm text-zinc-500 italic">No applications here yet.</p>
        )}
        {applications.map((app) => (
          <Card key={app.id} variant="dark" hover className={`border-l-4 ${color} group`}>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-white group-hover:text-fuchsia-400 transition-colors">
                  {app.company}
                </h4>
                <p className="text-sm text-zinc-400">{app.role}</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="info" size="sm">
                  {app.match_score}% match
                </Badge>
              </div>

              {app.notes && <p className="text-xs text-zinc-400 italic">{app.notes}</p>}
              {app.last_followup && (
                <p className="text-xs text-zinc-500">Last follow-up: {app.last_followup}</p>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-700">
                <span className="text-xs text-zinc-500">{app.applied_at}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const Applications: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.memory.get();
      setApplications(result.applications);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="dark" className="border-l-4 border-l-red-500">
        <div className="flex items-center justify-between gap-4">
          <p className="text-red-300 text-sm">{error}</p>
          <button
            onClick={loadApplications}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-200 transition-colors flex-shrink-0"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </Card>
    );
  }

  const byStatus = (status: string) => applications.filter((a) => a.status === status);
  const reviewingCount = byStatus('reviewing').length;
  const interviewCount = byStatus('interview').length;
  const avgMatch = applications.length
    ? Math.round(applications.reduce((sum, a) => sum + a.match_score, 0) / applications.length)
    : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Application Pipeline</h1>
        <Button variant="primary" size="md">
          + New Application
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            title={col.title}
            applications={byStatus(col.key)}
            color={col.color}
          />
        ))}
      </div>

      {/* Stats Footer */}
      <Card variant="gradient">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Applications', value: String(applications.length) },
            { label: 'Pending Review', value: String(reviewingCount) },
            { label: 'Interviews', value: String(interviewCount) },
            { label: 'Avg Match Score', value: `${avgMatch}%` },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-zinc-300 text-sm mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-fuchsia-300">{stat.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
