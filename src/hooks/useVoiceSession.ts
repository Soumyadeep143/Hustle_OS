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
  const audioEl = useRef<HTMLAudioElement | null>(null);

  const stopMeter = () => {
    cancelAnimationFrame(raf.current);
    ctx.current?.close();
    ctx.current = null;
  };

  const teardown = useCallback(() => {
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
    async (blob: Blob) => {
      setState('thinking');
      try {
        const t = await api.voice.transcribe(blob);
        setTranscript(t.text);
        if (!t.text) {
          setState('idle');
          return;
        }

        const a = await api.voice.command(t.text);
        setAnswer(a.response);

        let url = a.audio_url;
        if (!url) {
          const ttsResult = await api.voice.tts(a.response);
          url = ttsResult.audio_url;
        }

        if (url) {
          setState('speaking');
          const el = new Audio(url);
          audioEl.current = el;
          el.onended = () => setState('idle');
          await el.play().catch(() => setState('idle'));
        } else {
          setState('speaking');
          window.setTimeout(() => setState('idle'), 1800);
        }
      } catch (e) {
        setError((e as Error).message);
        setState('idle');
      }
    },
    []
  );

  const start = useCallback(async () => {
    setError(null);
    setAnswer('');
    setTranscript('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      media.current = stream;

      const ac = new AudioContext();
      ctx.current = ac;
      const analyser = ac.createAnalyser();
      analyser.fftSize = 1024;
      ac.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
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
          silenceSince.current ??= now;
          if (now - silenceSince.current > 1200) stop();
        } else {
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
        void send(new Blob(chunks.current, { type: 'audio/webm' }));
      };
      mr.start(250);
      setState('listening');
    } catch {
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
