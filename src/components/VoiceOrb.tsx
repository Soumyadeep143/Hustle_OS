import type { VoiceState } from '../hooks/useVoiceSession';

const T: Record<
  VoiceState,
  {
    breathe: string;
    a: string;
    b: string;
    c: string;
    glow: string;
    core: number;
    eq: number;
    red: number;
  }
> = {
  idle: { breathe: '4s', a: '11s', b: '13s', c: '15s', glow: '3.4s', core: 0.45, eq: 0.2, red: 0.2 },
  listening: { breathe: '3.4s', a: '9s', b: '11s', c: '13s', glow: '2.8s', core: 0.55, eq: 1, red: 0.22 },
  thinking: { breathe: '2.1s', a: '6s', b: '7.5s', c: '13s', glow: '2.8s', core: 0.55, eq: 0.25, red: 0.42 },
  speaking: { breathe: '1.5s', a: '4.5s', b: '5.5s', c: '6.5s', glow: '1.4s', core: 0.85, eq: 1, red: 0.42 },
};

export function VoiceOrb({
  state,
  level = 0,
  onTap,
}: {
  state: VoiceState;
  level?: number;
  onTap?: () => void;
}) {
  const t = T[state];
  const scale = 1 + level * 0.12;

  return (
    <div className="relative flex h-[270px] w-[270px] items-center justify-center" onClick={onTap}>
      {[0, 1.13, 2.26].map((d) => (
        <span
          key={d}
          className="absolute h-[210px] w-[210px] rounded-full border border-[var(--color-blue)] opacity-35"
          style={{ animation: `hosRipple 3.4s ease-out ${d}s infinite` }}
        />
      ))}
      <span
        className="absolute h-[250px] w-[250px] rounded-full"
        style={{
          background: 'radial-gradient(circle,var(--color-blue-soft) 0%,transparent 68%)',
          animation: `hosGlow ${t.glow} ease-in-out infinite`,
        }}
      />
      <div
        className="relative h-[196px] w-[196px]"
        style={{
          animation: `hosBreathe ${t.breathe} ease-in-out infinite`,
          transform: `scale(${scale})`,
          transition: 'transform 90ms linear',
        }}
      >
        <div
          className="absolute inset-0 opacity-95"
          style={{
            background: 'radial-gradient(circle at 34% 30%,var(--color-blue) 0%,transparent 68%)',
            filter: 'blur(16px)',
            animation: `hosMorph ${t.a} ease-in-out infinite`,
          }}
        />
        <div
          className="absolute inset-[14px] opacity-60"
          style={{
            background: 'radial-gradient(circle at 68% 62%,var(--color-yellow-ink) 0%,transparent 64%)',
            filter: 'blur(20px)',
            animation: `hosMorphRev ${t.b} ease-in-out infinite`,
          }}
        />
        <div
          className="absolute inset-[26px] transition-opacity duration-500"
          style={{
            background: 'radial-gradient(circle at 40% 72%,var(--color-red) 0%,transparent 62%)',
            filter: 'blur(22px)',
            opacity: t.red,
            animation: `hosMorph ${t.c} ease-in-out infinite`,
          }}
        />
        <div
          className="absolute inset-[44px]"
          style={{
            background: 'radial-gradient(circle at 46% 40%,rgba(255,255,255,.92) 0%,transparent 70%)',
            filter: 'blur(10px)',
            opacity: t.core,
            animation: 'hosDrift 4.6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: 'inset 0 0 40px 6px var(--color-blue-soft)' }}
        />
      </div>
      <div
        className="absolute bottom-1.5 flex h-[26px] items-end gap-[3px] transition-opacity duration-500"
        style={{ opacity: t.eq }}
      >
        {Array.from({ length: 22 }, (_, i) => (
          <span
            key={i}
            className="w-[2.5px] rounded-full opacity-70"
            style={{
              height: 26,
              background: 'var(--color-ink)',
              transformOrigin: 'bottom',
              animation: `hosWave ${700 + ((i * 137) % 520)}ms ease-in-out ${(i * 83) % 700}ms infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
