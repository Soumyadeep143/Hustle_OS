import { Link } from 'react-router-dom';
import { Sparkles, Mic, Radar, Briefcase, Users, Target } from 'lucide-react';
import { VoiceOrb } from '../components/VoiceOrb';
import { Button } from '../components/Button';

const FEATURES = [
  {
    Icon: Sparkles,
    title: 'AI Brief',
    body: 'One real sentence every morning, generated from your actual applications and tasks — never generic filler.',
  },
  {
    Icon: Mic,
    title: 'Voice AI',
    body: 'Talk naturally to create tasks, schedule events, or ask what matters today. One brain, across voice and chat.',
  },
  {
    Icon: Target,
    title: 'Focus',
    body: 'A real task list you can edit by voice, by chat, or by hand — always the same list, always in sync.',
  },
  {
    Icon: Radar,
    title: 'RECALL',
    body: 'Save any job post or link the moment you see it — automatic source detection, enrichment, and follow-up reminders.',
  },
  {
    Icon: Briefcase,
    title: 'Work',
    body: 'Track every application with live status, stale-follow-up alerts, and a match score — no spreadsheet required.',
  },
  {
    Icon: Users,
    title: 'Team intelligence',
    body: 'Capacity-aware task assignment and blocker detection, with AI recommendations you approve before they execute.',
  },
];

export function Landing() {
  return (
    <div className="min-h-dvh" style={{ background: 'var(--color-bg)' }}>
      <div className="mx-auto max-w-[1120px] px-6 pb-24" style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
        <header className="flex items-center justify-between py-6">
          <Wordmark />
          <nav className="flex items-center gap-5">
            <Link to="/login" className="text-[13.5px] font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">
              Sign in
            </Link>
            <Link to="/signup">
              <Button size="sm" variant="primary" rounded>
                Get started
              </Button>
            </Link>
          </nav>
        </header>

        <section className="grid items-center gap-10 pt-6 pb-20 md:grid-cols-[1.05fr_0.95fr] md:pt-14 md:pb-28">
          <div style={{ animation: 'hosUp 620ms cubic-bezier(.22,1,.36,1) both' }}>
            <span className="text-[11px] font-semibold tracking-[.2em] text-[var(--color-blue)]">
              ✦ THE AI OS FOR YOUR HUSTLE
            </span>
            <h1 className="mt-4 font-[var(--font-display)] text-[40px] font-semibold leading-[1.05] tracking-[-.03em] text-[var(--color-ink)] sm:text-[52px]">
              Your work,
              <br />
              actually organized.
            </h1>
            <p className="mt-5 max-w-[440px] text-[16px] leading-relaxed text-[var(--color-ink-2)]">
              One conversational brain across voice, chat, tasks, and your team. Ask it what matters
              today — it answers from your real data, not a script.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/signup">
                <Button size="lg" variant="primary" rounded>
                  Get started free
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" rounded>
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex justify-center md:justify-end" style={{ animation: 'hosFade 900ms ease 120ms both' }}>
            <VoiceOrb state="idle" />
          </div>
        </section>

        <section>
          <div className="mb-8 text-center md:text-left">
            <span className="text-[11px] font-semibold tracking-[.2em] text-[var(--color-blue)]">
              ✦ EVERYTHING, ONE BRAIN
            </span>
            <h2 className="mt-2 font-[var(--font-display)] text-[26px] font-semibold text-[var(--color-ink)]">
              Six real systems. Zero busywork.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, title, body }, i) => (
              <div
                key={title}
                className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
                style={{ boxShadow: 'var(--shadow-card)', animation: `hosUp 560ms cubic-bezier(.22,1,.36,1) ${i * 70}ms both` }}
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)]"
                  style={{ background: 'var(--color-blue-soft)' }}
                >
                  <Icon size={18} className="text-[var(--color-blue)]" />
                </div>
                <h3 className="mt-3.5 font-[var(--font-display)] text-[16px] font-semibold text-[var(--color-ink)]">
                  {title}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--color-ink-2)]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          className="mt-20 rounded-[var(--radius-card)] border border-[var(--color-line)] p-8 text-center"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
        >
          <h2 className="font-[var(--font-display)] text-[24px] font-semibold text-[var(--color-ink)]">
            Ready to actually get things done?
          </h2>
          <div className="mt-2 flex justify-center">
            <p className="max-w-[420px] text-[13.5px] text-[var(--color-ink-2)]">
              No filler tasks, no seeded fake data — HustleOS runs on what's really yours from the first
              minute.
            </p>
          </div>
          <div className="mt-6 flex justify-center">
            <Link to="/signup">
              <Button size="lg" variant="primary" rounded>
                Create your account
              </Button>
            </Link>
          </div>
        </section>

        <footer className="mt-14 flex items-center justify-between text-[12px] text-[var(--color-ink-3)]">
          <span>© {new Date().getFullYear()} HustleOS</span>
          <Link to="/login" className="text-[var(--color-ink-3)] hover:text-[var(--color-ink)]">
            Sign in →
          </Link>
        </footer>
      </div>
    </div>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-7 w-7 items-center justify-center rounded-[8px]"
        style={{ background: 'var(--color-blue)' }}
      >
        <span className="text-[13px] font-bold text-white">✦</span>
      </div>
      <span className="font-[var(--font-display)] text-[16px] font-semibold tracking-[-.01em] text-[var(--color-ink)]">
        HustleOS
      </span>
    </div>
  );
}
