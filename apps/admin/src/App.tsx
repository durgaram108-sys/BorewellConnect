import { useEffect, useState } from "react";
import { api, hasToken, setToken, Dashboard, Company, BookingRow, Analytics } from "./api";
import { c, inr, statusColor, statusLabel } from "./theme";

const card: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${c.border}`,
  borderRadius: 12,
};

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { token } = await api.login(email, password);
      setToken(token);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: c.muted, marginBottom: 6 };
  const input: React.CSSProperties = {
    width: "100%",
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    padding: "11px 13px",
    fontSize: 14,
    marginBottom: 14,
  };

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={submit} style={{ ...card, width: 320, borderRadius: 16, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: c.navy }}>
            BOREWELL <span style={{ color: c.green }}>CONNECT</span>
          </div>
          <div style={{ fontSize: 12, color: c.muted, marginTop: 6 }}>Admin Portal Login</div>
        </div>
        <div style={label}>EMAIL</div>
        <input style={input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="admin email" />
        <div style={label}>PASSWORD</div>
        <input
          style={{ ...input, marginBottom: 20 }}
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <div style={{ color: c.danger, fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%",
            background: c.green,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: 13,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Logging in…" : "Log In"}
        </button>
      </form>
    </div>
  );
}

function StatCard({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 150, padding: 16 }}>
      <div style={{ fontSize: 11, color: c.muted, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: valueColor }}>{value}</div>
    </div>
  );
}

function DashboardTab() {
  const [data, setData] = useState<Dashboard | null>(null);
  useEffect(() => {
    api.dashboard().then(setData).catch(console.error);
  }, []);
  if (!data) return <div style={{ color: c.muted }}>Loading…</div>;

  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 18px" }}>Dashboard</h1>
      <div style={{ display: "flex", gap: 16, marginBottom: 26, flexWrap: "wrap" }}>
        <StatCard label="TOTAL USERS" value={data.totalUsers.toLocaleString("en-IN")} />
        <StatCard label="TOTAL COMPANIES" value={String(data.totalCompanies)} />
        <StatCard label="ACTIVE REQUESTS" value={data.activeRequests.toLocaleString("en-IN")} />
        <StatCard label="TOTAL BOOKINGS" value={data.totalBookings.toLocaleString("en-IN")} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Recent Bookings</div>
      <div style={{ ...card, overflow: "hidden" }}>
        {data.recentBookings.length === 0 && (
          <div style={{ padding: 16, fontSize: 13, color: c.muted }}>No bookings yet</div>
        )}
        {data.recentBookings.map((b) => (
          <div
            key={b.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderBottom: `1px solid ${c.rowBorder}`,
              fontSize: 13,
            }}
          >
            <span style={{ fontWeight: 700 }}>{b.code}</span>
            <span style={{ color: c.muted }}>{b.companyName}</span>
            <span style={{ fontWeight: 700 }}>{inr(b.amount)}</span>
            <span style={{ fontWeight: 700, color: statusColor(b.status) }}>{statusLabel(b.status)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function CompaniesTab() {
  const [companies, setCompanies] = useState<Company[]>([]);
  useEffect(() => {
    api.companies().then(setCompanies).catch(console.error);
  }, []);

  const verify = async (id: string) => {
    const updated = await api.verifyCompany(id);
    setCompanies((cs) => cs.map((co) => (co.id === id ? { ...co, status: updated.status } : co)));
  };

  const headerCell: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: c.muted };

  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 18px" }}>Companies ({companies.length})</h1>
      <div style={{ ...card, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            padding: "12px 16px",
            background: c.bg,
            borderBottom: `1px solid ${c.rowBorder}`,
          }}
        >
          <div style={{ ...headerCell, flex: 2 }}>COMPANY</div>
          <div style={{ ...headerCell, flex: 1 }}>CITY</div>
          <div style={{ ...headerCell, flex: 1 }}>STATUS</div>
          <div style={{ ...headerCell, flex: 1, textAlign: "right" }}>ACTION</div>
        </div>
        {companies.map((co) => {
          const verified = co.status === "VERIFIED";
          return (
            <div
              key={co.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 16px",
                borderBottom: `1px solid ${c.rowBorder}`,
                fontSize: 13,
              }}
            >
              <div style={{ flex: 2 }}>
                <div style={{ fontWeight: 700 }}>{co.name}</div>
                <div style={{ fontSize: 11, color: c.mutedLight }}>{co.ownerName}</div>
              </div>
              <div style={{ flex: 1, color: c.muted }}>{co.city}</div>
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: verified ? c.successBg : c.warningBg,
                    color: verified ? c.green : c.orange,
                  }}
                >
                  {verified ? "Verified" : "Pending"}
                </span>
              </div>
              <div style={{ flex: 1, textAlign: "right" }}>
                {!verified && (
                  <button
                    onClick={() => verify(co.id)}
                    style={{
                      background: c.navy,
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "7px 14px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Verify
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function BookingsTab() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  useEffect(() => {
    api.bookings().then(setBookings).catch(console.error);
  }, []);

  const headerCell: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: c.muted };

  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 18px" }}>Bookings</h1>
      <div style={{ ...card, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            padding: "12px 16px",
            background: c.bg,
            borderBottom: `1px solid ${c.rowBorder}`,
          }}
        >
          <div style={{ ...headerCell, flex: 1 }}>BOOKING ID</div>
          <div style={{ ...headerCell, flex: 1 }}>CUSTOMER</div>
          <div style={{ ...headerCell, flex: 2 }}>COMPANY</div>
          <div style={{ ...headerCell, flex: 1 }}>AMOUNT</div>
          <div style={{ ...headerCell, flex: 1, textAlign: "right" }}>STATUS</div>
        </div>
        {bookings.length === 0 && <div style={{ padding: 16, fontSize: 13, color: c.muted }}>No bookings yet</div>}
        {bookings.map((b) => (
          <div
            key={b.id}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "14px 16px",
              borderBottom: `1px solid ${c.rowBorder}`,
              fontSize: 13,
            }}
          >
            <div style={{ flex: 1, fontWeight: 700 }}>{b.code}</div>
            <div style={{ flex: 1, color: c.muted }}>{b.customerName}</div>
            <div style={{ flex: 2 }}>{b.companyName}</div>
            <div style={{ flex: 1, fontWeight: 700 }}>{inr(b.amount)}</div>
            <div style={{ flex: 1, textAlign: "right", fontWeight: 700, color: statusColor(b.status) }}>
              {statusLabel(b.status)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AnalyticsTab() {
  const [data, setData] = useState<Analytics | null>(null);
  useEffect(() => {
    api.analytics().then(setData).catch(console.error);
  }, []);
  if (!data) return <div style={{ color: c.muted }}>Loading…</div>;

  const max = Math.max(1, ...data.revenueTrend.map((m) => m.amount));
  const totalByStatus = Math.max(1, data.bookingsByStatus.reduce((s, g) => s + g.count, 0));
  const segColor = (status: string) =>
    status === "COMPLETED" ? c.green : status === "CANCELLED" ? c.danger : c.orange;

  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 18px" }}>Earnings &amp; Analytics</h1>
      <div style={{ display: "flex", gap: 16, marginBottom: 26 }}>
        <StatCard label="TOTAL REVENUE (THIS MONTH)" value={inr(data.totalRevenueThisMonth)} valueColor={c.green} />
        <StatCard label="COMMISSION EARNED" value={inr(data.commissionEarned)} />
      </div>
      <div style={{ ...card, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>Revenue Trend (6 months)</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 120 }}>
          {data.revenueTrend.map((m, i) => {
            const isLast = i === data.revenueTrend.length - 1;
            return (
              <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                <div
                  style={{
                    background: isLast ? c.green : c.greenSoft,
                    borderRadius: "6px 6px 0 0",
                    height: `${Math.max(4, (m.amount / max) * 100)}%`,
                  }}
                  title={`${m.month}: ${inr(m.amount)}`}
                />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
          {data.revenueTrend.map((m) => (
            <div key={m.month} style={{ flex: 1, textAlign: "center", fontSize: 11, color: c.muted }}>
              {m.month}
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...card, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>Bookings by Status</div>
        <div style={{ display: "flex", borderRadius: 999, overflow: "hidden", height: 14, marginBottom: 14, background: c.rowBorder }}>
          {data.bookingsByStatus.map((g) => (
            <div key={g.status} style={{ width: `${(g.count / totalByStatus) * 100}%`, background: segColor(g.status) }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 22, fontSize: 12, flexWrap: "wrap" }}>
          {data.bookingsByStatus.map((g) => (
            <div key={g.status} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 9, height: 9, borderRadius: 5, background: segColor(g.status) }} />
              {statusLabel(g.status)} · {g.count.toLocaleString("en-IN")}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const NAV = [
  { key: "dashboard", label: "Dashboard" },
  { key: "companies", label: "Companies" },
  { key: "bookings", label: "Bookings" },
  { key: "analytics", label: "Analytics" },
] as const;
type TabKey = (typeof NAV)[number]["key"];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(hasToken());
  const [tab, setTab] = useState<TabKey>("dashboard");

  if (!loggedIn) return <Login onDone={() => setLoggedIn(true)} />;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ width: 190, background: c.navy, flexShrink: 0, padding: "20px 0", display: "flex", flexDirection: "column" }}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, padding: "0 20px 20px" }}>CONNECT Admin</div>
        {NAV.map((item) => (
          <div
            key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              padding: "12px 20px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              color: "#fff",
              background: tab === item.key ? "rgba(255,255,255,0.14)" : "transparent",
              borderLeft: tab === item.key ? `3px solid ${c.green}` : "3px solid transparent",
            }}
          >
            {item.label}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div
          onClick={() => {
            setToken(null);
            setLoggedIn(false);
          }}
          style={{ padding: "12px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "rgba(255,255,255,0.6)" }}
        >
          Log out
        </div>
      </div>
      <div style={{ flex: 1, padding: 28, overflow: "auto" }}>
        {tab === "dashboard" && <DashboardTab />}
        {tab === "companies" && <CompaniesTab />}
        {tab === "bookings" && <BookingsTab />}
        {tab === "analytics" && <AnalyticsTab />}
      </div>
    </div>
  );
}
