import type { RankedQuote } from "./api";

export type RootStackParams = {
  RoleSelect: undefined;
  Customer: undefined;
  Owner: undefined;
};

export type CustomerStackParams = {
  CustomerLogin: undefined;
  CustomerOtp: { phone: string };
  CustomerHome: undefined;
  CompleteProfile: undefined;
  NewRequest: undefined;
  SelectLocation: { country: string; state: string; district: string; mandal: string; landType: string; depthFt: number };
  Quotations: { requestId: string; code: string };
  QuoteDetail: { requestId: string; quote: RankedQuote };
  BookingConfirm: { bookingId: string; code: string; companyName: string };
  Payment: { bookingId: string };
  Tracking: { bookingId: string };
  JobDetails: { bookingId: string };
  WorkUpdates: { bookingId: string };
  Invoice: { bookingId: string };
  Review: { bookingId: string; companyName: string };
  MyBookings: undefined;
};

export type OwnerStackParams = {
  OwnerLogin: undefined;
  OwnerOtp: { phone: string };
  OwnerDashboard: undefined;
  NewLeads: undefined;
  SubmitQuote: { requestId: string; code: string };
  ActiveJobs: { justSubmitted?: boolean } | undefined;
  JobUpdate: { jobId: string };
  Earnings: undefined;
  OwnerProfile: undefined;
  EditProfile: undefined;
};
