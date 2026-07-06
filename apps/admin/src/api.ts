const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

let token: string | null = localStorage.getItem("admin_token");

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem("admin_token", t);
  else localStorage.removeItem("admin_token");
}

export function hasToken() {
  return !!token;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) {
    setToken(null);
    window.location.reload();
  }
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

export const api = {
  login: (email: string, password: string) =>
    req<{ token: string }>("/auth/admin/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  dashboard: () => req<Dashboard>("/admin/dashboard"),
  companies: () => req<Company[]>("/admin/companies"),
  verifyCompany: (id: string) => req<Company>(`/admin/companies/${id}/verify`, { method: "POST" }),
  bookings: () => req<BookingRow[]>("/admin/bookings"),
  analytics: () => req<Analytics>("/admin/analytics"),
};

export interface Dashboard {
  totalUsers: number;
  totalCompanies: number;
  activeRequests: number;
  totalBookings: number;
  recentBookings: BookingRow[];
}
export interface BookingRow {
  id: string;
  code: string;
  customerName: string;
  companyName: string;
  amount: number;
  status: string;
}
export interface Company {
  id: string;
  name: string;
  ownerName: string;
  city: string;
  status: "PENDING" | "VERIFIED";
}
export interface Analytics {
  totalRevenueThisMonth: number;
  commissionEarned: number;
  revenueTrend: { month: string; amount: number }[];
  bookingsByStatus: { status: string; count: number }[];
}
