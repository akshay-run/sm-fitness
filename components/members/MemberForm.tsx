"use client";

import { useMemo, useState } from "react";
import { createMemberSchema, type CreateMemberInput } from "@/lib/validations/member.schema";

type Props = {
  initial?: Partial<CreateMemberInput>;
  submitLabel: string;
  onSubmit: (data: CreateMemberInput) => Promise<void>;
};

export function MemberForm({ initial, submitLabel, onSubmit }: Props) {
  type GenderValue = "male" | "female" | "other" | undefined;
  const defaults = useMemo(
    () => ({
      full_name: initial?.full_name ?? "",
      mobile: initial?.mobile ?? "",
      email: initial?.email ?? "",
      date_of_birth: initial?.date_of_birth ?? "",
      gender: initial?.gender ?? undefined,
      address: initial?.address ?? "",
      emergency_contact_name: initial?.emergency_contact_name ?? "",
      emergency_contact_phone: initial?.emergency_contact_phone ?? "",
      notes: initial?.notes ?? "",
    }),
    [initial]
  );

  const [form, setForm] = useState(defaults);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = createMemberSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" required>
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            disabled={submitting}
            required
          />
        </Field>

        <Field label="Mobile" required hint="10 digits">
          <input
            inputMode="numeric"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            value={form.mobile}
            onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
            disabled={submitting}
            required
          />
        </Field>

        <Field label="Email (optional)">
          <input
            type="email"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            value={form.email ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            disabled={submitting}
          />
        </Field>

        <Field label="Date of birth (optional)">
          <input
            type="date"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            value={form.date_of_birth ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
            disabled={submitting}
          />
        </Field>

        <Field label="Gender (optional)">
          <select
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            value={form.gender ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                gender: (e.target.value || undefined) as GenderValue,
              }))
            }
            disabled={submitting}
          >
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </Field>
      </div>

      <Field label="Address (optional)">
        <textarea
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          rows={3}
          value={form.address ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          disabled={submitting}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Emergency contact name (optional)">
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            value={form.emergency_contact_name ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, emergency_contact_name: e.target.value }))
            }
            disabled={submitting}
          />
        </Field>

        <Field label="Emergency contact phone (optional)" hint="10 digits">
          <input
            inputMode="numeric"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            value={form.emergency_contact_phone ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, emergency_contact_phone: e.target.value }))
            }
            disabled={submitting}
          />
        </Field>
      </div>

      <Field label="Admin notes (optional)">
        <textarea
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          rows={4}
          value={form.notes ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          disabled={submitting}
        />
      </Field>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-zinc-800">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </label>
        {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

