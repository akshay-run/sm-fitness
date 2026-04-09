"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PhotoCapture } from "@/components/members/PhotoCapture";

type Member = {
  id: string;
  member_code: string;
  full_name: string;
  mobile: string;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  photo_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  const [deactivating, setDeactivating] = useState(false);

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

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {member.full_name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">{member.member_code}</p>
        </div>
        <div className="flex gap-2">
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
            <span className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-500">
              Inactive
            </span>
          )}
        </div>
      </div>

      <div className="mt-6">
        <PhotoCapture
          memberId={member.id}
          existingUrl={photoSignedUrl}
          onUploaded={(url) => setPhotoSignedUrl(url)}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card label="Mobile" value={member.mobile} />
        <Card label="Email" value={member.email ?? "—"} />
        <Card label="DOB" value={member.date_of_birth ?? "—"} />
        <Card label="Gender" value={member.gender ?? "—"} />
        <Card label="Emergency name" value={member.emergency_contact_name ?? "—"} />
        <Card label="Emergency phone" value={member.emergency_contact_phone ?? "—"} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <Card label="Address" value={member.address ?? "—"} />
        <Card label="Notes" value={member.notes ?? "—"} />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Deactivate member?"
        description="This will set is_active=false. Data will not be deleted."
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

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-xs font-medium text-zinc-600">{label}</div>
      <div className="mt-1 text-sm text-zinc-900 whitespace-pre-wrap">{value}</div>
    </div>
  );
}

