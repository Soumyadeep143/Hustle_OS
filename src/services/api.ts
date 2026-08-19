import axios, { type AxiosError, type AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const DEFAULT_USER_ID = 'user_default';
const MAX_RETRIES = 2;

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface RetryableConfig {
  method?: string;
  __retryCount?: number;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (typeof error.config & RetryableConfig) | undefined;
    const isServerOrNetworkError = !error.response || error.response.status >= 500;
    const isGet = config?.method?.toLowerCase() === 'get';

    if (config && isGet && isServerOrNetworkError) {
      config.__retryCount = config.__retryCount ?? 0;
      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 500 * config.__retryCount!));
        return apiClient(config);
      }
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    if (!error.response) return 'Cannot reach the HustleOS backend. Is it running on ' + API_URL + '?';
    const data = error.response.data as { detail?: string; error?: string } | undefined;
    return data?.detail || data?.error || `Request failed (${error.response.status})`;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

export interface VoiceResponse {
  response: string;
  audio_url?: string | null;
}

export interface TranscribeResponse {
  text: string;
  intent: string;
  error?: string;
}

export interface Opportunity {
  id: string;
  company: string;
  role: string;
  description: string;
  salary?: string | null;
  location?: string | null;
  score?: number | null;
}

export interface DiscoverResponse {
  opportunities: Opportunity[];
  total_found: number;
  error?: string;
}

export interface ApplyResponse {
  opportunity_id: string;
  email_draft: string;
  waiting_approval: boolean;
  error?: string;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  applied_at: string;
  status: string;
  match_score: number;
  description: string;
  last_followup?: string | null;
  notes?: string | null;
}

export interface UserProfile {
  name: string;
  email: string;
  target_role: string;
  target_location: string;
  skills: string[];
  bio?: string | null;
}

export interface MemoryResponse {
  user_profile: UserProfile;
  applications: Application[];
  insights: string[];
}

export interface DashboardResponse {
  total_applications: number;
  followups_due: number;
  execution_score: number;
  priorities: string[];
  metrics: Record<string, number>;
}

export interface RecallMemoryFact {
  id: string;
  type: string;
  text: string;
  source_url?: string | null;
  confidence?: number | null;
  created_at: string;
}

export interface RecallTimelineEvent {
  id: string;
  label: string;
  detail?: string | null;
  created_at: string;
}

export interface RecallNextBestAction {
  action: string;
  reason: string;
  generated_at: string;
}

export interface RecallProspect {
  id: string;
  name: string;
  role?: string | null;
  company: string;
  company_id?: string | null;
  email?: string | null;
  relationship: string;
  lead_score: number;
  intent: string;
  next_best_action?: RecallNextBestAction | null;
  memory: RecallMemoryFact[];
  timeline: RecallTimelineEvent[];
  created_at: string;
  updated_at: string;
  source_url?: string | null;
  notes?: string | null;
}

export interface RecallProspectSummary {
  id: string;
  name: string;
  company: string;
  role?: string | null;
  relationship: string;
  lead_score: number;
  intent: string;
  next_best_action?: string | null;
}

export interface RecallProspectCreateRequest {
  name: string;
  company: string;
  role?: string;
  email?: string;
  source_url?: string;
  notes?: string;
}

export interface RecallDashboardResponse {
  total_prospects: number;
  high_intent: number;
  followups_today: number;
  next_best_actions: Array<{ prospect_id: string; name: string; action: string }>;
  insights: string[];
}

export type RecallExecuteAgent = 'memory' | 'execution' | 'strategy';

export interface RecallExecuteEvent {
  agent: RecallExecuteAgent;
  status: 'running' | 'done';
  detail?: string;
}

export interface RecallExecuteResult {
  agent: 'result';
  status: 'done';
  prospect: RecallProspect;
  result: string;
  executed_by: string;
}

export interface RecallQueryResponse {
  answer: string;
  prospect_id?: string | null;
  grounded: boolean;
}

export interface RecallActivityEvent {
  id: string;
  agent: string;
  label: string;
  detail?: string | null;
  prospect_id: string;
  prospect_name: string;
  created_at: string;
}

export const api = {
  voice: {
    transcribe: async (audio: Blob): Promise<TranscribeResponse> => {
      const formData = new FormData();
      formData.append('file', audio, 'recording.webm');
      const { data } = await apiClient.post<TranscribeResponse>('/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    command: async (transcript: string, userId: string = DEFAULT_USER_ID): Promise<VoiceResponse> => {
      const { data } = await apiClient.post<VoiceResponse>('/voice/command', {
        transcript,
        user_id: userId,
      });
      return data;
    },
    tts: async (text: string): Promise<{ audio_url: string | null }> => {
      const { data } = await apiClient.post<{ audio_url: string | null }>('/voice/tts', null, {
        params: { text },
      });
      return data;
    },
  },

  opportunity: {
    discover: async (role: string, location: string): Promise<DiscoverResponse> => {
      const { data } = await apiClient.post<DiscoverResponse>('/opportunity/discover', {
        role,
        location,
      });
      return data;
    },
    apply: async (opportunityId: string, userId: string = DEFAULT_USER_ID): Promise<ApplyResponse> => {
      const { data } = await apiClient.post<ApplyResponse>('/opportunity/apply', {
        opportunity_id: opportunityId,
        user_id: userId,
      });
      return data;
    },
  },

  dashboard: {
    get: async (userId: string = DEFAULT_USER_ID): Promise<DashboardResponse> => {
      const { data } = await apiClient.get<DashboardResponse>('/dashboard/', {
        params: { user_id: userId },
      });
      return data;
    },
  },

  memory: {
    get: async (userId: string = DEFAULT_USER_ID): Promise<MemoryResponse> => {
      const { data } = await apiClient.get<MemoryResponse>('/memory/', {
        params: { user_id: userId },
      });
      return data;
    },
    updateProfile: async (profile: UserProfile): Promise<UserProfile> => {
      const { data } = await apiClient.post<UserProfile>('/memory/', profile);
      return data;
    },
  },

  recall: {
    listProspects: async (): Promise<RecallProspectSummary[]> => {
      const { data } = await apiClient.get<RecallProspectSummary[]>('/recall/prospects');
      return data;
    },
    getProspect: async (id: string): Promise<RecallProspect> => {
      const { data } = await apiClient.get<RecallProspect>(`/recall/prospects/${id}`);
      return data;
    },
    createProspect: async (request: RecallProspectCreateRequest): Promise<RecallProspect> => {
      const { data } = await apiClient.post<RecallProspect>('/recall/prospects', request);
      return data;
    },
    execute: async (
      id: string,
      onEvent: (event: RecallExecuteEvent | RecallExecuteResult) => void
    ): Promise<void> => {
      const res = await fetch(`${API_URL}/api/recall/prospects/${id}/execute`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data as { detail?: string } | null)?.detail || `Request failed (${res.status})`);
      }
      if (!res.body) throw new Error('Streaming is not supported in this browser');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const chunk of events) {
          const line = chunk.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          onEvent(JSON.parse(line.slice(6)));
        }
      }
    },
    getDashboard: async (): Promise<RecallDashboardResponse> => {
      const { data } = await apiClient.get<RecallDashboardResponse>('/recall/dashboard');
      return data;
    },
    query: async (question: string): Promise<RecallQueryResponse> => {
      const { data } = await apiClient.post<RecallQueryResponse>('/recall/query', { question });
      return data;
    },
    getActivity: async (limit: number = 20): Promise<RecallActivityEvent[]> => {
      const { data } = await apiClient.get<RecallActivityEvent[]>('/recall/activity', {
        params: { limit },
      });
      return data;
    },
  },
};

export default api;
