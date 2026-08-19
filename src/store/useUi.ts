import { create } from 'zustand';
import { api, type Task } from '../services/api';

export type Workspace = 'Personal' | 'Team' | 'Enterprise';
export type Sheet = null | 'capture' | 'workspace';
export type Theme = 'light' | 'dark';

interface UiState {
  workspace: Workspace;
  workTab: 'Tasks' | 'Applications' | 'Projects';
  sheet: Sheet;
  theme: Theme;
  toast: string | null;
  voiceOpen: boolean;
  tasks: Task[];
  tasksLoaded: boolean;

  setWorkspace: (w: Workspace) => void;
  setWorkTab: (t: UiState['workTab']) => void;
  openSheet: (s: Exclude<Sheet, null>) => void;
  closeSheet: () => void;
  setTheme: (t: Theme) => void;
  showToast: (msg: string) => void;
  setVoiceOpen: (v: boolean) => void;
  loadTasks: () => Promise<void>;
  toggleTask: (id: string) => void;
  addTask: (title: string, dueAt?: string, priority?: Task['priority']) => Promise<Task>;
}

export const useUi = create<UiState>((set, get) => ({
  workspace: 'Personal',
  workTab: 'Tasks',
  sheet: null,
  theme: (localStorage.getItem('hustleos-theme') as Theme) ?? 'light',
  toast: null,
  voiceOpen: false,
  tasks: [],
  tasksLoaded: false,

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

  loadTasks: async () => {
    if (get().tasksLoaded) return;
    try {
      const tasks = await api.tasks.list();
      set({ tasks, tasksLoaded: true });
    } catch {
      set({ tasksLoaded: true });
    }
  },

  toggleTask: (id) => {
    const prev = get().tasks;
    const task = prev.find((t) => t.id === id);
    if (!task) return;
    const nextDone = !task.done;
    set({
      tasks: prev.map((t) =>
        t.id === id ? { ...t, done: nextDone, meta: nextDone ? 'Completed' : t.due_at || 'Today' } : t
      ),
    });
    api.tasks.setDone(id, nextDone).catch(() => {
      set({ tasks: prev });
      get().showToast('Could not update task — try again');
    });
  },

  addTask: async (title, dueAt, priority = 'normal') => {
    const task = await api.tasks.create(title, dueAt, priority);
    set((state) => ({ tasks: [task, ...state.tasks] }));
    return task;
  },
}));
