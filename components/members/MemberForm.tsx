"use client";

import { useMemo, useState } from "react";
import type { ZodIssue } from "zod";
import { createMemberSchema, type CreateMemberInput } from "@/lib/validations/member.schema";
import { todayISTDateString } from "@/lib/dateUtils";
import {
  formatInitialMobile,
  formatMobileDisplay,
  hasNonDigitExceptSpace,
} from "@/lib/formatMobile";

const SUSPICIOUS_EMAIL_DOMAINS = new Set([
  "gmial.com",
  "gmai.com",
  "yaho.com",
  "hotnail.com",
  "outlok.com",
  "rediffmial.com",
]);

function suspiciousEmailDomain(email: string): boolean {
  const t = email.trim().toLowerCase();
  const at = t.lastIndexOf("@");
  if (at === -1) return false;
  const domain = t.slice(at + 1);
  return SUSPICIOUS_EMAIL_DOMAINS.has(domain);
}

function mapIssuesToFields(issues: ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path[0];
    if (typeof k === "string" && out[k] === undefined) out[k] = i.message;
  }
  return out;
}

function inputClass(invalid: boolean): string {
  return [
    "w-full rounded-lg border px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
    invalid
      ? "border-red-400 bg-red-50 focus:border-red-400 focus-visible:ring-red-200"
      : "border-zinc-200 focus:border-zinc-400 focus-visible:ring-zinc-400",
  ].join(" ");
}

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
      mobile: formatInitialMobile(initial?.mobile),
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [emailTypoHint, setEmailTypoHint] = useState(false);
  const [mobileFormatError, setMobileFormatError] = useState<string | null>(null);

  function clearField(key: string) {
    setFieldErrors((prev) => {
      if (prev[key] === undefined) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setMobileFormatError(null);

    const mobileRaw = form.mobile.replace(/\s/g, "");
    const payload = {
      ...form,
      mobile: mobileRaw,
      blood_group: form.blood_group === "" ? undefined : form.blood_group,
    };

    const parsed = createMemberSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(mapIssuesToFields(parsed.error.issues));
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const fe = fieldErrors;

  return (
    <div className="relative pb-24 md:pb-4">
      <form id="member-form" onSubmit={handleSubmit} className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-zinc-900">Required info</h2>
          <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Full name" required htmlFor="full_name" error={fe.full_name}>
              <input
                id="full_name"
                className={inputClass(!!fe.full_name)}
                aria-invalid={!!fe.full_name}
                value={form.full_name}
                onChange={(e) => {
                  clearField("full_name");
                  setForm((f) => ({ ...f, full_name: e.target.value }));
                }}
                disabled={submitting}
                required
              />
            </Field>

            <Field
              label="Mobile"
              required
              hint="10-digit Indian mobile number"
              htmlFor="mobile"
              error={fe.mobile ?? mobileFormatError ?? undefined}
            >
              <input
                id="mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={11}
                placeholder="98765 43210"
                className={inputClass(!!(fe.mobile || mobileFormatError))}
                aria-invalid={!!(fe.mobile || mobileFormatError)}
                value={form.mobile}
                onChange={(e) => {
                  clearField("mobile");
                  const v = e.target.value;
                  setMobileFormatError(
                    hasNonDigitExceptSpace(v) ? "Only numbers allowed" : null
                  );
                  setForm((f) => ({ ...f, mobile: formatMobileDisplay(v) }));
                }}
                disabled={submitting}
                required
              />
            </Field>

            <Field label="Email (optional)" htmlFor="email" error={fe.email}>
              <input
                id="email"
                type="email"
                placeholder="member@gmail.com"
                className={inputClass(!!fe.email)}
                aria-invalid={!!fe.email}
                value={form.email ?? ""}
                onChange={(e) => {
                  clearField("email");
                  setEmailTypoHint(false);
                  setForm((f) => ({ ...f, email: e.target.value }));
                }}
                onBlur={() => setEmailTypoHint(suspiciousEmailDomain(form.email ?? ""))}
                disabled={submitting}
              />
              {emailTypoHint ? (
                <p className="mt-1 text-xs text-amber-700">
                  This email looks unusual — double-check it
                </p>
              ) : null}
            </Field>
          </div>
        </section>

        <div className="border-t border-zinc-200 pt-6">
          <h2 className="text-sm font-semibold text-zinc-900">Additional info</h2>
          <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Date of birth (optional)" htmlFor="date_of_birth" error={fe.date_of_birth}>
              <input
                id="date_of_birth"
                type="date"
                className={inputClass(!!fe.date_of_birth)}
                value={form.date_of_birth ?? ""}
                onChange={(e) => {
                  clearField("date_of_birth");
                  setForm((f) => ({ ...f, date_of_birth: e.target.value }));
                }}
                disabled={submitting}
              />
            </Field>

            <Field label="Gender (optional)" htmlFor="gender" error={fe.gender}>
              <select
                id="gender"
                className={inputClass(!!fe.gender)}
                value={form.gender ?? ""}
                onChange={(e) => {
                  clearField("gender");
                  setForm((f) => ({
                    ...f,
                    gender: (e.target.value || undefined) as GenderValue,
                  }));
                }}
                disabled={submitting}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field label="Joining date" htmlFor="joining_date" error={fe.joining_date}>
              <input
                id="joining_date"
                type="date"
                className={inputClass(!!fe.joining_date)}
                value={form.joining_date ?? ""}
                onChange={(e) => {
                  clearField("joining_date");
                  setForm((f) => ({ ...f, joining_date: e.target.value }));
                }}
                disabled={submitting}
              />
            </Field>

            <Field label="Blood group (optional)" htmlFor="blood_group" error={fe.blood_group}>
              <select
                id="blood_group"
                className={inputClass(!!fe.blood_group)}
                value={form.blood_group === "" ? "" : form.blood_group}
                onChange={(e) => {
                  clearField("blood_group");
                  setForm((f) => ({
                    ...f,
                    blood_group: e.target.value,
                  }));
                }}
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
            <Field label="Address (optional)" htmlFor="address" error={fe.address}>
              <textarea
                id="address"
                className={inputClass(!!fe.address)}
                rows={3}
                value={form.address ?? ""}
                onChange={(e) => {
                  clearField("address");
                  setForm((f) => ({ ...f, address: e.target.value }));
                }}
                disabled={submitting}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Admin notes (optional)" htmlFor="notes" error={fe.notes}>
              <textarea
                id="notes"
                className={inputClass(!!fe.notes)}
                rows={4}
                value={form.notes ?? ""}
                onChange={(e) => {
                  clearField("notes");
                  setForm((f) => ({ ...f, notes: e.target.value }));
                }}
                disabled={submitting}
              />
            </Field>
          </div>
        </div>

        {formError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
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
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-zinc-800" htmlFor={htmlFor}>
          {label} {required ? <span className="text-red-600">*</span> : null}
        </label>
        {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p className="mt-0.5 flex items-center gap-1 text-xs text-red-600">
          <span aria-hidden>⚠</span> {error}
        </p>
      ) : null}
    </div>
  );
}
