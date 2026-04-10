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
  const safeName = escapeHtml(memberName);
  const safeCode = escapeHtml(memberCode);
  const safeMobile = escapeHtml(mobile);

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f6f8;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:20px;box-shadow:0 1px 2px rgba(15,23,42,.08)">
        <h1 style="margin:0 0 8px 0;font-size:20px;color:#1a1a2e;">Welcome to ${safeGym}, ${safeName}!</h1>
        <p style="margin:0 0 12px 0;font-size:14px;color:#475569;">Your member profile has been created.</p>
        <div style="padding:12px;border-radius:12px;background:#fafafa;border:1px solid #e4e4e7;">
          <div style="font-size:12px;color:#71717a;">Member code</div>
          <div style="font-size:16px;font-weight:600;color:#18181b;">${safeCode}</div>
        </div>
        <p style="margin:12px 0 0 0;font-size:14px;color:#334155;">Mobile on file: ${safeMobile}</p>
        <p style="margin:8px 0 0 0;font-size:14px;color:#334155;">Your membership will be assigned shortly by the admin.</p>
        <p style="margin:8px 0 0 0;font-size:14px;color:#334155;">Visit us at the gym to get started!</p>
        <p style="margin:14px 0 0 0;font-size:12px;color:#64748b;">SM FITNESS | Managed by SM FITNESS Admin App</p>
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

