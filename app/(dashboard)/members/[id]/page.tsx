"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PhotoCapture } from "@/components/members/PhotoCapture";
import { formatAmountINR, formatDateShortIST } from "@/lib/uiFormat";
import { reminderMessage, smsLink, whatsappLink } from "@/lib/messageTemplates";

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
  created_at: string;
  updated_at: string;
};

type MembershipSummary = {
  plan_name: string | null;
  fee_charged: number | null;
  end_date: string | null;
  start_date: string | null;
  status: "active" | "expiring" | "expired" | "none";
  days_left: number;
};

type MembershipHistory = {
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

function calculateAge(dob: string | null) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const diffMs = Date.now() - birthDate.getTime();
  const ageDt = new Date(diffMs);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}

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
  const [deactivating, setDeactivating] = useState(false);
  const [membership, setMembership] = useState<MembershipSummary | null>(null);
  const [recentPayments, setRecentPayments] = useState<PaymentSummary[]>([]);
  const [membershipHistory, setMembershipHistory] = useState<MembershipHistory[]>([]);
  const [info, setInfo] = useState<string | null>(null);

  const idPromise = useMemo(() => params, [params]);

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
          setPhotoSignedUrl(json.photoSignedUrl ?? null);
          setMembership(json.membershipSummary ?? null);
          setRecentPayments(json.recentPayments ?? []);
          setMembershipHistory(json.membershipHistory ?? []);
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
      // Reload member
      const r2 = await fetch(`/api/members/${member.id}`, { cache: "no-store" });
      const j2 = await r2.json();
      setMember(j2.member);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to deactivate");
    } finally {
      setDeactivating(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6 text-sm text-zinc-600">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!member) return null;
  const reminder = reminderMessage({
    name: member.full_name,
    endDate: membership?.end_date ? formatDateShortIST(membership.end_date) : "",
    daysLeft: membership?.days_left ?? 0,
  });

  const age = calculateAge(member.date_of_birth);

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {member.full_name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">{member.member_code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/members/${member.id}/edit`}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
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
            <span className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-500">
              Inactive
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <MembershipBanner membership={membership} />
      </div>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card label="Mobile" value={member.mobile} />
        <Card label="Email" value={member.email ?? "—"} />
        <Card label="Plan" value={membership?.plan_name ?? "—"} />
        <Card label="Fee paid" value={membership?.fee_charged ? formatAmountINR(membership.fee_charged) : "—"} />
        <Card label="Join Date" value={member.joining_date ? formatDateShortIST(member.joining_date) : (member.created_at ? formatDateShortIST(member.created_at) : "—")} />
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
        <a target="_blank" rel="noopener noreferrer" href={`https://wa.me/${member.mobile}?text=${encodeURIComponent(reminder)}`} className="status-success rounded-lg px-3 py-2 text-center text-sm hover:opacity-90">
          📱 WhatsApp
        </a>
        <a href={smsLink(member.mobile, reminder)} className="status-info rounded-lg px-3 py-2 text-center text-sm hover:opacity-90">
          💬 SMS
        </a>
        <button
          type="button"
          className="status-neutral rounded-lg px-3 py-2 text-sm hover:opacity-90 transition-opacity"
          onClick={async () => {
            if (!member.email) {
              setError("Member has no email address.");
              return;
            }
            const body = {
              member_id: member.id,
              type: "welcome",
              to: member.email,
              subject: `Welcome to SM FITNESS, ${member.full_name.split(" ")[0]}! 🎉`,
              html: `<p>Hi ${member.full_name},</p><p>Thanks for being part of SM FITNESS.</p>`,
              allow_duplicate: true,
            };
            const res = await fetch("/api/email", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(body),
            });
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              setError(j?.error ?? "Failed to send email");
            } else {
              setInfo("Email sent successfully.");
            }
          }}
        >
          ✉️ Send Email
        </button>
        <Link
          href={`/memberships/new?memberId=${member.id}`}
          className="status-warning rounded-lg px-3 py-2 text-center text-sm hover:opacity-90"
        >
          🔄 Renew
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card label="DOB" value={member.date_of_birth ? `${member.date_of_birth} (${age} yrs)` : "—"} />
        <Card label="Gender" value={member.gender ?? "—"} className="capitalize" />
        <Card label="Blood Group" value={member.blood_group ?? "—"} />
      </div>

      {info ? <div className="status-success mt-4 rounded-lg px-3 py-2 text-sm">{info}</div> : null}

      <div className="mt-4 grid grid-cols-1 gap-4">
        <Card label="Address" value={member.address ?? "—"} />
        <Card label="Notes" value={member.notes ?? "—"} className="bg-amber-50" />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-4 text-sm font-semibold text-[#1A1A2E]">Recent Payments</div>
          {recentPayments.length ? (
            <div className="space-y-2">
              {recentPayments.map((p) => (
                <div key={p.id} className="grid grid-cols-4 gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs">
                  <div className="text-zinc-500">#{p.receipt_number}</div>
                  <div className="font-medium">{formatAmountINR(p.amount)}</div>
                  <div>{formatDateShortIST(p.payment_date)}</div>
                  <div className="uppercase text-end text-zinc-500">{p.payment_mode}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm border border-dashed rounded-xl text-slate-500">No payment history found.</div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-4 text-sm font-semibold text-[#1A1A2E]">Membership History</div>
          {membershipHistory.length ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {membershipHistory.map((m) => (
                <div key={m.id} className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs">
                  <div className="font-medium truncate">{m.plan_name}</div>
                  <div>{formatDateShortIST(m.start_date)} to {formatDateShortIST(m.end_date)}</div>
                  <div className="text-end">
                    {m.status === "cancelled" ? (
                      <span className="text-red-500 font-medium whitespace-nowrap">Cancelled</span>
                    ) : (
                      <span>{formatAmountINR(m.fee_charged)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm border border-dashed rounded-xl text-slate-500">No past memberships.</div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Deactivate member?"
        description="This will set is_active=false. The member will not be able to interact with the facility, but their data is safely preserved."
        confirmText={deactivating ? "Deactivating..." : "Deactivate"}
        danger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (!deactivating) void deactivate();
        }}
      />
    </div>
  );
}

function MembershipBanner({ membership }: { membership: MembershipSummary | null }) {
  if (!membership || membership.status === "none") {
    return <div className="status-neutral rounded-xl px-4 py-3 text-sm">No membership assigned yet</div>;
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
      <div className="status-warning rounded-xl px-4 py-3 text-sm flex gap-2">
        <span>⚠</span> Expires in {membership.days_left} days ({membership.end_date ? formatDateShortIST(membership.end_date) : "-"})
      </div>
    );
  }
  return (
    <div className="status-success rounded-xl px-4 py-3 text-sm">
      Active until {membership.end_date ? formatDateShortIST(membership.end_date) : "-"} ({membership.days_left} days left)
    </div>
  );
}

function Card({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white p-4 ${className}`}>
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-zinc-900 whitespace-pre-wrap">{value}</div>
    </div>
  );
}
