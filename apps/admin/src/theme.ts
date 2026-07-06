export const c = {
  navy: "#0B2A4A",
  green: "#1FA463",
  orange: "#F2994A",
  border: "#E6E3DD",
  muted: "#6B7280",
  mutedLight: "#9CA3AF",
  bg: "#F9F8F6",
  danger: "#C0392B",
  successBg: "#DCF3E7",
  warningBg: "#FCEBD9",
  rowBorder: "#EEECE7",
  greenSoft: "#CFEBDD",
};

export const statusColor = (status: string) =>
  status === "COMPLETED" || status === "PAID"
    ? c.green
    : status === "CANCELLED"
      ? c.danger
      : c.orange;

export const statusLabel = (status: string) =>
  ({
    CONFIRMED: "Awaiting Payment",
    PAID: "Paid",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  })[status] ?? status;

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
