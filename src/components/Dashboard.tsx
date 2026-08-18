import React from 'react';
import { TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';

const METRICS = [
  {
    title: 'Active Applications',
    value: '12',
    change: '+3',
    icon: TrendingUp,
    color: 'text-blue-400',
  },
  {
    title: 'Awaiting Response',
    value: '5',
    change: '-1',
    icon: Clock,
    color: 'text-amber-400',
  },
  {
    title: 'Interviews Scheduled',
    value: '2',
    change: '+1',
    icon: CheckCircle,
    color: 'text-emerald-400',
  },
  {
    title: 'Action Required',
    value: '3',
    change: 'High Priority',
    icon: AlertCircle,
    color: 'text-red-400',
  },
];

const PRIORITIES = [
  {
    id: 1,
    task: 'Follow up with Anthropic',
    daysAgo: 3,
    priority: 'high',
    status: 'pending',
  },
  {
    id: 2,
    task: 'Prepare for OpenAI interview',
    daysAgo: 1,
    priority: 'high',
    status: 'in_progress',
  },
  {
    id: 3,
    task: 'Complete Mem0 assessment',
    daysAgo: 5,
    priority: 'medium',
    status: 'pending',
  },
  {
    id: 4,
    task: 'Update portfolio with latest projects',
    daysAgo: 7,
    priority: 'low',
    status: 'pending',
  },
];

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <Card
              key={i}
              variant="default"
              hover
              animated
              className="overflow-hidden group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-slate-400 text-sm font-medium mb-2">{metric.title}</p>
                  <p className={`text-3xl font-bold ${metric.color}`}>{metric.value}</p>
                  <p className="text-xs text-slate-400 mt-2">{metric.change}</p>
                </div>
                <Icon size={24} className={`${metric.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Priorities Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Today's Priorities</h2>
          <Badge variant="info">4 items</Badge>
        </div>

        <div className="space-y-3">
          {PRIORITIES.map((item, i) => (
            <Card
              key={item.id}
              variant="default"
              hover
              animated
              className="animate-slideInFromLeft"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-white font-semibold truncate">{item.task}</h3>
                    <Badge
                      variant={
                        item.priority === 'high'
                          ? 'danger'
                          : item.priority === 'medium'
                          ? 'warning'
                          : 'default'
                      }
                      size="sm"
                    >
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400">{item.daysAgo} days ago</p>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <Badge
                    variant={item.status === 'in_progress' ? 'success' : 'default'}
                    size="sm"
                  >
                    {item.status === 'in_progress' ? 'In Progress' : 'Pending'}
                  </Badge>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded cursor-pointer accent-emerald-500"
                    defaultChecked={item.status === 'in_progress'}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <Card variant="gradient">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Success Rate', value: '68%' },
            { label: 'Avg Response Time', value: '2.3d' },
            { label: 'This Week', value: '+5' },
            { label: 'This Month', value: '+12' },
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
