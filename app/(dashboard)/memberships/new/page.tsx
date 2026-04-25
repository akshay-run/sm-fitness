"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MembershipForm } from "@/components/memberships/MembershipForm";
import { FlowSteps } from "@/components/ui/FlowSteps";

type Plan = { id: string; name: string; duration_months: number; default_price?: number | null };

export default function NewMembershipPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId = searchParams.get("memberId") || "";

  const [plans, setPlans] = useState<Plan[]>([]);
  const [memberName, setMemberName] = useState<string>("");
  const [latestActiveEndDate, setLatestActiveEndDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!memberId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [plansRes, memberRes] = await Promise.all([
          fetch("/api/plans", { cache: "no-store" }),
          fetch(`/api/members/${memberId}`, { cache: "no-store" }),
        ]);
        const plansJson = await plansRes.json();
        const memberJson = await memberRes.json();
        if (!plansRes.ok) throw new Error(plansJson?.error ?? "Failed to load plans");
        if (!memberRes.ok) throw new Error(memberJson?.error ?? "Failed to load member");

        if (!cancelled) {
          setPlans(plansJson.plans ?? []);
          setMemberName(memberJson.member?.full_name ?? "");
          setLatestActiveEndDate(
            memberJson.latest_active_end_date != null
              ? String(memberJson.latest_active_end_date)
              : null
          );
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  if (!memberId) {
    return (
      <div className="mx-auto w-full max-w-3xl p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Save membership
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Open a member profile and click “Start membership”.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Save membership
        </h1>
        <FlowSteps
          steps={["Add member", "Start membership", "Record payment"]}
          shortLabels={["Info", "Plan", "Pay"]}
          currentStep={2}
        />
        <p className="mt-1 text-sm text-zinc-600">
          Member: <span className="font-medium text-zinc-900">{memberName || "…"}</span>
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-600">Loading...</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No active plans found. Seed the `plans` table first.
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <MembershipForm
            memberId={memberId}
            plans={plans}
            latestActiveEndDate={latestActiveEndDate}
            onCreated={({ id }) => {
              toast.success("Membership started ✓");
              router.replace(`/payments?membershipId=${id}&flow=new_member`);
            }}
          />
        </div>
      )}
    </div>
  );
}

