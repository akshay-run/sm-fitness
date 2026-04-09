"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

const KEY = "smf_last_activity_ms";
const INACTIVITY_MS = 30 * 60 * 1000;

export function AutoLogout() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    const writeNow = () => {
      try {
        localStorage.setItem(KEY, String(Date.now()));
      } catch {
        // ignore
      }
    };

    const readLast = () => {
      try {
        const raw = localStorage.getItem(KEY);
        const num = raw ? Number(raw) : NaN;
        return Number.isFinite(num) ? num : Date.now();
      } catch {
        return Date.now();
      }
    };

    writeNow();

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    const onActivity = () => writeNow();
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    const timer = window.setInterval(async () => {
      const last = readLast();
      if (Date.now() - last <= INACTIVITY_MS) return;

      await supabase.auth.signOut();
      try {
        localStorage.removeItem(KEY);
      } catch {
        // ignore
      }
      router.replace("/login");
      router.refresh();
    }, 15_000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      window.clearInterval(timer);
    };
  }, [router, supabase]);

  return null;
}

