import React, { useEffect, useState } from 'react';
import { ArrowLeft, Brain, CheckCircle, RefreshCw } from 'lucide-react';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { api, getErrorMessage, type RecallProspect } from '../../services/api';

interface ProspectDetailProps {
  prospectId: string;
  onBack: () => void;
}

const intentVariant = (intent: string): 'success' | 'warning' | 'default' | 'info' => {
  if (intent === 'high') return 'success';
  if (intent === 'medium') return 'warning';
  if (intent === 'low') return 'default';
  return 'info';
};

export const ProspectDetail: React.FC<ProspectDetailProps> = ({ prospectId, onBack }) => {
  const [prospect, setProspect] = useState<RecallProspect | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ text: string; executedBy: string } | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.recall.getProspect(prospectId);
      setProspect(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setLastResult(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospectId]);

  const handleApprove = async () => {
    setIsApproving(true);
    setApproveError(null);
    try {
      const result = await api.recall.approve(prospectId);
      setProspect(result.prospect);
      setLastResult({ text: result.result, executedBy: result.executed_by });
    } catch (err) {
      setApproveError(getErrorMessage(err));
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <Card variant="dark" className="border-l-4 border-l-red-500">
        <div className="flex items-center justify-between gap-4">
          <p className="text-red-300 text-sm">{error ?? 'Prospect not found'}</p>
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

  return (
    <div className="space-y-6 animate-fadeIn">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <Card variant="gradient">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{prospect.name}</h2>
            <p className="text-zinc-300">
              {prospect.role ? `${prospect.role} · ` : ''}
              {prospect.company}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <Badge variant={intentVariant(prospect.intent)} size="md">
              {prospect.relationship.replace('_', ' ')}
            </Badge>
            <p className="text-3xl font-bold text-fuchsia-300 mt-2">{prospect.lead_score}</p>
            <p className="text-xs text-zinc-400">Lead Score</p>
          </div>
        </div>
      </Card>

      <Card variant="default" className="border-l-4 border-l-fuchsia-500">
        <h3 className="text-white font-semibold mb-2">Next Best Action</h3>
        {prospect.next_best_action ? (
          <>
            <p className="text-zinc-200 mb-2">{prospect.next_best_action.action}</p>
            <p className="text-zinc-400 text-sm mb-4">Why: {prospect.next_best_action.reason}</p>
            {approveError && <p className="text-red-300 text-sm mb-3">{approveError}</p>}
            <Button variant="success" icon={<CheckCircle size={16} />} loading={isApproving} onClick={handleApprove}>
              Approve & Execute
            </Button>
          </>
        ) : (
          <p className="text-zinc-400 text-sm">No recommendation pending right now.</p>
        )}

        {lastResult && (
          <div className="mt-4 pt-4 border-t border-zinc-700">
            <p className="text-xs text-zinc-500 mb-1">
              Executed via <span className="text-zinc-300">{lastResult.executedBy}</span>
            </p>
            <p className="text-zinc-300 text-sm whitespace-pre-wrap">{lastResult.text}</p>
          </div>
        )}
      </Card>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Brain size={18} className="text-fuchsia-400" />
          <h3 className="text-white font-semibold">Memory</h3>
        </div>
        <Card variant="dark">
          {prospect.memory.length === 0 ? (
            <p className="text-zinc-400 text-sm">No memory stored yet.</p>
          ) : (
            <ul className="space-y-2">
              {prospect.memory.map((fact) => (
                <li key={fact.id} className="text-sm text-zinc-200 flex items-start gap-2">
                  <Badge variant={fact.type === 'fact' ? 'info' : 'default'} size="sm">
                    {fact.type}
                  </Badge>
                  <span>{fact.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div>
        <h3 className="text-white font-semibold mb-3">Timeline</h3>
        <Card variant="dark">
          <ul className="space-y-3">
            {prospect.timeline
              .slice()
              .reverse()
              .map((event) => (
                <li key={event.id} className="flex items-start gap-3 text-sm">
                  <span className="text-zinc-500 whitespace-nowrap">
                    {new Date(event.created_at).toLocaleDateString()}
                  </span>
                  <div>
                    <p className="text-zinc-200">{event.label}</p>
                    {event.detail && <p className="text-zinc-500 text-xs">{event.detail}</p>}
                  </div>
                </li>
              ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};
