export interface Member {
  id: string;
  full_name: string;
  mobile: string;
  email?: string | null;
  member_code: string;
  is_active: boolean;
  photo_url?: string | null;
}

export interface Membership {
  id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  fee_charged: number;
}

export interface Payment {
  id: string;
  membership_id: string;
  member_id: string;
  amount: number;
  payment_mode: "cash" | "upi";
  receipt_number: string;
  created_at: string;
  member?: Member;
}

export interface Plan {
  id: string;
  name: string;
  duration_months: number;
  default_price?: number | null;
  is_active: boolean;
}
