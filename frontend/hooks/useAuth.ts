"use client";
import { create } from "zustand";
import { api } from "@/lib/api";

interface User {
  id: number;
  username: string;
  email: string;
  settings?: {
    display_name: string;
    nickname: string;
    default_model: string;
    complexity_threshold: number;
    system_prompt: string;
    language: string;
    color_mode: string;
    graph_animation: boolean;
    graph_grid: boolean;
    animation_speed: string;
  };
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (username, password) => {
    await api.login(username, password);
    const user = await api.me();
    set({ user, loading: false });
  },

  logout: async () => {
    await api.logout();
    set({ user: null, loading: false });
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        set({ user: null, loading: false });
        return;
      }
      const user = await api.me();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));
