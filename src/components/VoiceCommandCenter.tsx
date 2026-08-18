import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { Card } from './Card';
import { getErrorMessage } from '../services/api';
import { useVoiceStore } from '../store/voiceStore';
import { useVoiceSession } from '../hooks/useVoiceSession';
import { VoiceOrb } from './VoiceOrb';

interface VoiceCommandCenterProps {
  onCommand?: (command: string) => void;
}

const QUICK_COMMANDS = [
  'Find AI jobs',
  'Show status',
  'Daily plan',
  'Who to follow up',
  'Apply to top 3',
];

export const VoiceCommandCenter: React.FC<VoiceCommandCenterProps> = ({ onCommand }) => {
  const { addToHistory } = useVoiceStore();
  const { state, level, transcript, answer, error, start, stop, interrupt } = useVoiceSession();

  const handleOrbTap = () => {
    if (state === 'idle') {
      start();
    } else if (state === 'listening') {
      stop();
    } else if (state === 'speaking') {
      interrupt();
    }
  };

  const handleQuickCommand = (cmd: string) => {
    try {
      addToHistory({ command: cmd, response: answer, timestamp: Date.now() });
      onCommand?.(cmd);
    } catch (err) {
      console.error('Command failed:', getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Main Voice Interface */}
      <Card variant="gradient" animated>
        <div className="flex flex-col items-center space-y-6">
          {/* Animated Voice Orb */}
          <div onClick={handleOrbTap} className="cursor-pointer">
            <VoiceOrb state={state} level={level} onTap={handleOrbTap} />
          </div>

          {/* Status & Transcript */}
          <div className="text-center space-y-2 min-h-[4rem]">
            <p className="text-sm font-medium text-blue-400">
              {state === 'idle' && 'Click to speak'}
              {state === 'listening' && "I'm Listening..."}
              {state === 'thinking' && 'Processing...'}
              {state === 'speaking' && 'Responding...'}
            </p>
            {transcript && <p className="text-lg text-white font-medium">{transcript}</p>}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            {state === 'listening' && (
              <button
                onClick={stop}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium transition-colors"
              >
                Stop & Send
              </button>
            )}
            {(state === 'thinking' || state === 'speaking') && (
              <button
                onClick={interrupt}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm text-white font-medium transition-colors flex items-center gap-2"
              >
                <RotateCcw size={14} />
                Try Again
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Quick Commands */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Quick Commands</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => handleQuickCommand(cmd)}
              disabled={state !== 'idle'}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-200 transition-colors border border-zinc-700 hover:border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card variant="dark" className="border-l-4 border-l-red-500" animated>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={() => start()}
              className="text-zinc-400 hover:text-zinc-200 flex-shrink-0"
              aria-label="Try again"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </Card>
      )}

      {/* Response */}
      {answer && (
        <Card variant="default" animated>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-blue-400">Response</h4>
            </div>
            <p className="text-zinc-200 leading-relaxed">{answer}</p>
          </div>
        </Card>
      )}
    </div>
  );
};
