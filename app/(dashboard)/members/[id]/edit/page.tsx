"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MemberForm } from "@/components/members/MemberForm";
import type { CreateMemberInput } from "@/lib/validations/member.schema";

type Member = {
  id: string;
  full_name: string;
  mobile: string;
  email: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
};

export default function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (!cancelled) setMember(json.member);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [idPromise]);

  async function save(data: CreateMemberInput) {
    if (!member) return;
    const res = await fetch(`/api/members/${member.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "Failed to update member");

    router.replace(`/members/${member.id}`);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl p-6 text-sm text-zinc-600">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-3xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Edit member
        </h1>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <MemberForm
          initial={{
            full_name: member.full_name,
            mobile: member.mobile,
            email: member.email ?? "",
            date_of_birth: member.date_of_birth ?? "",
            gender: member.gender ?? undefined,
            address: member.address ?? "",
            emergency_contact_name: member.emergency_contact_name ?? "",
            emergency_contact_phone: member.emergency_contact_phone ?? "",
            notes: member.notes ?? "",
          }}
          submitLabel="Save changes"
          onSubmit={save}
        />
      </div>
    </div>
  );
}

