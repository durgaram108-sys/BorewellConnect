export type LandType = "Agriculture" | "Residential" | "Commercial";

export interface CustomerDTO {
  id: string;
  phone: string;
  name: string | null;
}

export interface CompanyDTO {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  city: string;
  state: string;
  experienceYears: number;
  registrationNumber: string;
  serviceAreas: string[];
  machineType: string;
  verified: boolean;
  vehiclePhotos: { slot: string; url: string }[];
}

export interface BorewellRequestDTO {
  id: string;
  code: string;
  district: string;
  mandal: string;
  landType: LandType;
  depthFt: number;
  lat: number;
  lng: number;
  preferredDate: string;
  status: "OPEN" | "BOOKED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

export interface QuoteDTO {
  id: string;
  requestId: string;
  companyId: string;
  companyName: string;
  pricePerFt: number;
  machineType: string;
  estimatedCompletion: string;
  rating: number;
  distanceKm: number;
  yearsExperience: number;
  blendedScore: number;
  rank: number;
  isTop: boolean;
}

export interface BookingDTO {
  id: string;
  code: string;
  requestId: string;
  quoteId: string;
  customerId: string;
  companyId: string;
  companyName: string;
  companyPhone?: string;
  customerName?: string;
  customerPhone?: string;
  pricePerFt: number;
  bookingFee: number;
  status: "CONFIRMED" | "PAID" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

export interface MilestoneDTO {
  label: string;
  completedAt: string | null;
}

export interface WorkUpdateDTO {
  id: string;
  label: string;
  photoUrl: string | null;
  createdAt: string;
}

export interface InvoiceLineItemDTO {
  label: string;
  amount: number;
}

export interface InvoiceDTO {
  id: string;
  code: string;
  bookingId: string;
  lineItems: InvoiceLineItemDTO[];
  bookingFeePaid: number;
  total: number;
  createdAt: string;
}

export interface ReviewDTO {
  id: string;
  bookingId: string;
  rating: number;
  text: string;
  createdAt: string;
}

export interface RazorpayOrderDTO {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface AdminDashboardDTO {
  totalUsers: number;
  totalCompanies: number;
  activeRequests: number;
  totalBookings: number;
  recentBookings: BookingSummaryDTO[];
}

export interface BookingSummaryDTO {
  id: string;
  code: string;
  customerName: string;
  companyName: string;
  amount: number;
  status: string;
}

export interface AnalyticsDTO {
  totalRevenueThisMonth: number;
  commissionEarned: number;
  revenueTrend: { month: string; amount: number }[];
  bookingsByStatus: { status: string; count: number }[];
}
