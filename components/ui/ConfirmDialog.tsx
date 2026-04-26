"use client";

import { useEffect, useRef } from "react";

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
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  const tone: ConfirmTone = confirmTone ?? (danger ? "danger" : "default");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Tab" && dialogRef.current) {
        const nodes = dialogRef.current.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        );
        const focusables = Array.from(nodes).filter((n) => !n.hasAttribute("disabled"));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    }
    if (open) {
      window.addEventListener("keydown", onKeyDown);
      cancelBtnRef.current?.focus();
    }
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
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
      <div ref={dialogRef} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
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
            ref={cancelBtnRef}
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
