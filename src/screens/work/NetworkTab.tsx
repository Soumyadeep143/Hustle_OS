import { useEffect, useState } from 'react';
import {
  api,
  type CampaignPlan,
  type DreamCompany,
  type LinkedInPostResult,
  type LinkedInRecruiterResult,
} from '../../services/api';
import { SectionLabel, Chip } from '../../components/ui';
import { Button } from '../../components/Button';
import type { Tone } from '../../lib/types';

const INPUT_CLASS =
  'flex-1 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]';

const PRIORITY_TONE: Record<string, Tone> = { High: 'green', Medium: 'yellow', Low: 'neutral' };

export function NetworkTab() {
  // -- dream companies --
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [companies, setCompanies] = useState<DreamCompany[] | null>(null);
  const [searchingCompanies, setSearchingCompanies] = useState(false);

  // -- campaign plan --
  const [campaignCompany, setCampaignCompany] = useState('');
  const [campaignRole, setCampaignRole] = useState('');
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  // -- linkedin recruiters --
  const [recruiterCompany, setRecruiterCompany] = useState('');
  const [recruiterRole, setRecruiterRole] = useState('');
  const [recruiterLocation, setRecruiterLocation] = useState('');
  const [recruiters, setRecruiters] = useState<LinkedInRecruiterResult[] | null>(null);
  const [searchingRecruiters, setSearchingRecruiters] = useState(false);
  const [dmDrafts, setDmDrafts] = useState<Record<string, string>>({});
  const [draftingFor, setDraftingFor] = useState<string | null>(null);

  // -- linkedin post --
  const [postTopic, setPostTopic] = useState('');
  const [post, setPost] = useState<LinkedInPostResult | null>(null);
  const [generatingPost, setGeneratingPost] = useState(false);

  // -- profile tips --
  const [profileTips, setProfileTips] = useState<string[] | null>(null);

  useEffect(() => {
    api.linkedin.getProfileTips().then((r) => setProfileTips(r.tips)).catch(() => setProfileTips([]));
  }, []);

  const searchCompanies = async () => {
    if (!role.trim() || !location.trim()) return;
    setSearchingCompanies(true);
    try {
      const { companies } = await api.outreach.findDreamCompanies(role.trim(), location.trim());
      setCompanies(companies);
    } catch {
      setCompanies([]);
    } finally {
      setSearchingCompanies(false);
    }
  };

  const useCompanyForCampaign = (company: DreamCompany) => {
    setCampaignCompany(company.name);
    setCampaignRole(role.trim() || campaignRole);
  };

  const generatePlan = async () => {
    if (!campaignCompany.trim() || !campaignRole.trim()) return;
    setGeneratingPlan(true);
    try {
      const result = await api.outreach.getCampaignPlan(campaignCompany.trim(), campaignRole.trim());
      setPlan(result);
    } catch {
      setPlan(null);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const searchRecruiters = async () => {
    if (!recruiterCompany.trim()) return;
    setSearchingRecruiters(true);
    try {
      const { recruiters } = await api.linkedin.findRecruiters(recruiterCompany.trim(), recruiterLocation.trim() || 'Bengaluru');
      setRecruiters(recruiters);
      setDmDrafts({});
    } catch {
      setRecruiters([]);
    } finally {
      setSearchingRecruiters(false);
    }
  };

  const draftDm = async (recruiter: LinkedInRecruiterResult) => {
    setDraftingFor(recruiter.name);
    try {
      const result = await api.linkedin.generateDm(recruiter, recruiterRole.trim() || role.trim());
      setDmDrafts((prev) => ({ ...prev, [recruiter.name]: result.dm }));
    } catch {
      setDmDrafts((prev) => ({ ...prev, [recruiter.name]: 'Could not generate a draft — try again.' }));
    } finally {
      setDraftingFor(null);
    }
  };

  const generatePost = async () => {
    if (!postTopic.trim()) return;
    setGeneratingPost(true);
    try {
      const result = await api.linkedin.generatePost(postTopic.trim());
      setPost(result);
    } catch {
      setPost(null);
    } finally {
      setGeneratingPost(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionLabel>FIND DREAM COMPANIES</SectionLabel>
        <p className="mt-1.5 text-[12.5px] text-[var(--color-ink-2)]">
          Real companies likely hiring for your target role, ranked by reach — no invented figures.
        </p>
        <div className="mt-3 flex gap-2">
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Target role" className={INPUT_CLASS} />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className={INPUT_CLASS}
          />
        </div>
        <Button
          variant="outline"
          fullWidth
          className="mt-2.5"
          onClick={searchCompanies}
          loading={searchingCompanies}
          disabled={!role.trim() || !location.trim()}
        >
          Search
        </Button>

        {companies && (
          <div className="mt-4 flex flex-col gap-3">
            {companies.map((c) => (
              <div
                key={c.name}
                className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-[var(--color-ink)]">
                    {c.name}
                  </span>
                  <span className="shrink-0 font-[var(--font-mono)] text-[12px] font-medium text-[var(--color-blue)]">
                    {c.reach_score}% reach
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--color-ink-2)]">
                  {c.size} employees · {c.stage}
                  {c.salary_range ? ` · ${c.salary_range}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.hiring && <Chip tone="green">Hiring now</Chip>}
                  {c.fit_signals.slice(0, 2).map((s) => (
                    <Chip key={s} tone="blue">
                      {s}
                    </Chip>
                  ))}
                </div>
                <button
                  onClick={() => useCompanyForCampaign(c)}
                  className="mt-2.5 text-[12.5px] font-medium text-[var(--color-blue)]"
                >
                  Build a campaign for this company →
                </button>
              </div>
            ))}
            {companies.length === 0 && (
              <p className="py-2 text-[13px] text-[var(--color-ink-2)]">No companies found — try a broader search.</p>
            )}
          </div>
        )}
      </section>

      <section>
        <SectionLabel>BUILD OUTREACH CAMPAIGN</SectionLabel>
        <p className="mt-1.5 text-[12.5px] text-[var(--color-ink-2)]">
          A 14-day plan: hiring contacts, a 5-email sequence, and your real fit signals.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={campaignCompany}
            onChange={(e) => setCampaignCompany(e.target.value)}
            placeholder="Company"
            className={INPUT_CLASS}
          />
          <input
            value={campaignRole}
            onChange={(e) => setCampaignRole(e.target.value)}
            placeholder="Role"
            className={INPUT_CLASS}
          />
        </div>
        <Button
          variant="outline"
          fullWidth
          className="mt-2.5"
          onClick={generatePlan}
          loading={generatingPlan}
          disabled={!campaignCompany.trim() || !campaignRole.trim()}
        >
          Generate plan
        </Button>

        {plan && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {plan.fit_signals.slice(0, 3).map((s) => (
                  <Chip key={s} tone="blue">
                    {s}
                  </Chip>
                ))}
              </div>
              <span className="shrink-0 font-[var(--font-mono)] text-[12px] font-medium text-[var(--color-blue)]">
                {plan.reach_score}% reach
              </span>
            </div>

            {plan.hiring_managers.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--color-ink-3)]">
                  Hiring contacts
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {plan.hiring_managers.map((m) => (
                    <div key={m.name} className="text-[13px] text-[var(--color-ink)]">
                      <span className="font-medium">{m.name}</span>
                      <span className="text-[var(--color-ink-2)]"> · {m.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--color-ink-3)]">
                {plan.campaign_duration_days}-day sequence · {plan.total_touchpoints} emails
              </div>
              <div className="mt-2 flex flex-col gap-3">
                {plan.email_sequence.map((email) => (
                  <div key={email.day} className="rounded-[var(--radius-control)] border border-[var(--color-line)] p-3">
                    <div className="flex items-center gap-2 text-[11.5px] font-medium text-[var(--color-blue)]">
                      <span>Day {email.day}</span>
                      <span className="text-[var(--color-ink-3)]">·</span>
                      <span className="uppercase tracking-[.08em]">{email.type.replace('_', ' ')}</span>
                    </div>
                    <p className="mt-1 text-[13px] font-medium text-[var(--color-ink)]">{email.subject}</p>
                    <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--color-ink-2)]">
                      {email.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section>
        <SectionLabel>LINKEDIN RECRUITERS</SectionLabel>
        <p className="mt-1.5 text-[12.5px] text-[var(--color-ink-2)]">
          Likely hiring-contact roles at a company — role descriptors only, never a guessed real identity.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={recruiterCompany}
            onChange={(e) => setRecruiterCompany(e.target.value)}
            placeholder="Company"
            className={INPUT_CLASS}
          />
          <input
            value={recruiterRole}
            onChange={(e) => setRecruiterRole(e.target.value)}
            placeholder="Your target role"
            className={INPUT_CLASS}
          />
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={recruiterLocation}
            onChange={(e) => setRecruiterLocation(e.target.value)}
            placeholder="Location (default Bengaluru)"
            className={INPUT_CLASS}
          />
        </div>
        <Button
          variant="outline"
          fullWidth
          className="mt-2.5"
          onClick={searchRecruiters}
          loading={searchingRecruiters}
          disabled={!recruiterCompany.trim()}
        >
          Find recruiters
        </Button>

        {recruiters && (
          <div className="mt-4 flex flex-col gap-3">
            {recruiters.map((r) => (
              <div
                key={r.name}
                className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-[var(--color-ink)]">{r.name}</div>
                    <div className="truncate text-[12px] text-[var(--color-ink-2)]">{r.title}</div>
                  </div>
                  <Chip tone={PRIORITY_TONE[r.priority] ?? 'neutral'}>{r.priority}</Chip>
                </div>
                <p className="mt-1.5 text-[12px] text-[var(--color-ink-2)]">{r.reason}</p>
                {dmDrafts[r.name] ? (
                  <p className="mt-2.5 whitespace-pre-wrap rounded-[var(--radius-control)] p-2.5 text-[12.5px] leading-relaxed text-[var(--color-ink)]" style={{ background: 'var(--color-raised)' }}>
                    {dmDrafts[r.name]}
                  </p>
                ) : (
                  <button
                    onClick={() => draftDm(r)}
                    disabled={draftingFor === r.name}
                    className="mt-2.5 text-[12.5px] font-medium text-[var(--color-blue)] disabled:opacity-50"
                  >
                    {draftingFor === r.name ? 'Drafting…' : 'Draft a DM →'}
                  </button>
                )}
              </div>
            ))}
            {recruiters.length === 0 && (
              <p className="py-2 text-[13px] text-[var(--color-ink-2)]">No results — try another company.</p>
            )}
          </div>
        )}
      </section>

      <section>
        <SectionLabel>LINKEDIN POST</SectionLabel>
        <div className="mt-3 flex gap-2">
          <input
            value={postTopic}
            onChange={(e) => setPostTopic(e.target.value)}
            placeholder="Topic, e.g. 'shipping a side project'"
            className={INPUT_CLASS}
          />
        </div>
        <Button
          variant="outline"
          fullWidth
          className="mt-2.5"
          onClick={generatePost}
          loading={generatingPost}
          disabled={!postTopic.trim()}
        >
          Generate post
        </Button>
        {post && (
          <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5">
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--color-ink)]">{post.post}</p>
            <div className="mt-3 flex flex-col gap-1">
              {post.tips.map((tip) => (
                <p key={tip} className="text-[11.5px] text-[var(--color-ink-3)]">
                  · {tip}
                </p>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <SectionLabel>PROFILE TIPS</SectionLabel>
        <div className="mt-3 flex flex-col gap-1.5">
          {(profileTips ?? []).map((tip) => (
            <p key={tip} className="text-[13px] leading-relaxed text-[var(--color-ink)]">
              {tip}
            </p>
          ))}
          {profileTips?.length === 0 && <p className="text-[13px] text-[var(--color-ink-2)]">No tips right now.</p>}
        </div>
      </section>
    </div>
  );
}
