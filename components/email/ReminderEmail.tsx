export function renderReminderEmail({
  gymName,
  memberName,
  type,
  planName,
  endDate,
  upiId,
  upiQrUrl,
}: {
  gymName: string;
  memberName: string;
  type: "reminder_7d" | "reminder_1d" | "expired";
  planName: string;
  endDate: string;
  upiId?: string | null;
  upiQrUrl?: string | null;
}) {
  const safeGym = escapeHtml(gymName);
  const safeFullName = escapeHtml(memberName);
  const safeFirstName = escapeHtml(firstNameOrFullName(memberName));
  const safePlan = escapeHtml(planName || "your membership");
  const safeEnd = escapeHtml(endDate);

  const title = type === "expired" ? "Membership expired" : "Membership expiring soon";

  const body =
    type === "expired"
      ? `Your membership expired on <strong>${safeEnd}</strong>. We'd love to have you back.`
      : type === "reminder_1d"
        ? `Your membership expires <strong>tomorrow</strong> (${safeEnd}). Renew today to avoid any gap.`
        : `Your membership expires in <strong>7 days</strong> on ${safeEnd}. Renew soon to keep your routine going.`;

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f4f5;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:20px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="height:44px;width:44px;border-radius:999px;background:#ecfeff;color:#155e75;display:flex;align-items:center;justify-content:center;font-weight:700;">
            ${escapeHtml(gymInitials(gymName))}
          </div>
          <div>
            <div style="font-size:12px;color:#64748b;">${safeGym}</div>
            <h1 style="margin:2px 0 0 0;font-size:18px;color:#0f172a;">${escapeHtml(title)}</h1>
          </div>
        </div>
        <p style="margin:0 0 12px 0;font-size:14px;color:#3f3f46;">Hi ${safeFirstName},</p>
        <p style="margin:0 0 16px 0;font-size:14px;color:#3f3f46;">${body}</p>
        <div style="padding:12px;border-radius:12px;background:#fafafa;border:1px solid #e4e4e7;">
          <div style="font-size:12px;color:#71717a;">Plan</div>
          <div style="font-size:14px;font-weight:600;color:#18181b;">${safePlan}</div>
          <div style="margin-top:8px;font-size:12px;color:#71717a;">Expiry date</div>
          <div style="font-size:14px;font-weight:600;color:#18181b;">${safeEnd}</div>
        </div>
        ${upiQrUrl || upiId ? `
        <div style="margin-top:20px;padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0 0 12px 0;font-size:14px;color:#334155;font-weight:600;">Scan & Pay via UPI to Renew</p>
          ${upiQrUrl ? `<img src="${escapeHtml(upiQrUrl)}" alt="UPI QR Code" style="width:150px;height:150px;border-radius:8px;margin-bottom:12px;display:inline-block;"/>` : ""}
          ${upiId ? `<p style="margin:0;font-size:14px;color:#475569;font-family:monospace;background:#e2e8f0;padding:6px 12px;border-radius:6px;display:inline-block;">${escapeHtml(upiId)}</p>` : ""}
        </div>
        ` : ""}
        <p style="margin:16px 0 0 0;font-size:14px;color:#334155;">To renew, just reply to this email, contact the gym, or complete payment via the UPI details above.</p>
        <p style="margin:10px 0 0 0;font-size:12px;color:#64748b;">Member name on file: ${safeFullName}</p>
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

function firstNameOrFullName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Member";
  const first = trimmed.split(/\s+/)[0]?.trim();
  return first && first.length > 0 ? first : trimmed;
}

function gymInitials(gymName: string): string {
  const parts = gymName.trim().split(/\s+/).filter(Boolean);
  const raw = parts.map((p) => p[0] ?? "").join("");
  return (raw.slice(0, 2) || "GY").toUpperCase();
}

