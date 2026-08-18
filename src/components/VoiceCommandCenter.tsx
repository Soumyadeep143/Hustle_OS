import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';
import { Card } from './Card';
import clsx from 'clsx';

interface VoiceCommandCenterProps {
  onCommand?: (command: string) => void;
}

const MOCK_RESPONSES: Record<string, string> = {
  'find ai jobs': 'Found 5 AI opportunities in Bangalore. Companies looking for ML engineers. Top match: 4.8/5 relevance.',
  'show status': '12 applications pending, 3 need follow-up. 2 companies have reviewed your profile. 1 interview scheduled.',
  'daily plan': 'Today\'s priorities: Follow up with 2 companies, apply to 3 new positions, prepare for 1 interview.',
  'who to follow up': 'You should follow up with: OpenAI (5 days), Anthropic (3 days), Mem0 (7 days).',
  'apply to top 3': 'Ready to apply to OpenAI, Anthropic, Mem0. Processing 3 applications. Estimated time: 2 minutes.',
};

const QUICK_COMMANDS = [
  'Find AI jobs',
  'Show status',
  'Daily plan',
  'Who to follow up',
  'Apply to top 3',
];

export const VoiceCommandCenter: React.FC<VoiceCommandCenterProps> = ({ onCommand }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [history, setHistory] = useState<Array<{ command: string; response: string }>>([]);
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(20).fill(0.3));
  const waveformIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Animate waveform
  useEffect(() => {
    if (isListening) {
      waveformIntervalRef.current = setInterval(() => {
        setWaveformBars((bars) =>
          bars.map(() => Math.random() * 0.9 + 0.1)
        );
      }, 100);
    } else {
      if (waveformIntervalRef.current) {
        clearInterval(waveformIntervalRef.current);
      }
      setWaveformBars(Array(20).fill(0.3));
    }

    return () => {
      if (waveformIntervalRef.current) {
        clearInterval(waveformIntervalRef.current);
      }
    };
  }, [isListening]);

  const handleMicClick = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTranscript('Listening...');
    } else {
      setTranscript('');
      // Simulate processing
      setTimeout(() => {
        setTranscript('Find me AI jobs in Bangalore');
      }, 500);
    }
  };

  const handleSendCommand = (command?: string) => {
    const finalCommand = command || transcript;
    if (!finalCommand.trim()) return;

    // Find matching response
    const key = Object.keys(MOCK_RESPONSES).find((k) =>
      finalCommand.toLowerCase().includes(k) || k.includes(finalCommand.toLowerCase())
    );
    const mockResponse = key ? MOCK_RESPONSES[key] : 'Command received. Processing your request...';

    setResponse(mockResponse);
    setHistory([{ command: finalCommand, response: mockResponse }, ...history.slice(0, 4)]);
    setTranscript('');
    setIsListening(false);
    onCommand?.(finalCommand);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Main Voice Interface */}
      <Card variant="gradient" animated>
        <div className="flex flex-col items-center space-y-6">
          {/* Waveform Visualization */}
          <div className="flex items-center justify-center gap-1 h-24 w-full">
            {waveformBars.map((height, i) => (
              <div
                key={i}
                className={clsx(
                  'flex-1 bg-gradient-to-t from-blue-500 to-blue-300 rounded-full transition-all duration-100',
                  isListening ? 'opacity-100' : 'opacity-50'
                )}
                style={{
                  height: `${Math.max(height * 100, 10)}%`,
                  minHeight: '10px',
                }}
              />
            ))}
          </div>

          {/* Microphone Button */}
          <button
            onClick={handleMicClick}
            className={clsx(
              'relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200',
              isListening
                ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulseGlow'
                : 'bg-blue-500 shadow-lg shadow-blue-500/30 hover:bg-blue-600'
            )}
          >
            <Mic size={32} className="text-white" />
            {isListening && (
              <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-pulse" />
            )}
          </button>

          {/* Status */}
          <div className="text-center space-y-2">
            <p className={clsx('text-sm font-medium', isListening ? 'text-red-300' : 'text-slate-300')}>
              {isListening ? 'Listening...' : 'Click to speak'}
            </p>
            {transcript && <p className="text-lg text-white font-medium">{transcript}</p>}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full max-w-xs">
            <Button
              variant="primary"
              size="md"
              icon={<Send size={16} />}
              onClick={() => handleSendCommand()}
              disabled={!transcript.trim()}
              fullWidth
            >
              Send
            </Button>
            {isListening && (
              <Button variant="danger" size="md" onClick={() => setIsListening(false)} fullWidth>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Quick Commands */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Quick Commands</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => handleSendCommand(cmd)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-200 transition-colors border border-slate-700 hover:border-blue-500/30"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Response */}
      {response && (
        <Card variant="default" animated>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-blue-400">Response</h4>
              <Badge variant="info">AI Generated</Badge>
            </div>
            <p className="text-slate-200 leading-relaxed">{response}</p>
          </div>
        </Card>
      )}

      {/* Command History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Recent Commands</h3>
          {history.map((item, i) => (
            <Card key={i} variant="dark" hover>
              <div className="space-y-2">
                <p className="text-sm text-slate-300">
                  <span className="font-medium text-blue-400">You:</span> {item.command}
                </p>
                <p className="text-sm text-slate-400">
                  <span className="font-medium text-emerald-400">HustleOS:</span> {item.response}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
