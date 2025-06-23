import { create } from "zustand";

type User = { username: string };

type AuthState = {
  token: string | null;
  user: User | null;
  loginError: string;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setLoginError: (msg: string) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  loginError: "",
  setToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
  setLoginError: (msg) => set({ loginError: msg }),
}));