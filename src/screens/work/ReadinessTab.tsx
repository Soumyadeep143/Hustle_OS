import { useEffect, useState } from 'react';
import { api, type CareerReadiness, type JobFitResult, type ReadinessRecommendations } from '../../services/api';
import { SectionLabel, ProgressBar } from '../../components/ui';
import { Button } from '../../components/Button';

const INPUT_CLASS =
  'flex-1 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]';

const IMPROVEMENT_LABEL: Record<string, string> = {
  skills: 'Skills',
  applications: 'Applications',
  interviews: 'Interviews',
  follow_ups: 'Follow-ups',
};

export function ReadinessTab() {
  const [readiness, setReadiness] = useState<CareerReadiness | null>(null);
  const [recommendations, setRecommendations] = useState<ReadinessRecommendations | null>(null);

  const [fitCompany, setFitCompany] = useState('');
  const [fitRole, setFitRole] = useState('');
  const [fitSalary, setFitSalary] = useState('');
  const [fitResult, setFitResult] = useState<JobFitResult | null>(null);
  const [calculatingFit, setCalculatingFit] = useState(false);

  useEffect(() => {
    api.assessment.getCareerReadiness().then(setReadiness).catch(() => setReadiness(null));
    api.assessment.getRecommendations().then(setRecommendations).catch(() => setRecommendations(null));
  }, []);

  const calculateFit = async () => {
    if (!fitCompany.trim() || !fitRole.trim() || !fitSalary.trim()) return;
    setCalculatingFit(true);
    try {
      const result = await api.assessment.getJobFit(fitCompany.trim(), fitRole.trim(), fitSalary.trim());
      setFitResult(result);
    } catch {
      setFitResult(null);
    } finally {
      setCalculatingFit(false);
    }
  };

  if (!readiness) {
    return <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-line-2)]" />;
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="flex items-end justify-between">
          <span className="font-[var(--font-display)] text-[52px] font-semibold leading-none tracking-[-.03em] text-[var(--color-ink)]">
            {readiness.score}
          </span>
          <span className="pb-1.5 text-[14.5px] font-medium text-[var(--color-ink)]">{readiness.level}</span>
        </div>
        <div className="mt-3">
          <ProgressBar percent={readiness.score} />
        </div>
        <div className="mt-4 flex flex-col gap-1.5">
          {readiness.details.map((d) => (
            <p key={d} className="text-[13px] leading-relaxed text-[var(--color-ink)]">
              {d}
            </p>
          ))}
        </div>
        {readiness.next_actions.length > 0 && (
          <div className="mt-4">
            <SectionLabel>NEXT ACTIONS</SectionLabel>
            <div className="mt-2 flex flex-col gap-1.5">
              {readiness.next_actions.map((a) => (
                <p key={a} className="text-[13px] leading-relaxed text-[var(--color-ink)]">
                  → {a}
                </p>
              ))}
            </div>
          </div>
        )}
      </section>

      {recommendations && (
        <section>
          <SectionLabel>WHERE TO IMPROVE</SectionLabel>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {Object.entries(recommendations.improvements).map(([key, imp]) => (
              <div key={key} className="rounded-[var(--radius-control)] border border-[var(--color-line)] p-3">
                <div className="flex items-baseline gap-1">
                  <span className="font-[var(--font-display)] text-[20px] font-semibold text-[var(--color-ink)]">
                    {imp.current}
                  </span>
                  <span className="text-[12px] text-[var(--color-ink-2)]">/ {imp.target} target</span>
                </div>
                <p className="mt-0.5 text-[11.5px] font-semibold uppercase tracking-[.1em] text-[var(--color-ink-3)]">
                  {IMPROVEMENT_LABEL[key] ?? key}
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-ink-2)]">{imp.action}</p>
              </div>
            ))}
          </div>

          {recommendations.quick_wins.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--color-ink-3)]">
                Quick wins
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                {recommendations.quick_wins.map((w) => (
                  <p key={w} className="text-[13px] leading-relaxed text-[var(--color-ink)]">
                    · {w}
                  </p>
                ))}
              </div>
            </div>
          )}

          {recommendations.resources.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {recommendations.resources.map((r) => (
                <span
                  key={r}
                  className="rounded-[var(--radius-chip)] px-2 py-1 text-[11px] text-[var(--color-ink-2)]"
                  style={{ background: 'var(--color-line-2)' }}
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <SectionLabel>JOB FIT CALCULATOR</SectionLabel>
        <p className="mt-1.5 text-[12.5px] text-[var(--color-ink-2)]">
          Score how well a specific opening matches your real profile.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <input value={fitCompany} onChange={(e) => setFitCompany(e.target.value)} placeholder="Company" className={INPUT_CLASS} />
          <div className="flex gap-2">
            <input value={fitRole} onChange={(e) => setFitRole(e.target.value)} placeholder="Role" className={INPUT_CLASS} />
            <input
              value={fitSalary}
              onChange={(e) => setFitSalary(e.target.value)}
              placeholder="Salary, e.g. 25-35L"
              className={INPUT_CLASS}
            />
          </div>
        </div>
        <Button
          variant="outline"
          fullWidth
          className="mt-2.5"
          onClick={calculateFit}
          loading={calculatingFit}
          disabled={!fitCompany.trim() || !fitRole.trim() || !fitSalary.trim()}
        >
          Calculate fit
        </Button>
        {fitResult && (
          <div className="mt-3 flex items-center justify-between rounded-[var(--radius-control)] border border-[var(--color-line)] p-3">
            <div>
              <div className="text-[13.5px] font-medium text-[var(--color-ink)]">
                {fitResult.role} at {fitResult.company}
              </div>
              <div className="text-[12px] text-[var(--color-ink-2)]">{fitResult.fit_level}</div>
            </div>
            <span className="font-[var(--font-mono)] text-[16px] font-semibold text-[var(--color-blue)]">
              {fitResult.fit_score}%
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
