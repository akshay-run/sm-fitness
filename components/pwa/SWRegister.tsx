"use client";

import { useEffect } from "react";

export function SWRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onLoad = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        // no-op: app still works without SW
      }
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}

