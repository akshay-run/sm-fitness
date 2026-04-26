function firstNameOrFullName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Member";
  const first = trimmed.split(/\s+/)[0]?.trim();
  return first && first.length > 0 ? first : trimmed;
}

function safePlanName(planName: string | null | undefined): string {
  const trimmed = String(planName ?? "").trim();
  return trimmed.length > 0 ? trimmed : "your membership";
}

function formatAmountInr(amount: number): string {
  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount)}`;
}

export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const e164 = digits.startsWith("91") ? digits : `91${digits}`;
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}

export function smsLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `sms:+91${digits}?body=${encodeURIComponent(message)}`;
}

export function welcomeMemberWhatsAppMessage(params: {
  fullName: string;
  memberCode: string;
  mobile: string;
  planName: string;
  startDate: string;
  endDate: string;
  whatsappGroupLink?: string | null;
  gymName?: string | null;
}): string {
  const gym = params.gymName?.trim() || "SM FITNESS";
  const firstName = firstNameOrFullName(params.fullName);
  const link = params.whatsappGroupLink?.trim();
  const groupBlock =
    link && link.length > 0
      ? `\n📲 Join our WhatsApp group for updates & tips:\n${link}\n`
      : "";
  return `Hi ${firstName}! 👋

Welcome to *${gym}*! We're so glad you joined us 🏋️

Here are your membership details:
• *Member Code:* ${params.memberCode}
• *Plan:* ${safePlanName(params.planName)}
• *Valid:* ${params.startDate} – ${params.endDate}
${groupBlock}
See you at the gym! 💪
— *${gym}* Team`;
}

export function receiptMessage(params: {
  name: string;
  receiptNo: string;
  plan: string;
  startDate: string;
  endDate: string;
  amount: number;
  mode: string;
  gymName?: string;
}): string {
  const gym = params.gymName?.trim() || "SM FITNESS";
  const firstName = firstNameOrFullName(params.name);
  return `Hi ${firstName}!

Here's your receipt from *${gym}* 🧾

• *Receipt #:* ${params.receiptNo}
• *Date:* ${params.startDate}
• *Plan:* ${safePlanName(params.plan)}
• *Valid:* ${params.startDate} – ${params.endDate}
• *Paid:* ${formatAmountInr(params.amount)} (${params.mode})

Thank you! See you at the gym 🏋️`;
}

export function membershipRenewalReminderMessage(params: {
  memberName: string;
  expiryDate: string;
  gymName?: string;
}): string {
  const gym = params.gymName?.trim() || "SM FITNESS";
  const firstName = firstNameOrFullName(params.memberName);
  return `Hi ${firstName}! 👋

Quick reminder — your *${gym}* membership expires on *${params.expiryDate}*.

Renew soon to keep your momentum going! 💪

📱 Contact us for renewal`;
}

export function reminderMessage(params: {
  name: string;
  endDate: string;
  daysLeft: number;
}): string {
  const firstName = firstNameOrFullName(params.name);
  if (params.daysLeft <= 0) {
    return `Hi ${firstName},

Your *SM FITNESS* membership has *expired*.

Please visit us to renew and continue your fitness journey! 💪

– SM FITNESS`;
  }
  return `Hi ${firstName},

Your *SM FITNESS* membership expires in *${params.daysLeft} day${params.daysLeft > 1 ? "s" : ""}* on ${params.endDate}.

Renew now to keep your momentum going! 💪

– SM FITNESS`;
}

