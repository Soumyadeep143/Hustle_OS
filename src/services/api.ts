import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { browserTimezone } from '../lib/scheduling';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const DEFAULT_USER_ID = 'user_default';
const MAX_RETRIES = 2;

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  // AI endpoints (voice/command, assessment, linkedin, outreach) chain several
  // sequential LLM calls plus TTS; on a free-tier backend (0.1 CPU, cold
  // starts) that routinely exceeds 15s and the request gets aborted
  // client-side well before the server would have replied.
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const AUTH_TOKEN_KEY = 'hustleos-token';

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetryableConfig {
  method?: string;
  __retryCount?: number;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (typeof error.config & RetryableConfig) | undefined;

    if (error.response?.status === 401 && !config?.url?.startsWith('/auth/')) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.dispatchEvent(new Event('hustleos:unauthorized'));
    }

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

async function consumeSSE<T>(url: string, onEvent: (event: T) => void): Promise<void> {
  const res = await fetch(url, { method: 'POST' });
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
      onEvent(JSON.parse(line.slice(6)) as T);
    }
  }
}

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
  schedule_draft?: ScheduleDraft | null;
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

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
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

export type RecallSource = 'linkedin' | 'x' | 'instagram' | 'reddit' | 'other';
export type RecallStatus =
  | 'saved'
  | 'interested'
  | 'applied'
  | 'following_up'
  | 'interview'
  | 'responded'
  | 'opportunity'
  | 'completed'
  | 'archived';
export type RecallPriority = 'low' | 'medium' | 'high';

export interface RecallTimelineEvent {
  id: string;
  event_type: string;
  label: string;
  detail?: string | null;
  created_at: string;
}

export interface RecallItem {
  id: string;
  user_id: string;
  url?: string | null;
  source: RecallSource;
  source_display: string;
  title: string;
  description: string;
  notes: string;
  ai_summary?: string | null;
  category: string;
  subcategory?: string | null;
  tags: string[];
  status: RecallStatus;
  priority?: RecallPriority | null;
  company?: string | null;
  person?: string | null;
  location?: string | null;
  event_date?: string | null;
  follow_up_at?: string | null;
  follow_up_note?: string | null;
  related_application_id?: string | null;
  created_at: string;
  updated_at: string;
  timeline: RecallTimelineEvent[];
}

export interface RecallItemCreateRequest {
  url?: string;
  title: string;
  description?: string;
  notes?: string;
  ai_summary?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  status?: RecallStatus;
  priority?: RecallPriority | null;
  company?: string;
  person?: string;
  location?: string;
  event_date?: string;
  follow_up_at?: string;
  follow_up_note?: string;
}

export interface RecallItemUpdateRequest {
  source?: RecallSource;
  title?: string;
  description?: string;
  notes?: string;
  ai_summary?: string | null;
  category?: string;
  subcategory?: string | null;
  tags?: string[];
  status?: RecallStatus;
  priority?: RecallPriority | null;
  company?: string | null;
  person?: string | null;
  location?: string | null;
  event_date?: string | null;
  url?: string | null;
}

export interface RecallAnalyzeRequest {
  url?: string;
  description?: string;
}

export interface RecallAnalyzeResponse {
  source: RecallSource;
  source_display: string;
  title: string;
  category: string;
  subcategory?: string | null;
  ai_summary?: string | null;
  company?: string | null;
  person?: string | null;
  location?: string | null;
  event_date?: string | null;
  opportunity?: string | null;
  status_suggestion: RecallStatus;
  priority_suggestion?: RecallPriority | null;
  potential_action?: string | null;
  confidence: 'High' | 'Medium' | 'Low';
  extraction_note?: string | null;
  tags: string[];
}

export interface RecallDashboardResponse {
  saved: number;
  applications: number;
  follow_ups: number;
  interviews: number;
  opportunities: number;
  total: number;
  has_data: boolean;
}

export interface Task {
  id: string;
  title: string;
  meta: string;
  due_at?: string | null;
  priority: 'high' | 'normal';
  done: boolean;
  created_at: string;
}

export type CaptureKind = 'job' | 'event' | 'repo' | 'article' | 'recall' | 'note' | 'task';

export interface CaptureParseResponse {
  kind: CaptureKind;
  title: string;
  org: string;
  location: string;
  deadline: string;
  category: string;
  confidence: 'High' | 'Medium' | 'Low';
  fields: string[];
  source_url: string;
}

export interface CaptureCommitRequest {
  kind: Exclude<CaptureKind, 'recall'>;
  title: string;
  org?: string;
  location?: string;
  deadline?: string;
  category?: string;
  source_url?: string;
  user_id?: string;
}

export interface CaptureCommitResponse {
  kind: string;
  id: string;
  title: string;
}

export interface OrgHealthResponse {
  execution_health: number;
  delta: string;
  rows: { label: string; value: string; tone?: string | null }[];
  insight_lines: { text: string; tone?: string | null }[];
}

// ---- Team execution intelligence ----

export interface WorkingHours {
  days: string[];
  start: string;
  end: string;
  timezone: string;
}

export type AvailabilityStatus = 'available' | 'busy' | 'partially_available' | 'pto' | 'away';

export interface AvailabilityException {
  id: string;
  date: string;
  status: AvailabilityStatus;
  start_time?: string | null;
  end_time?: string | null;
  note?: string | null;
}

export type WorkloadState = 'under' | 'optimal' | 'overloaded';
export type RiskLevel = 'unknown' | 'low' | 'medium' | 'high';
export type EstimateConfidence = 'high' | 'medium' | 'low';

export interface TeamMember {
  id: string;
  team_id: string;
  name: string;
  role: string;
  email?: string | null;
  skills: string[];
  capacity_hours_per_week: number;
  working_hours: WorkingHours;
  availability_exceptions: AvailabilityException[];
  created_at: string;
  updated_at: string;
  capacity_hours: number;
  assigned_hours: number;
  remaining_capacity: number;
  workload_ratio: number;
  workload_state: WorkloadState;
  unestimated_open_task_count: number;
  blocked_task_count: number;
  current_availability: AvailabilityStatus;
}

export type TeamTaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

export interface TeamTaskDto {
  id: string;
  organization_id: string;
  team_id: string;
  project_id?: string | null;
  feature_id?: string | null;
  sprint_id?: string | null;
  title: string;
  description?: string | null;
  assignee_id?: string | null;
  required_skills: string[];
  status: TeamTaskStatus;
  dependencies: string[];
  estimate_hours?: number | null;
  actual_hours?: number | null;
  due_at?: string | null;
  priority: 'normal' | 'urgent';
  blocked_reason?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  is_blocked: boolean;
  blocking_on: string[];
  downstream_impact: string[];
}

export interface TeamFeature {
  id: string;
  team_id: string;
  project_id: string;
  name: string;
  description?: string | null;
  status: 'planned' | 'active' | 'completed';
  due_at?: string | null;
  created_at: string;
  updated_at: string;
  percent: number;
  done: number;
  total: number;
  blocked_count: number;
  blocking_tasks: string[];
  risk_level: RiskLevel;
  remaining_hours: number;
  available_capacity_hours: number;
  estimate_confidence: EstimateConfidence;
  basis: string;
}

export interface TeamProject {
  id: string;
  organization_id: string;
  team_id: string;
  name: string;
  description?: string | null;
  status: 'active' | 'on_hold' | 'completed';
  target_date?: string | null;
  created_at: string;
  updated_at: string;
  percent: number;
  done: number;
  total: number;
  at_risk_feature_count: number;
  open_blockers: number;
  risk_level: RiskLevel;
  remaining_hours: number;
  available_capacity_hours: number;
  estimate_confidence: EstimateConfidence;
  basis: string;
}

export interface TeamSprint {
  id: string;
  team_id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  status: 'planned' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
  percent: number;
  done: number;
  total: number;
}

export type TeamActionType = 'reassign_task' | 'unblock_task_priority_bump' | 'no_action';

export interface TeamRecommendation {
  id: string;
  action_type: TeamActionType;
  params: Record<string, string>;
  summary: string;
  reason: string;
  generated_at: string;
}

export interface TeamBottleneck {
  member_id: string;
  member_name: string;
  kind: 'overloaded' | 'blocker_owner';
  detail: string;
}

export interface TeamTimelineEventDto {
  id: string;
  label: string;
  detail?: string | null;
  created_at: string;
}

export interface TeamStateResponse {
  team_id: string;
  team_name: string;
  members: TeamMember[];
  tasks: TeamTaskDto[];
  projects: TeamProject[];
  features: TeamFeature[];
  sprints: TeamSprint[];
  bottlenecks: TeamBottleneck[];
  current_recommendation?: TeamRecommendation | null;
  timeline: TeamTimelineEventDto[];
}

export interface ProjectDetailResponse extends TeamProject {
  features: TeamFeature[];
}

export interface FeatureDetailResponse extends TeamFeature {
  blocking_task_details: TeamTaskDto[];
  responsible_members: TeamMember[];
}

export type TeamExecuteAgent = 'validate' | 'action' | 'signals';

export interface TeamExecuteEvent {
  agent: TeamExecuteAgent;
  status: 'running' | 'done' | 'error';
  detail?: string;
}

export interface TeamExecuteResult {
  agent: 'result';
  status: 'done';
  team: TeamStateResponse;
}

export interface Integration {
  key: string;
  name: string;
  connected: boolean;
  last_sync?: string | null;
}

// ---- Network: outreach campaigns + LinkedIn recruiter/DM/post tools ----

export interface DreamCompany {
  name: string;
  size: string;
  stage: string;
  hiring: boolean;
  salary_range?: string | null;
  fit_signals: string[];
  reach_score: number;
}

export interface CampaignEmail {
  day: number;
  type: string;
  subject: string;
  body: string;
}

export interface HiringManager {
  name: string;
  title: string;
  focus: string;
}

export interface CampaignPlan {
  company: string;
  role: string;
  fit_signals: string[];
  reach_score: number;
  hiring_managers: HiringManager[];
  email_sequence: CampaignEmail[];
  campaign_duration_days: number;
  total_touchpoints: number;
}

export interface LinkedInRecruiterResult {
  name: string;
  title: string;
  focus: string;
  fit_score: number;
  reason: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface LinkedInDmResult {
  recruiter: string;
  dm: string;
  tips: string[];
}

export interface LinkedInPostResult {
  topic: string;
  post: string;
  tips: string[];
}

// ---- Assessment: real, deterministic career-readiness scoring (no LLM guessing) ----

export interface CareerReadiness {
  score: number;
  level: string;
  details: string[];
  next_actions: string[];
}

export interface ReadinessImprovement {
  current: number;
  target: number;
  action: string;
}

export interface ReadinessRecommendations {
  overall_score: number;
  level: string;
  improvements: {
    skills: ReadinessImprovement;
    applications: ReadinessImprovement;
    interviews: ReadinessImprovement;
    follow_ups: ReadinessImprovement;
  };
  quick_wins: string[];
  resources: string[];
}

export interface JobFitResult {
  company: string;
  role: string;
  fit_score: number;
  fit_level: string;
}

// ---- Home: TODAY timeline, SIGNALS, AI Brief — real editable records, not derived views ----

export type ItemType = 'task' | 'event' | 'interview' | 'follow_up' | 'reminder' | 'deadline';
export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'none';
export type CalendarTarget = 'none' | 'google';

export interface TimelineEntry {
  id: string;
  user_id: string;
  at: string;
  title: string;
  subtitle?: string | null;
  tone: 'blue' | 'red' | 'yellow' | 'green' | 'neutral';
  flag?: string | null;
  item_type: ItemType;
  priority: Priority;
  scheduled_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  all_day: boolean;
  duration_minutes?: number | null;
  reminder_minutes_before?: number | null;
  timezone?: string | null;
  calendar_target: CalendarTarget;
  calendar_event_id?: string | null;
  calendar_synced_at?: string | null;
  notes?: string | null;
  original_phrase?: string | null;
  completed: boolean;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineEntryInput {
  title: string;
  subtitle?: string;
  item_type?: ItemType;
  priority?: Priority;
  scheduled_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  all_day?: boolean;
  duration_minutes?: number | null;
  reminder_minutes_before?: number | null;
  timezone?: string;
  calendar_target?: CalendarTarget;
  notes?: string;
  original_phrase?: string;
}

export interface TimelineEntryUpdateInput extends Partial<TimelineEntryInput> {
  completed?: boolean;
  clear_scheduled_date?: boolean;
  clear_start_time?: boolean;
  clear_end_time?: boolean;
}

export interface ScheduleDraft {
  item_type: ItemType;
  title: string;
  priority: Priority;
  date: string | null;
  date_phrase?: string | null;
  time_specified: boolean;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  duration_minutes: number | null;
  reminder_minutes_before: number | null;
  original_phrase: string;
  ambiguous: boolean;
  ambiguity_reason?: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface CalendarSyncResponse {
  synced: boolean;
  message: string;
}

export interface Signal {
  id: string;
  user_id: string;
  text: string;
  tag: string;
  tone: 'blue' | 'red' | 'yellow' | 'neutral';
  created_at: string;
  updated_at: string;
}

export interface Brief {
  user_id: string;
  headline: string;
  updated_at: string;
}

export const api = {
  auth: {
    signup: async (name: string, email: string, password: string): Promise<AuthResponse> => {
      const { data } = await apiClient.post<AuthResponse>('/auth/signup', { name, email, password });
      return data;
    },
    login: async (email: string, password: string): Promise<AuthResponse> => {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
      return data;
    },
    me: async (): Promise<AuthUser> => {
      const { data } = await apiClient.get<AuthUser>('/auth/me');
      return data;
    },
  },

  voice: {
    transcribe: async (audio: Blob, filename: string = 'recording.webm'): Promise<TranscribeResponse> => {
      const formData = new FormData();
      formData.append('file', audio, filename);
      const { data } = await apiClient.post<TranscribeResponse>('/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      return data;
    },
    command: async (
      transcript: string,
      timezone: string = browserTimezone(),
      includeAudio: boolean = true
    ): Promise<VoiceResponse> => {
      const { data } = await apiClient.post<VoiceResponse>(
        '/voice/command',
        { transcript, timezone, include_audio: includeAudio },
        // Voice mode still does STT + tool-calling + TTS + a large base64
        // audio payload over the wire — give it more headroom than the
        // shared default, especially on a slow/cold-started backend.
        includeAudio ? { timeout: 60000 } : undefined
      );
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
    addApplication: async (app: {
      company: string;
      role: string;
      status?: string;
      match_score?: number;
      description?: string;
      applied_at?: string;
      last_followup?: string;
      notes?: string;
    }): Promise<Application> => {
      const { data } = await apiClient.post<Application>('/memory/applications', app);
      return data;
    },
    updateApplication: async (
      id: string,
      updates: Partial<{
        company: string;
        role: string;
        status: string;
        match_score: number;
        description: string;
        applied_at: string;
        last_followup: string | null;
        notes: string;
      }>
    ): Promise<Application> => {
      const { data } = await apiClient.patch<Application>(`/memory/applications/${id}`, updates);
      return data;
    },
    deleteApplication: async (id: string): Promise<void> => {
      await apiClient.delete(`/memory/applications/${id}`);
    },
  },

  recall: {
    analyze: async (request: RecallAnalyzeRequest): Promise<RecallAnalyzeResponse> => {
      const { data } = await apiClient.post<RecallAnalyzeResponse>('/recall/analyze', request);
      return data;
    },
    refineNote: async (text: string): Promise<string> => {
      const { data } = await apiClient.post<{ text: string }>('/recall/refine-note', { text });
      return data.text;
    },
    create: async (request: RecallItemCreateRequest): Promise<RecallItem> => {
      const { data } = await apiClient.post<RecallItem>('/recall/items', request);
      return data;
    },
    list: async (params?: { status?: string; category?: string; source?: string }): Promise<RecallItem[]> => {
      const { data } = await apiClient.get<RecallItem[]>('/recall/items', { params });
      return data;
    },
    get: async (id: string): Promise<RecallItem> => {
      const { data } = await apiClient.get<RecallItem>(`/recall/items/${id}`);
      return data;
    },
    update: async (id: string, updates: RecallItemUpdateRequest): Promise<RecallItem> => {
      const { data } = await apiClient.patch<RecallItem>(`/recall/items/${id}`, updates);
      return data;
    },
    setFollowUp: async (
      id: string,
      followUpAt: string | null,
      followUpNote: string | null
    ): Promise<RecallItem> => {
      const { data } = await apiClient.post<RecallItem>(`/recall/items/${id}/follow-up`, {
        follow_up_at: followUpAt,
        follow_up_note: followUpNote,
      });
      return data;
    },
    markApplied: async (id: string): Promise<RecallItem> => {
      const { data } = await apiClient.post<RecallItem>(`/recall/items/${id}/mark-applied`);
      return data;
    },
    archive: async (id: string): Promise<RecallItem> => {
      const { data } = await apiClient.post<RecallItem>(`/recall/items/${id}/archive`);
      return data;
    },
    getDashboard: async (): Promise<RecallDashboardResponse> => {
      const { data } = await apiClient.get<RecallDashboardResponse>('/recall/dashboard');
      return data;
    },
  },

  tasks: {
    list: async (userId: string = DEFAULT_USER_ID): Promise<Task[]> => {
      const { data } = await apiClient.get<Task[]>('/tasks/', { params: { user_id: userId } });
      return data;
    },
    create: async (
      title: string,
      dueAt?: string,
      priority: 'high' | 'normal' = 'normal',
      userId: string = DEFAULT_USER_ID
    ): Promise<Task> => {
      const { data } = await apiClient.post<Task>('/tasks/', {
        title,
        due_at: dueAt,
        priority,
        user_id: userId,
      });
      return data;
    },
    setDone: async (id: string, done: boolean): Promise<Task> => {
      const { data } = await apiClient.patch<Task>(`/tasks/${id}`, { done });
      return data;
    },
  },

  capture: {
    parse: async (input: string): Promise<CaptureParseResponse> => {
      const isUrl = /^https?:\/\//i.test(input.trim());
      const { data } = await apiClient.post<CaptureParseResponse>('/capture/parse', isUrl ? { url: input } : { text: input });
      return data;
    },
    commit: async (request: CaptureCommitRequest): Promise<CaptureCommitResponse> => {
      const { data } = await apiClient.post<CaptureCommitResponse>('/capture/commit', {
        user_id: DEFAULT_USER_ID,
        ...request,
      });
      return data;
    },
  },

  workspace: {
    getOrgHealth: async (): Promise<OrgHealthResponse> => {
      const { data } = await apiClient.get<OrgHealthResponse>('/org/health');
      return data;
    },
  },

  team: {
    getState: async (teamId: string = 'default'): Promise<TeamStateResponse> => {
      const { data } = await apiClient.get<TeamStateResponse>(`/team/${teamId}`);
      return data;
    },
    addMember: async (
      teamId: string,
      member: { name: string; role: string; email?: string; skills?: string[]; capacity_hours_per_week?: number }
    ): Promise<TeamMember> => {
      const { data } = await apiClient.post<TeamMember>(`/team/${teamId}/members`, member);
      return data;
    },
    updateMember: async (
      teamId: string,
      memberId: string,
      updates: Partial<{ name: string; role: string; skills: string[]; capacity_hours_per_week: number }>
    ): Promise<TeamMember> => {
      const { data } = await apiClient.patch<TeamMember>(`/team/${teamId}/members/${memberId}`, updates);
      return data;
    },
    addTask: async (
      teamId: string,
      task: {
        title: string;
        description?: string;
        project_id?: string;
        feature_id?: string;
        sprint_id?: string;
        assignee_id?: string;
        required_skills?: string[];
        estimate_hours?: number;
        due_at?: string;
        priority?: string;
        dependencies?: string[];
      }
    ): Promise<TeamTaskDto> => {
      const { data } = await apiClient.post<TeamTaskDto>(`/team/${teamId}/tasks`, task);
      return data;
    },
    updateTask: async (
      teamId: string,
      taskId: string,
      updates: Partial<{
        status: TeamTaskStatus;
        assignee_id: string;
        estimate_hours: number;
        priority: string;
        blocked_reason: string | null;
        dependencies: string[];
      }>
    ): Promise<TeamTaskDto> => {
      const { data } = await apiClient.patch<TeamTaskDto>(`/team/${teamId}/tasks/${taskId}`, updates);
      return data;
    },
    addFeature: async (
      teamId: string,
      feature: { project_id: string; name: string; description?: string; due_at?: string }
    ): Promise<TeamFeature> => {
      const { data } = await apiClient.post<TeamFeature>(`/team/${teamId}/features`, feature);
      return data;
    },
    getFeature: async (teamId: string, featureId: string): Promise<FeatureDetailResponse> => {
      const { data } = await apiClient.get<FeatureDetailResponse>(`/team/${teamId}/features/${featureId}`);
      return data;
    },
    addProject: async (
      teamId: string,
      project: { name: string; description?: string; target_date?: string }
    ): Promise<TeamProject> => {
      const { data } = await apiClient.post<TeamProject>(`/team/${teamId}/projects`, project);
      return data;
    },
    getProject: async (teamId: string, projectId: string): Promise<ProjectDetailResponse> => {
      const { data } = await apiClient.get<ProjectDetailResponse>(`/team/${teamId}/projects/${projectId}`);
      return data;
    },
    addSprint: async (
      teamId: string,
      sprint: { name: string; start_date?: string; end_date?: string }
    ): Promise<TeamSprint> => {
      const { data } = await apiClient.post<TeamSprint>(`/team/${teamId}/sprints`, sprint);
      return data;
    },
    generateRecommendation: async (teamId: string): Promise<TeamRecommendation> => {
      const { data } = await apiClient.post<TeamRecommendation>(`/team/${teamId}/recommendation/generate`);
      return data;
    },
    executeRecommendation: async (
      teamId: string,
      onEvent: (event: TeamExecuteEvent | TeamExecuteResult) => void
    ): Promise<void> => consumeSSE(`${API_URL}/api/team/${teamId}/recommendation/execute`, onEvent),
  },

  integrations: {
    list: async (): Promise<Integration[]> => {
      const { data } = await apiClient.get<Integration[]>('/integrations/');
      return data;
    },
    connect: async (key: string): Promise<Integration> => {
      const { data } = await apiClient.post<{ key: string; connected: boolean; note: string }>(
        `/integrations/${key}/connect`
      );
      return { key: data.key, name: key, connected: data.connected };
    },
    calendarAuthUrl: async (): Promise<{ configured: boolean; url: string | null }> => {
      const { data } = await apiClient.get<{ configured: boolean; url: string | null }>(
        '/integrations/calendar/auth-url'
      );
      return data;
    },
    calendarDisconnect: async (): Promise<{ connected: boolean }> => {
      const { data } = await apiClient.post<{ connected: boolean }>('/integrations/calendar/disconnect');
      return data;
    },
  },

  schedule: {
    parse: async (text: string, timezone: string = browserTimezone()): Promise<ScheduleDraft> => {
      const { data } = await apiClient.post<ScheduleDraft>('/schedule/parse', { text, timezone });
      return data;
    },
    syncCalendar: async (entryId: string): Promise<CalendarSyncResponse> => {
      const { data } = await apiClient.post<CalendarSyncResponse>(`/schedule/${entryId}/sync-calendar`);
      return data;
    },
  },

  home: {
    getTimeline: async (date?: string): Promise<TimelineEntry[]> => {
      const { data } = await apiClient.get<TimelineEntry[]>('/home/timeline', { params: date ? { date } : undefined });
      return data;
    },
    addTimelineEntry: async (entry: TimelineEntryInput): Promise<TimelineEntry> => {
      const { data } = await apiClient.post<TimelineEntry>('/home/timeline', entry);
      return data;
    },
    updateTimelineEntry: async (id: string, updates: TimelineEntryUpdateInput): Promise<TimelineEntry> => {
      const { data } = await apiClient.patch<TimelineEntry>(`/home/timeline/${id}`, updates);
      return data;
    },
    deleteTimelineEntry: async (id: string): Promise<void> => {
      await apiClient.delete(`/home/timeline/${id}`);
    },

    getSignals: async (userId: string = DEFAULT_USER_ID): Promise<Signal[]> => {
      const { data } = await apiClient.get<Signal[]>('/home/signals', { params: { user_id: userId } });
      return data;
    },
    addSignal: async (
      signal: { text: string; tag?: string; tone?: string },
      userId: string = DEFAULT_USER_ID
    ): Promise<Signal> => {
      const { data } = await apiClient.post<Signal>('/home/signals', { ...signal, user_id: userId });
      return data;
    },
    updateSignal: async (
      id: string,
      updates: Partial<{ text: string; tag: string; tone: string }>,
      userId: string = DEFAULT_USER_ID
    ): Promise<Signal> => {
      const { data } = await apiClient.patch<Signal>(`/home/signals/${id}`, updates, { params: { user_id: userId } });
      return data;
    },
    deleteSignal: async (id: string, userId: string = DEFAULT_USER_ID): Promise<void> => {
      await apiClient.delete(`/home/signals/${id}`, { params: { user_id: userId } });
    },

    getBrief: async (userId: string = DEFAULT_USER_ID): Promise<Brief> => {
      const { data } = await apiClient.get<Brief>('/home/brief', { params: { user_id: userId } });
      return data;
    },
    updateBrief: async (headline: string, userId: string = DEFAULT_USER_ID): Promise<Brief> => {
      const { data } = await apiClient.patch<Brief>('/home/brief', { headline }, { params: { user_id: userId } });
      return data;
    },
  },

  outreach: {
    findDreamCompanies: async (role: string, location: string): Promise<{ companies: DreamCompany[]; total: number }> => {
      const { data } = await apiClient.post('/outreach/dream-companies', { role, location });
      return data;
    },
    getCampaignPlan: async (company: string, role: string): Promise<CampaignPlan> => {
      const { data } = await apiClient.get<CampaignPlan>('/outreach/campaign-plan', { params: { company, role } });
      return data;
    },
  },

  linkedin: {
    findRecruiters: async (
      company: string,
      location: string
    ): Promise<{ recruiters: LinkedInRecruiterResult[]; total: number }> => {
      const { data } = await apiClient.post('/linkedin/recruiters', null, { params: { company, location } });
      return data;
    },
    generateDm: async (recruiter: { name: string; title: string; focus: string }, role: string): Promise<LinkedInDmResult> => {
      const { data } = await apiClient.post<LinkedInDmResult>('/linkedin/dm', {
        recruiter_name: recruiter.name,
        recruiter_title: recruiter.title,
        recruiter_focus: recruiter.focus,
        role,
      });
      return data;
    },
    getProfileTips: async (): Promise<{ tips: string[]; total: number }> => {
      const { data } = await apiClient.get('/linkedin/profile-tips');
      return data;
    },
    generatePost: async (topic: string): Promise<LinkedInPostResult> => {
      const { data } = await apiClient.post<LinkedInPostResult>('/linkedin/generate-post', { topic });
      return data;
    },
  },

  assessment: {
    getCareerReadiness: async (): Promise<CareerReadiness> => {
      const { data } = await apiClient.get<CareerReadiness>('/assessment/career-readiness');
      return data;
    },
    getRecommendations: async (): Promise<ReadinessRecommendations> => {
      const { data } = await apiClient.get<ReadinessRecommendations>('/assessment/recommendations');
      return data;
    },
    getJobFit: async (company: string, role: string, salary: string): Promise<JobFitResult> => {
      const { data } = await apiClient.post<JobFitResult>('/assessment/job-fit', null, {
        params: { company, role, salary },
      });
      return data;
    },
  },
};

export default api;
