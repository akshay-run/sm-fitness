"use client";

import { useState } from "react";

export function SectionSaveButton({
  onSave,
  label = "Save",
  className,
}: {
  onSave: () => Promise<void>;
  label?: string;
  className?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={async () => {
          setSaving(true);
          setSaved(false);
          setError(null);
          try {
            await onSave();
            setSaved(true);
            window.setTimeout(() => setSaved(false), 2000);
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to save");
          } finally {
            setSaving(false);
          }
        }}
        disabled={saving}
        className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {saving ? "Saving…" : label}
      </button>
      {saved ? <p className="mt-1 text-xs text-green-700">✓ Saved</p> : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
