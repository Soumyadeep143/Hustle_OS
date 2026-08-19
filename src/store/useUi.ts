import { create } from 'zustand';

export type Workspace = 'Personal' | 'Team' | 'Enterprise';
export type Sheet = null | 'capture' | 'workspace';
export type Theme = 'light' | 'dark';

export interface UiTask {
  id: string;
  title: string;
  meta: string;
  done: boolean;
  priority: 'high' | 'normal';
}

const TASKS_KEY = 'hustleos-tasks';

function loadTasks(): UiTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? (JSON.parse(raw) as UiTask[]) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: UiTask[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

interface UiState {
  workspace: Workspace;
  workTab: 'Tasks' | 'Applications' | 'Projects';
  sheet: Sheet;
  theme: Theme;
  toast: string | null;
  voiceOpen: boolean;
  tasks: UiTask[];
  tasksSeeded: boolean;

  setWorkspace: (w: Workspace) => void;
  setWorkTab: (t: UiState['workTab']) => void;
  openSheet: (s: Exclude<Sheet, null>) => void;
  closeSheet: () => void;
  setTheme: (t: Theme) => void;
  showToast: (msg: string) => void;
  setVoiceOpen: (v: boolean) => void;
  seedTasks: (titles: string[]) => void;
  toggleTask: (id: string) => void;
  addTask: (title: string, meta?: string, priority?: UiTask['priority']) => UiTask;
}

export const useUi = create<UiState>((set, get) => ({
  workspace: 'Personal',
  workTab: 'Tasks',
  sheet: null,
  theme: (localStorage.getItem('hustleos-theme') as Theme) ?? 'light',
  toast: null,
  voiceOpen: false,
  tasks: loadTasks(),
  tasksSeeded: loadTasks().length > 0,

  setWorkspace: (workspace) => set({ workspace, sheet: null }),
  setWorkTab: (workTab) => set({ workTab }),
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  setTheme: (theme) => {
    localStorage.setItem('hustleos-theme', theme);
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },
  showToast: (toast) => {
    set({ toast });
    window.setTimeout(() => set({ toast: null }), 2600);
  },
  setVoiceOpen: (voiceOpen) => set({ voiceOpen }),

  seedTasks: (titles) => {
    if (get().tasksSeeded) return;
    const tasks: UiTask[] = titles.map((title, i) => ({
      id: `seed-${i}`,
      title,
      meta: 'Today',
      done: false,
      priority: i === 0 ? 'high' : 'normal',
    }));
    saveTasks(tasks);
    set({ tasks, tasksSeeded: true });
  },

  toggleTask: (id) => {
    const tasks = get().tasks.map((t) =>
      t.id === id ? { ...t, done: !t.done, meta: !t.done ? 'Completed' : t.meta } : t
    );
    saveTasks(tasks);
    set({ tasks });
  },

  addTask: (title, meta = 'Today', priority = 'normal') => {
    const task: UiTask = { id: `task-${Date.now()}`, title, meta, done: false, priority };
    const tasks = [task, ...get().tasks];
    saveTasks(tasks);
    set({ tasks });
    return task;
  },
}));
