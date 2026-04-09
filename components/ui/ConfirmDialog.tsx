"use client";

import { useEffect } from "react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm text-zinc-600">{description}</p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={[
              "rounded-lg px-3 py-2 text-sm font-medium text-white",
              danger ? "bg-red-600 hover:bg-red-500" : "bg-zinc-900 hover:bg-zinc-800",
            ].join(" ")}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

