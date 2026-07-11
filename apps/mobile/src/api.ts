import AsyncStorage from "@react-native-async-storage/async-storage";

declare const process: { env: Record<string, string | undefined> };

const API = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

let customerToken: string | null = null;
let ownerToken: string | null = null;

export async function loadTokens() {
  customerToken = await AsyncStorage.getItem("customer_token");
  ownerToken = await AsyncStorage.getItem("owner_token");
}

export async function setCustomerToken(t: string | null) {
  customerToken = t;
  if (t) await AsyncStorage.setItem("customer_token", t);
  else await AsyncStorage.removeItem("customer_token");
}

export async function setOwnerToken(t: string | null) {
  ownerToken = t;
  if (t) await AsyncStorage.setItem("owner_token", t);
  else await AsyncStorage.removeItem("owner_token");
}

export const hasCustomerToken = () => !!customerToken;
export const hasOwnerToken = () => !!ownerToken;

async function req<T>(path: string, init?: RequestInit, role?: "customer" | "owner"): Promise<T> {
  const token = role === "owner" ? ownerToken : role === "customer" ? customerToken : null;
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

// ---- Types mirrored from the API ----

export interface RankedQuote {
  id: string;
  companyName: string;
  bandRates: number[];
  totalPrice: number;
  depthFt: number;
  casingRate: number;
  machineType: string;
  estimatedCompletion: string;
  rating: number;
  distanceKm: number;
  yearsExperience: number;
  blendedScore: number;
  rank: number;
  isTop: boolean;
}

export interface RequestRow {
  id: string;
  code: string;
  country: string;
  state: string;
  district: string;
  mandal: string;
  status: string;
  quoteCount: number;
}

export interface BookingDetail {
  id: string;
  code: string;
  status: string;
  bandRates: number[];
  totalPrice: number;
  bookingFee: number;
  company: {
    id: string;
    name: string;
    city: string;
    state: string;
    experienceYears: number;
    machineType: string;
    phone: string | null;
  };
  milestones: { label: string; completedAt: string | null }[];
  workUpdates: { id: string; label: string; photoUrl: string | null; createdAt: string }[];
  invoice: Invoice | null;
  review: { rating: number; text: string } | null;
}

export interface Invoice {
  id: string;
  code: string;
  lineItems: { label: string; amount: number }[];
  total: number;
  createdAt: string;
}

export interface Lead {
  id: string;
  code: string;
  country: string;
  state: string;
  district: string;
  mandal: string;
  landType: string;
  depthFt: number;
  preferredDate: string;
  totalPrice: number;
}

export interface OwnerJob {
  id: string;
  code: string;
  status: string;
  bandRates: number[];
  totalPrice: number;
  district: string;
  mandal: string;
  depthFt: number;
  customerName: string | null;
  customerPhone: string | null;
  milestones: { label: string; completedAt: string | null }[];
  hasInvoice: boolean;
}

export interface CompanyProfile {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  experienceYears: number;
  registrationNumber: string;
  serviceAreas: string[];
  machineType: string;
  rateCard: number[];
  casingRate: number;
  estimatedCompletion: string;
  availableDates: string[];
  status: "PENDING" | "VERIFIED";
  vehiclePhotos: { slot: string; url: string }[];
  borewellPhotos: { id: string; url: string }[];
}

export interface CustomerProfile {
  id: string;
  phone: string;
  name: string | null;
  address: string | null;
}

export const api = {
  // customer auth
  customerRequestOtp: (phone: string) =>
    req<{ ok: true; devHint?: string }>("/auth/customer/otp/request", { method: "POST", body: JSON.stringify({ phone }) }),
  customerVerifyOtp: (phone: string, code: string) =>
    req<{ token: string; customer: CustomerProfile; isNew: boolean }>("/auth/customer/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }),

  // customer profile
  customerProfile: () => req<CustomerProfile>("/customer/profile", {}, "customer"),
  updateCustomerProfile: (data: { name: string; address: string }) =>
    req<CustomerProfile>("/customer/profile", { method: "PATCH", body: JSON.stringify(data) }, "customer"),

  // customer flow
  createRequest: (data: object) =>
    req<RequestRow>("/customer/requests", { method: "POST", body: JSON.stringify(data) }, "customer"),
  myRequests: () => req<RequestRow[]>("/customer/requests", {}, "customer"),
  quotesFor: (requestId: string) => req<RankedQuote[]>(`/customer/requests/${requestId}/quotes`, {}, "customer"),
  book: (quoteId: string) =>
    req<{ id: string; code: string }>(`/customer/quotes/${quoteId}/book`, { method: "POST" }, "customer"),
  payOrder: (bookingId: string) =>
    req<{ orderId: string; amount: number; currency: string; keyId: string; mock: boolean }>(
      `/customer/bookings/${bookingId}/pay/order`,
      { method: "POST" },
      "customer"
    ),
  payVerify: (bookingId: string, payload: object) =>
    req<{ ok: true }>(`/customer/bookings/${bookingId}/pay/verify`, { method: "POST", body: JSON.stringify(payload) }, "customer"),
  booking: (id: string) => req<BookingDetail>(`/customer/bookings/${id}`, {}, "customer"),
  myBookings: () =>
    req<{ id: string; code: string; companyName: string; status: string }[]>("/customer/bookings", {}, "customer"),
  submitReview: (bookingId: string, rating: number, text: string) =>
    req(`/customer/bookings/${bookingId}/review`, { method: "POST", body: JSON.stringify({ rating, text }) }, "customer"),

  // owner auth
  ownerRequestOtp: (phone: string) =>
    req<{ ok: true; devHint?: string }>("/auth/owner/otp/request", { method: "POST", body: JSON.stringify({ phone }) }),
  ownerVerifyOtp: (phone: string, code: string) =>
    req<{ token: string; company: CompanyProfile; isNew: boolean }>("/auth/owner/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }),

  // owner flow
  leads: () => req<Lead[]>("/owner/leads", {}, "owner"),
  jobs: () => req<OwnerJob[]>("/owner/jobs", {}, "owner"),
  advanceMilestone: (jobId: string) =>
    req<{ ok: true; completed: string; jobDone: boolean }>(`/owner/jobs/${jobId}/milestones/advance`, { method: "POST" }, "owner"),
  earnings: () =>
    req<{ thisMonth: number; recentPayouts: { code: string; amount: number }[] }>("/owner/earnings", {}, "owner"),
  profile: () => req<CompanyProfile>("/owner/profile", {}, "owner"),
  updateProfile: (data: object) => req<CompanyProfile>("/owner/profile", { method: "PATCH", body: JSON.stringify(data) }, "owner"),
  uploadVehiclePhoto: (slot: string, url: string) =>
    req("/owner/profile/photos", { method: "PUT", body: JSON.stringify({ slot, url }) }, "owner"),
  addBorewellPhoto: (url: string) =>
    req<{ id: string; url: string }>("/owner/profile/borewell-photos", { method: "POST", body: JSON.stringify({ url }) }, "owner"),
  removeBorewellPhoto: (id: string) =>
    req<{ ok: true }>(`/owner/profile/borewell-photos/${id}`, { method: "DELETE" }, "owner"),
};
