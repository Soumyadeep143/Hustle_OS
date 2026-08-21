import { create } from 'zustand';
import { api, AUTH_TOKEN_KEY, type AuthUser } from '../services/api';

export type AuthStatus = 'checking' | 'authed' | 'guest';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;

  hydrate: () => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  status: 'checking',
  user: null,

  hydrate: async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      set({ status: 'guest', user: null });
      return;
    }
    try {
      const user = await api.auth.me();
      set({ status: 'authed', user });
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      set({ status: 'guest', user: null });
    }
  },

  signup: async (name, email, password) => {
    const { token, user } = await api.auth.signup(name, email, password);
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    set({ status: 'authed', user });
  },

  login: async (email, password) => {
    const { token, user } = await api.auth.login(email, password);
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    set({ status: 'authed', user });
  },

  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    set({ status: 'guest', user: null });
  },
}));

window.addEventListener('hustleos:unauthorized', () => {
  useAuth.setState({ status: 'guest', user: null });
});
