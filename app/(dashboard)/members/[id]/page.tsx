"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatAmountINR, formatDateShortIST } from "@/lib/uiFormat";
import {
  membershipRenewalReminderMessage,
  reminderMessage,
  smsLink,
  welcomeMemberWhatsAppMessage,
  whatsappLink,
} from "@/lib/messageTemplates";

const PhotoCapture = dynamic(
  () => import("@/components/members/PhotoCapture").then((m) => m.PhotoCapture),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100" />
    ),
  }
);

type Member = {
  id: string;
  member_code: string;
  full_name: string;
  mobile: string;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  blood_group: string | null;
  joining_date: string | null;
  photo_url: string | null;
  notes: string | null;
  is_active: boolean;
  welcome_wa_sent?: boolean | null;
  created_at: string;
  updated_at: string;
};

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

type MembershipSummary = {
  plan_name: string | null;
  fee_charged: number | null;
  end_date: string | null;
  start_date: string | null;
  status: "active" | "expiring" | "expired" | "none";
  days_left: number;
};

type MembershipHistoryRow = {
  id: string;
  plan_name: string;
  fee_charged: number;
  start_date: string;
  end_date: string;
  status: string;
};

type PaymentSummary = {
  id: string;
  receipt_number: string;
  amount: number;
  payment_date: string;
  payment_mode: "cash" | "upi";
};

export default function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [welcomeWaSent, setWelcomeWaSent] = useState(false);
  const [whatsappGroupLink, setWhatsappGroupLink] = useState<string | null>(null);
  const [membership, setMembership] = useState<MembershipSummary | null>(null);
  const [membershipHistory, setMembershipHistory] = useState<MembershipHistoryRow[]>([]);
  const [ageYears, setAgeYears] = useState<number | null>(null);
  const [recentPayments, setRecentPayments] = useState<PaymentSummary[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [gymName, setGymName] = useState(process.env.NEXT_PUBLIC_GYM_NAME || "SM FITNESS");

  const idPromise = useMemo(() => params, [params]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await fetch("/api/settings", { cache: "no-store" });
        const sj = await s.json();
        if (s.ok && !cancelled) {
          if (sj.gym_name) setGymName(String(sj.gym_name));
          if (sj.whatsapp_group_link != null) setWhatsappGroupLink(String(sj.whatsapp_group_link).trim() || null);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { id } = await idPromise;
      const res = await fetch(`/api/members/${id}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!cancelled) setError(json?.error ?? "Failed to load member");
      } else {
        if (!cancelled) {
          setMember(json.member);
          setWelcomeWaSent(json.member?.welcome_wa_sent === true);
          setPhotoSignedUrl(json.photoSignedUrl ?? null);
          setMembership(json.membershipSummary ?? null);
          setRecentPayments(json.recentPayments ?? []);
          setMembershipHistory(json.membershipHistory ?? []);
          setAgeYears(typeof json.ageYears === "number" ? json.ageYears : null);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [idPromise]);

  async function deactivate() {
    if (!member) return;
    setDeactivating(true);
    try {
      const res = await fetch(`/api/members/${member.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to deactivate");
      setConfirmOpen(false);
      router.refresh();
      const r2 = await fetch(`/api/members/${member.id}`, { cache: "no-store" });
      const j2 = await r2.json();
      setMember(j2.member);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to deactivate");
    } finally {
      setDeactivating(false);
    }
  }

  async function reactivate() {
    if (!member) return;
    setReactivating(true);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to reactivate");
      setReactivateOpen(false);
      router.refresh();
      const r2 = await fetch(`/api/members/${member.id}`, { cache: "no-store" });
      const j2 = await r2.json();
      setMember(j2.member);
      setWelcomeWaSent(j2.member?.welcome_wa_sent === true);
      toast.success("Member reactivated ✓");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to reactivate");
    } finally {
      setReactivating(false);
    }
  }

  async function markWelcomeSent(memberId: string) {
    const res = await fetch(`/api/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ welcome_wa_sent: true }),
    });
    if (res.ok) setWelcomeWaSent(true);
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6 text-sm text-zinc-600">
        Loading...
      </div>
    );
  }

  if (error && !member) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!member) return null;

  const endFormatted = membership?.end_date ? formatDateShortIST(membership.end_date) : "";
  const reminder = (() => {
    if (!endFormatted) {
      return reminderMessage({
        name: member.full_name,
        endDate: "",
        daysLeft: membership?.days_left ?? 0,
      });
    }
    if (membership?.status === "expired" || (membership?.days_left ?? 0) <= 0) {
      return reminderMessage({
        name: member.full_name,
        endDate: endFormatted,
        daysLeft: 0,
      });
    }
    return membershipRenewalReminderMessage({
      memberName: member.full_name,
      expiryDate: endFormatted,
      gymName,
    });
  })();

  const memberSince =
    member.joining_date != null && String(member.joining_date).length >= 8
      ? formatDateShortIST(String(member.joining_date))
      : member.created_at
        ? formatDateShortIST(member.created_at)
        : "—";

  const dobDisplay =
    member.date_of_birth && ageYears != null
      ? `${formatDateShortIST(member.date_of_birth)} (${ageYears} yrs)`
      : member.date_of_birth
        ? formatDateShortIST(member.date_of_birth)
        : "—";

  const planName = membership?.plan_name ?? "Membership";
  const welcomeMessage =
    membership?.start_date && membership?.end_date
      ? welcomeMemberWhatsAppMessage({
          fullName: member.full_name,
          memberCode: member.member_code,
          mobile: member.mobile,
          planName,
          startDate: formatDateShortIST(membership.start_date),
          endDate: formatDateShortIST(membership.end_date),
          whatsappGroupLink,
        })
      : "";

  const showWelcomeWa =
    member.is_active &&
    Boolean(membership?.start_date && membership?.end_date) &&
    !welcomeWaSent;

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {member.full_name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">{member.member_code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/members/${member.id}/edit`}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
          >
            Edit
          </Link>
          <Link
            href={`/memberships/new?memberId=${member.id}`}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Assign membership
          </Link>
          {member.is_active ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setReactivateOpen(true)}
              className="rounded-lg border border-green-600 bg-green-50 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
            >
              Reactivate Member
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-4">
        <MembershipBanner membership={membership} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card label="Mobile" value={member.mobile} />
        {member.email?.trim() ? (
          <Card label="Email" value={member.email} />
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="text-xs font-medium text-zinc-600">Email</div>
            <div className="mt-2">
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                No email on file
              </span>
            </div>
          </div>
        )}
        <Card label="Plan" value={membership?.plan_name ?? "—"} />
        <Card
          label="Fee paid"
          value={membership?.fee_charged ? formatAmountINR(membership.fee_charged) : "—"}
        />
        <Card label="Member since" value={memberSince} />
        <Card label="Member code" value={member.member_code} />
      </div>

      <div className="mt-6">
        <PhotoCapture
          memberId={member.id}
          existingUrl={photoSignedUrl}
          onUploaded={(url) => setPhotoSignedUrl(url)}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={whatsappLink(member.mobile, reminder)}
          className="status-success rounded-lg px-3 py-2 text-center text-sm"
        >
          📱 WhatsApp
        </a>
        <a href={smsLink(member.mobile, reminder)} className="status-info rounded-lg px-3 py-2 text-center text-sm">
          💬 SMS
        </a>
        {showWelcomeWa ? (
          <a
            href={whatsappLink(member.mobile, welcomeMessage)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              void markWelcomeSent(member.id);
            }}
            className="col-span-2 flex items-center justify-center gap-2 rounded-lg border-2 border-green-600 bg-white px-3 py-2 text-center text-sm font-medium text-green-800 hover:bg-green-50"
          >
            <WhatsAppGlyph className="h-4 w-4 shrink-0" />
            Send Welcome on WhatsApp
          </a>
        ) : null}
        <button
          type="button"
          className="status-neutral rounded-lg px-3 py-2 text-sm"
          onClick={async () => {
            if (!member.email?.trim()) {
              setError("Member has no email address.");
              return;
            }
            const body = {
              member_id: member.id,
              type: "welcome",
              to: member.email.trim(),
              subject: `Welcome to ${gymName}, ${member.full_name.split(" ")[0]}! 🎉`,
              html: `<p>Hi ${member.full_name},</p><p>Thanks for being part of ${gymName}.</p>`,
              allow_duplicate: true,
            };
            const res = await fetch("/api/email", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(body),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) {
              setError(j?.error ?? "Failed to send email");
            } else if (j?.skipped) {
              setInfo("No email on file — email was not sent.");
            } else {
              setInfo("Email sent successfully.");
            }
          }}
        >
          ✉️ Send Email
        </button>
        <Link
          href={`/memberships/new?memberId=${member.id}`}
          className="status-warning rounded-lg px-3 py-2 text-center text-sm"
        >
          🔄 Renew
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card label="DOB" value={dobDisplay} />
        <Card label="Gender" value={member.gender ?? "—"} />
        <Card label="Blood group" value={member.blood_group ?? "—"} />
      </div>

      {info ? <div className="status-success mt-4 rounded-lg px-3 py-2 text-sm">{info}</div> : null}

      <div className="mt-4 grid grid-cols-1 gap-4">
        <Card label="Address" value={member.address ?? "—"} />
        <Card label="Notes" value={member.notes ?? "—"} />
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-[#1A1A2E]">Membership history</div>
        {membershipHistory.length ? (
          <div className="space-y-2">
            {membershipHistory.map((h) => (
              <div
                key={h.id}
                className="grid grid-cols-1 gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs sm:grid-cols-2"
              >
                <div className="font-medium text-zinc-900">{h.plan_name}</div>
                <div className="text-zinc-600">
                  {formatDateShortIST(h.start_date)} → {formatDateShortIST(h.end_date)}
                </div>
                <div>{formatAmountINR(h.fee_charged)}</div>
                <div className="uppercase text-zinc-500">{h.status}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500">No membership records.</div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-[#1A1A2E]">Recent payments</div>
        {recentPayments.length ? (
          <div className="space-y-2">
            {recentPayments.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-4 gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs"
              >
                <div>{p.receipt_number}</div>
                <div>{formatAmountINR(p.amount)}</div>
                <div>{formatDateShortIST(p.payment_date)}</div>
                <div className="uppercase">{p.payment_mode}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500">No payment history found.</div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Deactivate member?"
        description={`Deactivate ${member.full_name}? They will be hidden from the active list. You can reactivate them anytime from the Inactive tab. Their payment history will be preserved.`}
        confirmText={deactivating ? "Deactivating..." : "Deactivate"}
        danger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (!deactivating) void deactivate();
        }}
      />

      <ConfirmDialog
        open={reactivateOpen}
        title={`Reactivate ${member.full_name}?`}
        description={`Reactivate ${member.full_name}? They will appear in the active members list and can be assigned a new membership.`}
        confirmText={reactivating ? "Reactivating..." : "Reactivate"}
        onCancel={() => setReactivateOpen(false)}
        onConfirm={() => {
          if (!reactivating) void reactivate();
        }}
      />
    </div>
  );
}

function MembershipBanner({ membership }: { membership: MembershipSummary | null }) {
  if (!membership || membership.status === "none") {
    return (
      <div className="status-neutral rounded-xl px-4 py-3 text-sm">No membership assigned yet</div>
    );
  }
  if (membership.status === "expired") {
    return (
      <div className="status-danger rounded-xl px-4 py-3 text-sm">
        Expired on {membership.end_date ? formatDateShortIST(membership.end_date) : "-"} - Please renew
      </div>
    );
  }
  if (membership.status === "expiring") {
    return (
      <div className="status-warning rounded-xl px-4 py-3 text-sm">
        ⚠ Expires in {membership.days_left} days -{" "}
        {membership.end_date ? formatDateShortIST(membership.end_date) : "-"}
      </div>
    );
  }
  return (
    <div className="status-success rounded-xl px-4 py-3 text-sm">
      Active until {membership.end_date ? formatDateShortIST(membership.end_date) : "-"} (
      {membership.days_left} days left)
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-xs font-medium text-zinc-600">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">{value}</div>
    </div>
  );
}
