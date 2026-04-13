"use client";

import { useEffect } from "react";

export type ConfirmTone = "default" | "danger" | "success";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  /** @deprecated use confirmTone="danger" */
  danger,
  confirmTone,
  confirmDisabled,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  confirmTone?: ConfirmTone;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = "confirm-dialog-title";
  const descriptionId = "confirm-dialog-description";

  const tone: ConfirmTone = confirmTone ?? (danger ? "danger" : "default");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-500 disabled:opacity-50"
      : tone === "success"
        ? "bg-green-600 hover:bg-green-500 disabled:opacity-50"
        : "bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h2 id={titleId} className="text-base font-semibold text-zinc-900">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="mt-2 whitespace-pre-line text-sm text-zinc-600">
            {description}
          </p>
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
            disabled={confirmDisabled}
            onClick={onConfirm}
            className={["rounded-lg px-3 py-2 text-sm font-medium text-white", confirmClass].join(" ")}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
