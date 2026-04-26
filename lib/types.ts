// ── Single source of truth for shared entity types ──

export interface Member {
  id: string;
  full_name: string;
  mobile: string;
  email?: string | null;
  member_code: string;
  is_active: boolean;
  photo_url?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  blood_group?: string | null;
  joining_date?: string | null;
  notes?: string | null;
  welcome_wa_sent?: boolean | null;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  duration_months: number;
  default_price?: number | null;
  is_active: boolean;
}

export interface Membership {
  id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  fee_charged: number;
  status?: string | null;
  created_by?: string | null;
  plan?: Plan;
}

export interface Payment {
  id: string;
  membership_id: string;
  member_id: string;
  amount: number;
  payment_mode: "cash" | "upi";
  receipt_number: string;
  payment_date?: string;
  upi_ref?: string | null;
  email_sent?: boolean;
  notes?: string | null;
  created_at: string;
  created_by?: string | null;
  member?: Pick<Member, "id" | "full_name" | "mobile" | "member_code">;
  membership?: Pick<Membership, "start_date" | "end_date" | "plan">;
}

export interface Settings {
  gym_name: string;
  address?: string | null;
  phone?: string | null;
  upi_id?: string | null;
  backup_email?: string | null;
  whatsapp_group_link?: string | null;
  logo_path?: string | null;
  upi_qr_path?: string | null;
}

export interface EmailLog {
  id: string;
  member_id: string | null;
  type: "welcome" | "receipt" | "reminder_7d" | "reminder_1d" | "expired" | "backup";
  sent_to: string;
  status: "sent" | "failed";
  error_msg?: string | null;
  membership_id?: string | null;
  sent_at: string;
}

export type MembershipStatus = "active" | "expiring" | "expired" | "no-plan";
