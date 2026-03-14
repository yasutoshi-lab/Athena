"use client";
import { create } from "zustand";

export interface Toast {
  id: string;
  type: "error" | "warning" | "info";
  message: string;
  duration?: number; // ms, 0 = manual dismiss only
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

let toastCounter = 0;

export const useToast = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));

    // Auto-dismiss after duration (default 8s, 0 = no auto-dismiss)
    const duration = toast.duration ?? 8000;
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
