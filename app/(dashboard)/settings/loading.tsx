import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-6">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
