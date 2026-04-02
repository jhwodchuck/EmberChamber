import { create } from "zustand";
import type { AuthSession } from "@emberchamber/protocol";
import { clearRelaySession, readRelaySession, relayAccountApi, storeRelaySession } from "@/lib/relay";

interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => void;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setSession: (session) => {
    storeRelaySession(session);
    set({ isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    const session = readRelaySession();
    if (session?.sessionId) {
      try {
        await relayAccountApi.revokeSession(session.sessionId);
      } catch {
        // Ignore server revoke failures during sign-out.
      }
    }

    clearRelaySession();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  loadUser: async () => {
    const session = readRelaySession();
    if (!session?.accessToken) {
      set({ isLoading: false });
      return;
    }

    try {
      const user = await relayAccountApi.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      clearRelaySession();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (updates) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updates } });
    }
  },
}));
