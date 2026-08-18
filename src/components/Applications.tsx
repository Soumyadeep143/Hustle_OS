import React from 'react';
import { ExternalLink, Trash2, MessageSquare } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';

interface Application {
  id: number;
  company: string;
  position: string;
  appliedDate: string;
  salary?: string;
  match: number;
  notes?: string;
}

const APPLICATIONS: Record<string, Application[]> = {
  applied: [
    {
      id: 1,
      company: 'OpenAI',
      position: 'ML Engineer',
      appliedDate: 'Aug 15',
      salary: '₹50-70L',
      match: 95,
    },
    {
      id: 2,
      company: 'Anthropic',
      position: 'AI Research Engineer',
      appliedDate: 'Aug 14',
      salary: '₹55-75L',
      match: 92,
    },
    {
      id: 3,
      company: 'Mem0',
      position: 'Senior ML Engineer',
      appliedDate: 'Aug 12',
      salary: '₹40-60L',
      match: 88,
    },
  ],
  reviewing: [
    {
      id: 4,
      company: 'Google',
      position: 'AI Engineer',
      appliedDate: 'Aug 10',
      salary: '₹60-80L',
      match: 90,
      notes: 'Under review - 5 days',
    },
    {
      id: 5,
      company: 'DeepMind',
      position: 'Research Scientist',
      appliedDate: 'Aug 8',
      salary: '₹65-85L',
      match: 87,
      notes: 'Profile reviewed',
    },
  ],
  interview: [
    {
      id: 6,
      company: 'OpenAI',
      position: 'ML Engineer',
      appliedDate: 'Aug 7',
      salary: '₹50-70L',
      match: 95,
      notes: 'Round 1: Aug 20',
    },
    {
      id: 7,
      company: 'Anthropic',
      position: 'AI Research Engineer',
      appliedDate: 'Aug 5',
      salary: '₹55-75L',
      match: 92,
      notes: 'Round 2: Aug 25',
    },
  ],
};

const KanbanColumn: React.FC<{
  title: string;
  count: number;
  applications: Application[];
  color: string;
}> = ({ title, count, applications, color }) => {
  return (
    <div className="flex-1 min-w-0">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-white">{title}</h3>
          <Badge variant="info" size="sm">
            {count}
          </Badge>
        </div>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {applications.map((app) => (
          <Card
            key={app.id}
            variant="dark"
            hover
            className={`border-l-4 ${color} cursor-move group`}
          >
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {app.company}
                </h4>
                <p className="text-sm text-slate-400">{app.position}</p>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {app.salary && (
                    <Badge variant="success" size="sm">
                      {app.salary}
                    </Badge>
                  )}
                  <Badge variant="info" size="sm">
                    {app.match}% match
                  </Badge>
                </div>
              </div>

              {app.notes && (
                <p className="text-xs text-slate-400 italic">{app.notes}</p>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700">
                <span className="text-xs text-slate-500">{app.appliedDate}</span>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200">
                    <MessageSquare size={16} />
                  </button>
                  <button className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200">
                    <ExternalLink size={16} />
                  </button>
                  <button className="p-1.5 hover:bg-red-500/10 rounded transition-colors text-slate-400 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const Applications: React.FC = () => {
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
        <KanbanColumn
          title="Applied"
          count={APPLICATIONS.applied.length}
          applications={APPLICATIONS.applied}
          color="border-l-blue-500"
        />
        <KanbanColumn
          title="Reviewing"
          count={APPLICATIONS.reviewing.length}
          applications={APPLICATIONS.reviewing}
          color="border-l-amber-500"
        />
        <KanbanColumn
          title="Interview"
          count={APPLICATIONS.interview.length}
          applications={APPLICATIONS.interview}
          color="border-l-emerald-500"
        />
      </div>

      {/* Stats Footer */}
      <Card variant="gradient">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Applications',
              value: String(
                APPLICATIONS.applied.length +
                  APPLICATIONS.reviewing.length +
                  APPLICATIONS.interview.length
              ),
            },
            { label: 'Pending Review', value: String(APPLICATIONS.reviewing.length) },
            { label: 'Interviews', value: String(APPLICATIONS.interview.length) },
            { label: 'Avg Response Time', value: '3.2 days' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-slate-300 text-sm mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-blue-300">{stat.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
