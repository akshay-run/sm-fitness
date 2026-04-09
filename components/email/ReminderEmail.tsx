export function renderReminderEmail({
  gymName,
  memberName,
  type,
  planName,
  endDate,
}: {
  gymName: string;
  memberName: string;
  type: "reminder_7d" | "reminder_1d" | "expired";
  planName: string;
  endDate: string;
}) {
  const safeGym = escapeHtml(gymName);
  const safeName = escapeHtml(memberName);
  const safePlan = escapeHtml(planName);
  const safeEnd = escapeHtml(endDate);

  const title =
    type === "expired"
      ? "Membership expired"
      : type === "reminder_1d"
        ? "Membership expires tomorrow"
        : "Membership expires soon";

  const body =
    type === "expired"
      ? `Your membership has expired on ${safeEnd}. Please contact the gym to renew.`
      : type === "reminder_1d"
        ? `Your membership will expire tomorrow (${safeEnd}). Please renew to continue uninterrupted.`
        : `Your membership will expire soon (${safeEnd}). Please renew in advance.`;

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f4f5;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:20px;">
        <h1 style="margin:0 0 8px 0;font-size:18px;color:#18181b;">${escapeHtml(
          title
        )} — ${safeGym}</h1>
        <p style="margin:0 0 12px 0;font-size:14px;color:#3f3f46;">Hi ${safeName},</p>
        <p style="margin:0 0 16px 0;font-size:14px;color:#3f3f46;">${body}</p>
        <div style="padding:12px;border-radius:12px;background:#fafafa;border:1px solid #e4e4e7;">
          <div style="font-size:12px;color:#71717a;">Plan</div>
          <div style="font-size:14px;font-weight:600;color:#18181b;">${safePlan}</div>
          <div style="margin-top:8px;font-size:12px;color:#71717a;">Expiry date</div>
          <div style="font-size:14px;font-weight:600;color:#18181b;">${safeEnd}</div>
        </div>
        <p style="margin:12px 0 0 0;font-size:12px;color:#71717a;">This is an automated email.</p>
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

