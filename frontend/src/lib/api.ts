import type {
  DispatchLog,
  TelemetryPoint,
  User,
  VehicleCreatePayload,
  VehicleSummary,
} from "../types/freshtrack";

export const API_BASE = import.meta.env.PROD ? "" : "http://127.0.0.1:8000";

export function getToken(): string | null {
  return localStorage.getItem("ft_token");
}

export function setToken(token: string) {
  localStorage.setItem("ft_token", token);
}

export function clearToken() {
  localStorage.removeItem("ft_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    throw new Error("UNAUTHORIZED");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Lỗi kết nối máy chủ" }));
    throw new Error(err.detail || "Yêu cầu thất bại");
  }
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    request<{ access_token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<User>("/api/auth/me"),
  getVehicles: () => request<VehicleSummary[]>("/api/vehicles"),
  createVehicle: (payload: VehicleCreatePayload) =>
    request<{ message: string; vehicle_id: string }>("/api/vehicles", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteVehicle: (vehicleId: string) =>
    request<{ message: string }>(`/api/vehicles/${encodeURIComponent(vehicleId)}`, {
      method: "DELETE",
    }),
  getTelemetry: (vehicleId: string, limit = 40) =>
    request<TelemetryPoint[]>(
      `/api/vehicles/${encodeURIComponent(vehicleId)}/telemetry?limit=${limit}`
    ),
  getDispatchLogs: (limit = 50) =>
    request<DispatchLog[]>(`/api/dispatch?limit=${limit}`),
  createDispatch: (vehicleId: string, actionTaken: string, note = "") =>
    request<{ message: string; id: number }>("/api/dispatch", {
      method: "POST",
      body: JSON.stringify({ vehicle_id: vehicleId, action_taken: actionTaken, note }),
    }),
  async downloadReportCsv(): Promise<void> {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/reports/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Không thể xuất báo cáo CSV");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "freshtrack_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  },
};
