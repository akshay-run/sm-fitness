export function renderReceiptEmail({
  gymName,
  memberName,
  receiptNumber,
  amount,
  paymentMode,
  planName,
  startDate,
  endDate,
}: {
  gymName: string;
  memberName: string;
  receiptNumber: string;
  amount: string;
  paymentMode: string;
  planName: string;
  startDate: string;
  endDate: string;
}) {
  const safeGym = escapeHtml(gymName);
  const safeName = escapeHtml(memberName);

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f4f5;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:20px;">
        <h1 style="margin:0 0 8px 0;font-size:18px;color:#18181b;">Payment receipt — ${safeGym}</h1>
        <p style="margin:0 0 16px 0;font-size:14px;color:#3f3f46;">Hi ${safeName}, thanks for your payment.</p>

        <div style="display:block;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
          <div style="padding:12px 14px;background:#fafafa;border-bottom:1px solid #e4e4e7;">
            <div style="font-size:12px;color:#71717a;">Receipt</div>
            <div style="font-size:16px;font-weight:700;color:#18181b;">${escapeHtml(
              receiptNumber
            )}</div>
          </div>
          <div style="padding:14px;">
            ${row("Plan", planName)}
            ${row("Dates", `${startDate} → ${endDate}`)}
            ${row("Amount", `₹${amount}`)}
            ${row("Payment mode", paymentMode.toUpperCase())}
          </div>
        </div>

        <p style="margin:12px 0 0 0;font-size:12px;color:#71717a;">This is an automated email (no PDF).</p>
      </div>
    </div>
  </body>
</html>`;
}

function row(label: string, value: string) {
  return `<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px dashed #e4e4e7;">
    <div style="font-size:12px;color:#71717a;">${escapeHtml(label)}</div>
    <div style="font-size:12px;color:#18181b;font-weight:600;text-align:right;">${escapeHtml(
      value
    )}</div>
  </div>`;
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

