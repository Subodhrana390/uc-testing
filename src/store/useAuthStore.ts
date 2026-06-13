import { create } from "zustand";
import { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  isInitialized: boolean;
  setSession: (session: Session | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isInitialized: false,
  setSession: (session) => set({ session, user: session?.user || null, isInitialized: true }),
  clearSession: () => set({ session: null, user: null, isInitialized: true }),
}));
