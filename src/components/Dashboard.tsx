import React, { useEffect, useState } from 'react';
import { TrendingUp, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';
import { api, getErrorMessage, type DashboardResponse } from '../services/api';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.dashboard.get();
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card variant="dark" className="border-l-4 border-l-red-500">
        <div className="flex items-center justify-between gap-4">
          <p className="text-red-300 text-sm">{error ?? 'Unable to load dashboard'}</p>
          <button
            onClick={loadDashboard}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-200 transition-colors flex-shrink-0"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </Card>
    );
  }

  const metrics = [
    {
      title: 'Total Applications',
      value: String(data.total_applications),
      icon: TrendingUp,
      color: 'text-fuchsia-400',
    },
    {
      title: 'Follow-ups Due',
      value: String(data.followups_due),
      icon: Clock,
      color: 'text-amber-400',
    },
    {
      title: 'Execution Score',
      value: `${data.execution_score}%`,
      icon: CheckCircle,
      color: 'text-emerald-400',
    },
    {
      title: 'Action Required',
      value: String(data.followups_due),
      icon: AlertCircle,
      color: 'text-red-400',
    },
  ];

  const quickStats = [
    { label: 'Success Rate', value: `${Math.round(data.metrics.success_rate ?? 0)}%` },
    { label: 'Avg Response Time', value: `${data.metrics.avg_response_time ?? 0}d` },
    { label: 'This Week', value: `+${data.metrics.this_week ?? 0}` },
    { label: 'This Month', value: `+${data.metrics.this_month ?? 0}` },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <Card key={i} variant="default" hover animated className="overflow-hidden group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-zinc-400 text-sm font-medium mb-2">{metric.title}</p>
                  <p className={`text-3xl font-bold ${metric.color}`}>{metric.value}</p>
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
          <Badge variant="info">{data.priorities.length} items</Badge>
        </div>

        <div className="space-y-3">
          {data.priorities.length === 0 && (
            <Card variant="default">
              <p className="text-zinc-400 text-sm">No priorities right now. You're all caught up.</p>
            </Card>
          )}
          {data.priorities.map((task, i) => (
            <Card
              key={i}
              variant="default"
              hover
              animated
              className="animate-slideInFromLeft"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <h3 className="text-white font-semibold">{task}</h3>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <Card variant="gradient">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map((stat, i) => (
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
