const API_BASE = "/api";

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE}${url}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${localStorage.getItem("access_token")}`;
      res = await fetch(`${API_BASE}${url}`, { ...options, headers });
    }
  }

  return res;
}

async function refreshToken(): Promise<boolean> {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("access_token", data.access);
      if (data.refresh) {
        localStorage.setItem("refresh_token", data.refresh);
      }
      return true;
    }
  } catch {}
  return false;
}

export const api = {
  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    return data;
  },

  async logout() {
    const refresh = localStorage.getItem("refresh_token");
    try {
      await fetchWithAuth("/auth/logout/", {
        method: "POST",
        body: JSON.stringify({ refresh }),
      });
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  },

  async me() {
    const res = await fetchWithAuth("/auth/me/");
    if (!res.ok) throw new Error("Not authenticated");
    return res.json();
  },

  async getSettings() {
    const res = await fetchWithAuth("/settings/");
    if (!res.ok) throw new Error("Failed to get settings");
    return res.json();
  },

  async updateSettings(data: Record<string, unknown>) {
    const res = await fetchWithAuth("/settings/", {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update settings");
    return res.json();
  },

  async createSession(query: string) {
    const res = await fetchWithAuth("/sessions/", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error("Failed to create session");
    return res.json();
  },

  async getSessions() {
    const res = await fetchWithAuth("/sessions/");
    if (!res.ok) throw new Error("Failed to get sessions");
    return res.json();
  },

  async getSession(id: number) {
    const res = await fetchWithAuth(`/sessions/${id}/`);
    if (!res.ok) throw new Error("Failed to get session");
    return res.json();
  },

  async getGraph(sessionId: number) {
    const res = await fetchWithAuth(`/sessions/${sessionId}/graph/`);
    if (!res.ok) throw new Error("Failed to get graph");
    return res.json();
  },

  async getUsage() {
    const res = await fetchWithAuth("/usage/");
    if (!res.ok) throw new Error("Failed to get usage");
    return res.json();
  },
};
