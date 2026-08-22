import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { useUi } from '../store/useUi';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

// Safari/iOS's MediaRecorder does not support 'audio/webm' at all -- passing
// it throws synchronously, which previously crashed start() and surfaced as
// a misleading "Microphone access is needed" error on any Apple device, even
// with mic permission granted. Feature-detect a format the current browser
// actually supports instead of hardcoding one.
function pickRecorderMime(): { mimeType?: string; ext: string } {
  const candidates: { mimeType: string; ext: string }[] = [
    { mimeType: 'audio/webm;codecs=opus', ext: 'webm' },
    { mimeType: 'audio/webm', ext: 'webm' },
    { mimeType: 'audio/mp4;codecs=mp4a.40.2', ext: 'm4a' },
    { mimeType: 'audio/mp4', ext: 'm4a' },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c.mimeType)) {
      return c;
    }
  }
  // Let the browser fall back to its own default encoder (some Safari
  // versions only work with no explicit mimeType at all).
  return { mimeType: undefined, ext: 'webm' };
}

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

  const getAudioEl = () => {
    // Reuse one <audio> element across the whole session rather than
    // `new Audio(url)` per turn — mobile browsers (Safari in particular)
    // are more reliable about honoring a later programmatic .play() when
    // it's called on an element that has already played once, versus a
    // freshly constructed one several async hops away from the tap that
    // opened Voice mode.
    if (!audioEl.current) {
      audioEl.current = new Audio();
    }
    return audioEl.current;
  };

  const send = useCallback(
    async (blob: Blob, myEpoch: number, filename: string) => {
      setState('thinking');
      try {
        const t = await api.voice.transcribe(blob, filename);
        if (epoch.current !== myEpoch) return;
        setTranscript(t.text);
        if (!t.text) {
          // Surface *why* nothing happened instead of silently going idle —
          // a real STT failure (e.g. an invalidated API key) previously
          // looked identical to "the user said nothing", with no way to
          // tell the two apart from the UI. Still auto-resume listening
          // after a beat either way: the session should keep going on its
          // own through a transient hiccup, same as a real answer would —
          // it only truly ends when the user taps Stop/End (epoch check
          // below makes this a no-op if that already happened).
          setError(t.error ? `Voice error: ${t.error}` : null);
          setState('idle');
          window.setTimeout(() => {
            if (epoch.current === myEpoch) void start();
          }, t.error ? 2500 : 300);
          return;
        }
        setError(null);

        // Skip audio on the main call — TTS is the slowest, most
        // failure-prone part of a turn (external API call, big payload),
        // and there's no reason the text reply should wait on it. It's
        // fetched separately below, and a failure there degrades to
        // silent (no audio) rather than losing the whole turn.
        const a = await api.voice.command(t.text, undefined, false);
        if (epoch.current !== myEpoch) return;
        setAnswer(a.response);
        // The assistant may have just created a task via its create_task
        // tool -- that write lands straight in Postgres, so the FOCUS list
        // needs an explicit refresh or it silently never shows up.
        void useUi.getState().refreshTasks();

        let url: string | null = null;
        try {
          const ttsResult = await api.voice.tts(a.response);
          if (epoch.current !== myEpoch) return;
          url = ttsResult.audio_url;
        } catch {
          // TTS failed or timed out — the text answer already landed via
          // setAnswer above, so fall through to the silent branch below
          // instead of erroring out a turn that actually succeeded.
        }

        // Continuous conversation: once the response finishes playing, go
        // straight back into listening instead of idling — the session only
        // truly ends when the user taps the X/End button (teardown bumps
        // epoch, so this restart is a no-op if that already happened).
        if (url) {
          setState('speaking');
          const el = getAudioEl();
          el.src = url;
          el.onended = () => {
            if (epoch.current === myEpoch) void start();
          };
          try {
            await el.play();
          } catch {
            // Playback blocked (e.g. a mobile autoplay policy) — don't strand
            // the session silently, keep the loop going.
            if (epoch.current === myEpoch) void start();
          }
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

      const { mimeType, ext } = pickRecorderMime();
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const usedMime = mr.mimeType || mimeType || 'audio/webm';
      rec.current = mr;
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        stopMeter();
        if (epoch.current !== myEpoch) return;
        void send(new Blob(chunks.current, { type: usedMime }), myEpoch, `recording.${ext}`);
      };
      mr.start(250);
      setState('listening');
    } catch (e) {
      if (epoch.current !== myEpoch) return;
      // Distinguish "browser/OS denied the mic" from "recording failed to
      // start for some other reason" (e.g. an unsupported format slipping
      // through) rather than always blaming permissions.
      const name = (e as DOMException)?.name;
      setError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Microphone access is needed for voice'
          : `Voice error: ${(e as Error)?.message || 'could not start recording'}`
      );
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
