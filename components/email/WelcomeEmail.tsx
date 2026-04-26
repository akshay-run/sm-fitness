export function renderWelcomeEmail({
  gymName,
  memberName,
  memberCode,
  mobile,
}: {
  gymName: string;
  memberName: string;
  memberCode: string;
  mobile: string;
}) {
  const safeGym = escapeHtml(gymName);
  const safeFullName = escapeHtml(memberName);
  const safeFirstName = escapeHtml(firstNameOrFullName(memberName));
  const safeCode = escapeHtml(memberCode);
  const safeMobile = escapeHtml(mobile);

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f6f8;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:20px;box-shadow:0 1px 2px rgba(15,23,42,.08)">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="height:44px;width:44px;border-radius:999px;background:#eef2ff;color:#3730a3;display:flex;align-items:center;justify-content:center;font-weight:700;">
            ${escapeHtml(gymInitials(gymName))}
          </div>
          <div>
            <div style="font-size:12px;color:#64748b;">${safeGym}</div>
            <h1 style="margin:2px 0 0 0;font-size:18px;color:#0f172a;">Welcome, ${safeFirstName}! 🎉</h1>
          </div>
        </div>
        <p style="margin:0 0 12px 0;font-size:14px;color:#334155;">We’re glad you joined ${safeGym}. Here are your details:</p>
        <div style="padding:12px;border-radius:12px;background:#fafafa;border:1px solid #e4e4e7;">
          <div style="font-size:12px;color:#71717a;">Member code</div>
          <div style="font-size:16px;font-weight:600;color:#18181b;">${safeCode}</div>
        </div>
        <p style="margin:12px 0 0 0;font-size:14px;color:#334155;"><strong>Mobile:</strong> ${safeMobile}</p>
        <p style="margin:10px 0 0 0;font-size:14px;color:#334155;">Show your member code at the front desk anytime.</p>
        <p style="margin:10px 0 0 0;font-size:14px;color:#334155;">See you at the gym! 💪</p>
        <p style="margin:14px 0 0 0;font-size:12px;color:#64748b;">Member name on file: ${safeFullName}</p>
      </div>
    </div>
  </body>
</html>`;
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

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

