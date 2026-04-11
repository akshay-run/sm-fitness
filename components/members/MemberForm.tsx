"use client";

import { useMemo, useState } from "react";
import { createMemberSchema, type CreateMemberInput } from "@/lib/validations/member.schema";
import { todayISTDateString } from "@/lib/dateUtils";

type Props = {
  initial?: Partial<CreateMemberInput>;
  submitLabel: string;
  onSubmit: (data: CreateMemberInput) => Promise<void>;
};

export function MemberForm({ initial, submitLabel, onSubmit }: Props) {
  type GenderValue = "male" | "female" | "other" | undefined;
  const defaults = useMemo(() => {
    const today = todayISTDateString();
    return {
      full_name: initial?.full_name ?? "",
      mobile: initial?.mobile ?? "",
      email: initial?.email ?? "",
      date_of_birth: initial?.date_of_birth ?? "",
      gender: initial?.gender ?? undefined,
      address: initial?.address ?? "",
      blood_group: (initial?.blood_group ?? "") as string,
      notes: initial?.notes ?? "",
      joining_date: initial?.joining_date && initial.joining_date.trim() ? initial.joining_date : today,
    };
  }, [initial]);

  const [form, setForm] = useState(defaults);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      ...form,
      blood_group: form.blood_group === "" ? undefined : form.blood_group,
    };

    const parsed = createMemberSchema.safeParse(payload);
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
    <div className="relative pb-24 md:pb-4">
      <p className="mb-4 text-xs text-zinc-500">Step 1 of 1 — Basic info</p>

      <form id="member-form" onSubmit={handleSubmit} className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-zinc-900">Required info</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </section>

        <div className="border-t border-zinc-200 pt-6">
          <h2 className="text-sm font-semibold text-zinc-900">Additional info</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <Field label="Joining date" htmlFor="joining_date">
              <input
                id="joining_date"
                type="date"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                value={form.joining_date ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, joining_date: e.target.value }))}
                disabled={submitting}
              />
            </Field>

            <Field label="Blood group (optional)" htmlFor="blood_group">
              <select
                id="blood_group"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                value={form.blood_group === "" ? "" : form.blood_group}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    blood_group: e.target.value,
                  }))
                }
                disabled={submitting}
              >
                <option value="">Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </Field>
          </div>

          <div className="mt-4">
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
          </div>

          <div className="mt-4">
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
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="hidden md:block">
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 sm:w-auto"
          >
            {submitting ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>

      <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-zinc-200 bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:hidden">
        <button
          type="submit"
          form="member-form"
          disabled={submitting}
          className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </div>
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
