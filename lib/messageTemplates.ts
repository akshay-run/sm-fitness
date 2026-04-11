export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const e164 = digits.startsWith("91") ? digits : `91${digits}`;
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}

export function smsLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `sms:+91${digits}?body=${encodeURIComponent(message)}`;
}

export function receiptMessage(params: {
  name: string;
  receiptNo: string;
  plan: string;
  startDate: string;
  endDate: string;
  amount: number;
  mode: string;
}): string {
  return `*SM FITNESS - Payment Receipt*

Hi ${params.name}!
Receipt: ${params.receiptNo}
Plan: ${params.plan}
Valid: ${params.startDate} to ${params.endDate}
Amount: ₹${params.amount} (${params.mode})

Thank you for your payment! 💪
– SM FITNESS`;
}

export function membershipRenewalReminderMessage(params: {
  memberName: string;
  expiryDate: string;
  gymName?: string;
}): string {
  const gym = params.gymName?.trim() || "SM FITNESS";
  return `Hello ${params.memberName} 👋

This is a reminder from *${gym}* 🏋️

Your gym membership is expiring on *${params.expiryDate}*.

Please renew before it expires to continue your fitness journey without interruption 💪

For renewal, contact us or visit the gym.

Thank you!
— ${gym} Team`;
}

export function reminderMessage(params: {
  name: string;
  endDate: string;
  daysLeft: number;
}): string {
  if (params.daysLeft <= 0) {
    return `Hi ${params.name},

Your *SM FITNESS* membership has *expired*.

Please visit us to renew and continue your fitness journey! 💪

– SM FITNESS`;
  }
  return `Hi ${params.name},

Your *SM FITNESS* membership expires in *${params.daysLeft} day${params.daysLeft > 1 ? "s" : ""}* on ${params.endDate}.

Renew now to keep your momentum going! 💪

– SM FITNESS`;
}

