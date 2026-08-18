import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw, X } from 'lucide-react';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { api, getErrorMessage, type RecallProspectSummary } from '../../services/api';

interface ProspectListProps {
  onSelectProspect: (id: string) => void;
}

const intentVariant = (intent: string): 'success' | 'warning' | 'default' | 'info' => {
  if (intent === 'high') return 'success';
  if (intent === 'medium') return 'warning';
  if (intent === 'low') return 'default';
  return 'info';
};

const emptyForm = { name: '', company: '', role: '', email: '', source_url: '', notes: '' };

export const ProspectList: React.FC<ProspectListProps> = ({ onSelectProspect }) => {
  const [prospects, setProspects] = useState<RecallProspectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.recall.listProspects();
      setProspects(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.company.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await api.recall.createProspect({
        name: form.name.trim(),
        company: form.company.trim(),
        role: form.role.trim() || undefined,
        email: form.email.trim() || undefined,
        source_url: form.source_url.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      await load();
      onSelectProspect(created.id);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Prospects</h2>
        <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Add Prospect'}
        </Button>
      </div>

      {showForm && (
        <Card variant="dark">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Name *</label>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-fuchsia-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Company *</label>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-fuchsia-500"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Role</label>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-fuchsia-500"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Email</label>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-fuchsia-500"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Source URL</label>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-fuchsia-500"
                  value={form.source_url}
                  onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                  placeholder="LinkedIn / company URL"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Notes</label>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-fuchsia-500"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Anything you already know"
                />
              </div>
            </div>

            {submitError && (
              <p className="text-red-300 text-sm flex items-center gap-2">
                <X size={14} /> {submitError}
              </p>
            )}

            <Button type="submit" variant="success" loading={isSubmitting} disabled={isSubmitting}>
              Create & Research
            </Button>
          </form>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && error && (
        <Card variant="dark" className="border-l-4 border-l-red-500">
          <div className="flex items-center justify-between gap-4">
            <p className="text-red-300 text-sm">{error}</p>
            <button
              onClick={load}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-200 transition-colors flex-shrink-0"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        </Card>
      )}

      {!isLoading && !error && (
        <div className="space-y-3">
          {prospects.length === 0 && (
            <Card variant="default">
              <p className="text-zinc-400 text-sm">No prospects yet. Add one to start the RECALL loop.</p>
            </Card>
          )}
          {prospects.map((p) => (
            <Card
              key={p.id}
              variant="dark"
              hover
              className="cursor-pointer group"
              onClick={() => onSelectProspect(p.id)}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white group-hover:text-fuchsia-400 transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {p.role ? `${p.role} · ` : ''}
                    {p.company}
                  </p>
                  {p.next_best_action && (
                    <p className="text-xs text-zinc-500 mt-1">Next: {p.next_best_action}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={intentVariant(p.intent)} size="sm">
                    {p.intent} intent
                  </Badge>
                  <Badge variant="info" size="sm">
                    {p.lead_score}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
