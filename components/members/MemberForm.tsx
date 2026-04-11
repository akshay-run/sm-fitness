"use client";

import { useMemo, useState, useEffect } from "react";
import { createMemberSchema, type CreateMemberInput } from "@/lib/validations/member.schema";

type Props = {
  initial?: Partial<CreateMemberInput>;
  submitLabel: string;
  onSubmit: (data: CreateMemberInput) => Promise<void>;
};

export function MemberForm({ initial, submitLabel, onSubmit }: Props) {
  type GenderValue = "male" | "female" | "other" | undefined;
  
  const todayDateStr = new Date().toISOString().split("T")[0];
  
  const defaults = useMemo(
    () => ({
      full_name: initial?.full_name ?? "",
      mobile: initial?.mobile ?? "",
      email: initial?.email ?? "",
      date_of_birth: initial?.date_of_birth ?? "",
      gender: initial?.gender ?? undefined,
      address: initial?.address ?? "",
      notes: initial?.notes ?? "",
      blood_group: initial?.blood_group ?? "",
      joining_date: initial?.joining_date ?? todayDateStr,
    }),
    [initial, todayDateStr]
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
    <form onSubmit={handleSubmit} className="space-y-8 pb-20 sm:pb-0 relative">
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Step 1 of 1 — Basic Info</div>
      
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">Required Info</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required htmlFor="full_name">
            <input
              id="full_name"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              aria-invalid={!!error}
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              disabled={submitting}
              required
            />
          </Field>

          <Field label="Mobile" required hint="10 digits" htmlFor="mobile">
            <input
              id="mobile"
              inputMode="numeric"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              aria-invalid={!!error}
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
              disabled={submitting}
              required
            />
          </Field>

          <Field label="Email" required htmlFor="email">
            <input
              id="email"
              type="email"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              value={form.email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              disabled={submitting}
              required
            />
          </Field>
        </div>
      </div>

      <hr className="border-t border-zinc-200" />

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">Additional Info</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Joining Date" htmlFor="joining_date">
            <input
              id="joining_date"
              type="date"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              value={form.joining_date ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, joining_date: e.target.value }))}
              disabled={submitting}
            />
          </Field>

          <Field label="Date of birth (optional)" htmlFor="date_of_birth">
            <input
              id="date_of_birth"
              type="date"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              value={form.date_of_birth ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
              disabled={submitting}
            />
          </Field>

          <Field label="Gender (optional)" htmlFor="gender">
            <select
              id="gender"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
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

          <Field label="Blood Group (optional)" htmlFor="blood_group">
            <select
              id="blood_group"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              value={form.blood_group ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, blood_group: e.target.value }))}
              disabled={submitting}
            >
              <option value="">Select</option>
              {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => (
                 <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Address (optional)" htmlFor="address">
          <textarea
            id="address"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            rows={3}
            value={form.address ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            disabled={submitting}
          />
        </Field>

        <Field label="Admin notes (optional)" htmlFor="notes">
          <textarea
            id="notes"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            rows={4}
            value={form.notes ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            disabled={submitting}
          />
        </Field>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-zinc-200 sm:static sm:bg-transparent sm:border-0 sm:p-0 z-10">
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-zinc-900 px-4 py-3 sm:py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 shadow-lg sm:shadow-none"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-zinc-800" htmlFor={htmlFor}>
          {label} {required ? <span className="text-red-600">*</span> : null}
        </label>
        {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
