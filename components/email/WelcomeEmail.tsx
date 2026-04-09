export function renderWelcomeEmail({
  gymName,
  memberName,
  memberCode,
}: {
  gymName: string;
  memberName: string;
  memberCode: string;
}) {
  const safeGym = escapeHtml(gymName);
  const safeName = escapeHtml(memberName);
  const safeCode = escapeHtml(memberCode);

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f4f5;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:20px;">
        <h1 style="margin:0 0 8px 0;font-size:18px;color:#18181b;">Welcome to ${safeGym}</h1>
        <p style="margin:0 0 12px 0;font-size:14px;color:#3f3f46;">Hi ${safeName}, your member profile has been created.</p>
        <div style="padding:12px;border-radius:12px;background:#fafafa;border:1px solid #e4e4e7;">
          <div style="font-size:12px;color:#71717a;">Member code</div>
          <div style="font-size:16px;font-weight:600;color:#18181b;">${safeCode}</div>
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

