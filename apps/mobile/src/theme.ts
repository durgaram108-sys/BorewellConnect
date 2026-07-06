export const c = {
  navy: "#0B2A4A",
  green: "#1FA463",
  greenLight: "#5EE39B",
  orange: "#F2994A",
  bg: "#F2F2F7",
  border: "#E6E3DD",
  muted: "#6B7280",
  mutedLight: "#9CA3AF",
  text: "#16181C",
  danger: "#C0392B",
  successBg: "#DCF3E7",
  successText: "#17824E",
  chipBg: "#F2F2F0",
  trackBg: "#EEECE7",
  disabledDot: "#E5E7EB",
  greenSoft: "#CFEBDD",
} as const;

export const font = {
  regular: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extrabold: "Manrope_800ExtraBold",
} as const;

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

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
