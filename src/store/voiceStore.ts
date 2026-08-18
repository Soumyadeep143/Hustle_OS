import { create } from 'zustand';

export interface VoiceHistoryItem {
  command: string;
  response: string;
  timestamp: number;
}

interface VoiceState {
  transcript: string;
  response: string;
  audioUrl: string | null;
  isListening: boolean;
  history: VoiceHistoryItem[];
  isLoading: boolean;
  error: string | null;

  setTranscript: (transcript: string) => void;
  setResponse: (response: string) => void;
  setAudioUrl: (audioUrl: string | null) => void;
  setIsListening: (isListening: boolean) => void;
  addToHistory: (item: VoiceHistoryItem) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearHistory: () => void;
}

const MAX_HISTORY = 5;

export const useVoiceStore = create<VoiceState>()((set) => ({
  transcript: '',
  response: '',
  audioUrl: null,
  isListening: false,
  history: [],
  isLoading: false,
  error: null,

  setTranscript: (transcript) => set({ transcript }),
  setResponse: (response) => set({ response }),
  setAudioUrl: (audioUrl) => set({ audioUrl }),
  setIsListening: (isListening) => set({ isListening }),
  addToHistory: (item) =>
    set((state) => ({ history: [item, ...state.history].slice(0, MAX_HISTORY) })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearHistory: () => set({ history: [] }),
}));
