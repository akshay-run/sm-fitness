"use client";

import { useRouter } from "next/navigation";
import { MemberForm } from "@/components/members/MemberForm";
import type { CreateMemberInput } from "@/lib/validations/member.schema";

export default function NewMemberPage() {
  const router = useRouter();

  async function createMember(data: CreateMemberInput) {
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error ?? "Failed to create member");
    }

    router.replace(`/members/${json.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Add member
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Mobile is required. Email is optional.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <MemberForm submitLabel="Create member" onSubmit={createMember} />
      </div>
    </div>
  );
}

