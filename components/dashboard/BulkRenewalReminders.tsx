"use client";

import { membershipRenewalReminderMessage, smsLink, whatsappLink } from "@/lib/messageTemplates";
import { formatDateShortIST } from "@/lib/uiFormat";

export type BulkRow = {
  mobile: string;
  full_name: string;
  end_date: string;
};

export function BulkRenewalReminders({
  rows,
  gymName,
}: {
  rows: BulkRow[];
  gymName: string;
}) {
  function openSequential(kind: "wa" | "sms") {
    let i = 0;
    const run = () => {
      if (i >= rows.length) return;
      const r = rows[i];
      i += 1;
      const endFormatted = formatDateShortIST(r.end_date);
      const msg = membershipRenewalReminderMessage({
        memberName: r.full_name,
        expiryDate: endFormatted,
        gymName,
      });
      const url =
        kind === "wa" ? whatsappLink(r.mobile, msg) : smsLink(r.mobile, msg);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(run, 900);
    };
    run();
  }

  if (rows.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
      <span className="w-full text-xs text-zinc-500">
        Opens each contact one-by-one (same message as individual WhatsApp).
      </span>
      <button
        type="button"
        onClick={() => openSequential("wa")}
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
      >
        Send bulk reminder (WhatsApp)
      </button>
      <button
        type="button"
        onClick={() => openSequential("sms")}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
      >
        Send bulk reminder (SMS)
      </button>
    </div>
  );
}
