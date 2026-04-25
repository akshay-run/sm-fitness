"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MemberForm } from "@/components/members/MemberForm";
import { FlowSteps } from "@/components/ui/FlowSteps";
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
      throw new Error(json?.error ?? "Could not save. Please check your connection.");
    }

    toast.success("Member added successfully ✓");
    router.replace(`/members/${json.id}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          New Member
        </h1>
        <FlowSteps
          steps={["Add member", "Start membership", "Record payment"]}
          shortLabels={["Info", "Plan", "Pay"]}
          currentStep={1}
        />
        <p className="mt-1 text-sm text-zinc-600">
          Full name and mobile are required. Email is optional but recommended for receipts.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <MemberForm submitLabel="Save member" onSubmit={createMember} />
      </div>
    </div>
  );
}

