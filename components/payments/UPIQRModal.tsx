"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function UPIQRModal({
  open,
  upiUrl,
  onClose,
}: {
  open: boolean;
  upiUrl: string;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!open) return;
      const url = await QRCode.toDataURL(upiUrl, { margin: 1, width: 240 });
      if (!cancelled) setDataUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, upiUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">UPI QR</h2>
            <p className="mt-1 text-xs text-zinc-600">
              Ask the member to pay, then confirm.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="UPI QR" className="h-60 w-60" />
          ) : (
            <div className="text-sm text-zinc-600">Generating...</div>
          )}
        </div>

        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-[11px] text-zinc-700 break-all">
          {upiUrl}
        </div>
      </div>
    </div>
  );
}

