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

export function reminderMessage(params: {
  name: string;
  endDate: string;
  daysLeft: number;
}): string {
  return `Hello ${params.name} 👋

This is a reminder from *SM FITNESS* 🏋️

Your gym membership is expiring on *${params.endDate}*.

Please renew before it expires to continue your fitness journey without interruption 💪

For renewal, contact us or visit the gym.

Thank you!
— SM FITNESS Team`;
}

