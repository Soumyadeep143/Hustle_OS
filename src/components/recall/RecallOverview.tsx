import React, { useEffect, useState } from 'react';
import {
  Users,
  Zap,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  Activity,
  Brain,
  TrendingUp,
  CheckCircle,
  UserCheck,
  Plus,
} from 'lucide-react';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { Button } from '../Button';
import {
  api,
  getErrorMessage,
  type RecallDashboardResponse,
  type RecallActivityEvent,
} from '../../services/api';

const AGENT_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'Research Agent': Search,
  Memory: Brain,
  'Strategy Agent': TrendingUp,
  'Execution Agent': CheckCircle,
  User: UserCheck,
  Capture: Plus,
};

interface RecallOverviewProps {
  onSelectProspect: (id: string) => void;
}

export const RecallOverview: React.FC<RecallOverviewProps> = ({ onSelectProspect }) => {
  const [data, setData] = useState<RecallDashboardResponse | null>(null);
  const [activity, setActivity] = useState<RecallActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerProspectId, setAnswerProspectId] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashboardResult, activityResult] = await Promise.all([
        api.recall.getDashboard(),
        api.recall.getActivity(10),
      ]);
      setData(dashboardResult);
      setActivity(activityResult);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setIsAsking(true);
    setAnswer(null);
    setAnswerProspectId(null);
    try {
      const result = await api.recall.query(question.trim());
      setAnswer(result.answer);
      setAnswerProspectId(result.prospect_id ?? null);
    } catch (err) {
      setAnswer(getErrorMessage(err));
    } finally {
      setIsAsking(false);
    }
  };

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
          <p className="text-red-300 text-sm">{error ?? 'Unable to load RECALL dashboard'}</p>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-200 transition-colors flex-shrink-0"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </Card>
    );
  }

  const stats = [
    { title: 'Prospects', value: String(data.total_prospects), icon: Users, color: 'text-fuchsia-400' },
    { title: 'High Intent', value: String(data.high_intent), icon: Zap, color: 'text-emerald-400' },
    { title: 'Follow-ups Due', value: String(data.followups_today), icon: Clock, color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} variant="default" hover animated className="overflow-hidden group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-zinc-400 text-sm font-medium mb-2">{stat.title}</p>
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <Icon size={24} className={`${stat.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card variant="dark">
        <form onSubmit={handleAsk} className="flex items-center gap-3">
          <Search size={18} className="text-zinc-500 flex-shrink-0" />
          <input
            className="flex-1 bg-transparent text-white text-sm placeholder-zinc-500 focus:outline-none"
            placeholder="Ask RECALL — e.g. Why is Rahul high priority?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Button type="submit" variant="secondary" size="sm" loading={isAsking} disabled={isAsking}>
            Ask
          </Button>
        </form>
        {answer && (
          <div className="mt-4 pt-4 border-t border-zinc-700">
            <p className="text-zinc-200 text-sm">{answer}</p>
            {answerProspectId && (
              <button
                onClick={() => onSelectProspect(answerProspectId)}
                className="text-fuchsia-400 text-xs mt-2 hover:underline"
              >
                View prospect →
              </button>
            )}
          </div>
        )}
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Next Best Actions</h2>
          <Badge variant="info">{data.next_best_actions.length} pending</Badge>
        </div>
        <div className="space-y-3">
          {data.next_best_actions.length === 0 && (
            <Card variant="default">
              <p className="text-zinc-400 text-sm">No pending recommendations right now.</p>
            </Card>
          )}
          {data.next_best_actions.map((nba, i) => (
            <Card
              key={nba.prospect_id}
              variant="default"
              hover
              animated
              className="cursor-pointer animate-slideInFromLeft"
              style={{ animationDelay: `${i * 100}ms` }}
              onClick={() => onSelectProspect(nba.prospect_id)}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-white font-semibold">{nba.name}</p>
                  <p className="text-zinc-400 text-sm">{nba.action}</p>
                </div>
                <Badge variant="info" size="sm">View</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-fuchsia-400" />
          <h2 className="text-lg font-bold text-white">AI Insights</h2>
        </div>
        <Card variant="gradient">
          <ul className="space-y-2">
            {data.insights.map((insight, i) => (
              <li key={i} className="text-zinc-200 text-sm flex items-start gap-2">
                <span className="text-fuchsia-400 mt-1">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-fuchsia-400" />
          <h2 className="text-lg font-bold text-white">Agent Activity</h2>
        </div>
        <Card variant="dark">
          {activity.length === 0 ? (
            <p className="text-zinc-400 text-sm">No agent activity yet — add a prospect to start the loop.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((event) => {
                const Icon = AGENT_ICON[event.agent] ?? Sparkles;
                return (
                  <li key={event.id} className="flex items-start gap-3 text-sm">
                    <Icon size={16} className="text-fuchsia-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-zinc-200">
                        <span className="font-medium">{event.agent}</span> — {event.label}
                        <span className="text-zinc-500"> · {event.prospect_name}</span>
                      </p>
                      <p className="text-zinc-500 text-xs">
                        {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};
