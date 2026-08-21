import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export function useVoiceSession() {
  const [state, setState] = useState<VoiceState>('idle');
  const [level, setLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);

  const media = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const raf = useRef(0);
  const chunks = useRef<Blob[]>([]);
  const silenceSince = useRef<number | null>(null);
  const hasSpoken = useRef(false);
  const audioEl = useRef<HTMLAudioElement | null>(null);

  // Bumped on every teardown so any in-flight async work from a previous
  // session (e.g. a React StrictMode double-invoked mount) can detect it's
  // stale and bail out instead of racing with the current session's state.
  const epoch = useRef(0);

  const stopMeter = () => {
    cancelAnimationFrame(raf.current);
    ctx.current?.close();
    ctx.current = null;
  };

  const teardown = useCallback(() => {
    epoch.current += 1;
    stopMeter();
    if (rec.current?.state === 'recording') rec.current.stop();
    media.current?.getTracks().forEach((t) => t.stop());
    media.current = null;
    rec.current = null;
    audioEl.current?.pause();
    setLevel(0);
  }, []);

  useEffect(() => teardown, [teardown]);

  const send = useCallback(
    async (blob: Blob, myEpoch: number) => {
      setState('thinking');
      try {
        const t = await api.voice.transcribe(blob);
        if (epoch.current !== myEpoch) return;
        setTranscript(t.text);
        if (!t.text) {
          setState('idle');
          return;
        }

        const a = await api.voice.command(t.text);
        if (epoch.current !== myEpoch) return;
        setAnswer(a.response);

        let url = a.audio_url;
        if (!url) {
          const ttsResult = await api.voice.tts(a.response);
          if (epoch.current !== myEpoch) return;
          url = ttsResult.audio_url;
        }

        // Continuous conversation: once the response finishes playing, go
        // straight back into listening instead of idling — the session only
        // truly ends when the user taps the X/End button (teardown bumps
        // epoch, so this restart is a no-op if that already happened).
        if (url) {
          setState('speaking');
          const el = new Audio(url);
          audioEl.current = el;
          el.onended = () => {
            if (epoch.current === myEpoch) void start();
          };
          await el.play().catch(() => {
            if (epoch.current === myEpoch) void start();
          });
        } else {
          setState('speaking');
          window.setTimeout(() => {
            if (epoch.current === myEpoch) void start();
          }, 1800);
        }
      } catch (e) {
        if (epoch.current !== myEpoch) return;
        setError((e as Error).message);
        setState('idle');
      }
    },
    []
  );

  const start = useCallback(async () => {
    const myEpoch = ++epoch.current;
    setError(null);
    setAnswer('');
    setTranscript('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (epoch.current !== myEpoch) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      media.current = stream;

      const ac = new AudioContext();
      ctx.current = ac;
      // A fresh AudioContext can start 'suspended' depending on the browser's
      // autoplay/activation policy — while suspended, the analyser reads back
      // silence even though the mic is live, so the level meter and silence
      // detection would never see real speech at all.
      if (ac.state === 'suspended') void ac.resume();

      const analyser = ac.createAnalyser();
      analyser.fftSize = 1024;
      ac.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      silenceSince.current = null;
      hasSpoken.current = false;
      const tick = () => {
        if (epoch.current !== myEpoch) return;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.min(1, Math.sqrt(sum / buf.length) * 3.2);
        setLevel(rms);
        document.documentElement.style.setProperty('--voice-level', rms.toFixed(3));

        const now = performance.now();
        if (rms < 0.06) {
          // Only arm the auto-stop once the user has actually said something —
          // otherwise the initial quiet moment before they start talking would
          // trip the same 1.2s timer and cut the recording before it begins.
          if (hasSpoken.current) {
            silenceSince.current ??= now;
            if (now - silenceSince.current > 1200) stop();
          }
        } else {
          hasSpoken.current = true;
          silenceSince.current = null;
        }

        raf.current = requestAnimationFrame(tick);
      };
      tick();

      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      rec.current = mr;
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        stopMeter();
        if (epoch.current !== myEpoch) return;
        void send(new Blob(chunks.current, { type: 'audio/webm' }), myEpoch);
      };
      mr.start(250);
      setState('listening');
    } catch {
      if (epoch.current !== myEpoch) return;
      setError('Microphone access is needed for voice');
      setState('idle');
    }
  }, [send]);

  const stop = useCallback(() => {
    if (rec.current?.state === 'recording') rec.current.stop();
    media.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const interrupt = useCallback(() => {
    audioEl.current?.pause();
    void start();
  }, [start]);

  return {
    state,
    level,
    transcript,
    answer,
    error,
    start,
    stop,
    interrupt,
    close: teardown,
  };
}
