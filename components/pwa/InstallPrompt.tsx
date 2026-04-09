"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (!deferred || hidden) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm rounded-xl border border-zinc-200 bg-white p-4 shadow-lg print:hidden">
      <div className="text-sm font-semibold text-zinc-900">Install SM FITNESS</div>
      <p className="mt-1 text-xs text-zinc-600">
        Add this app to your home screen for quicker access.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          }}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
        >
          Install
        </button>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-xs hover:bg-zinc-50"
        >
          Later
        </button>
      </div>
    </div>
  );
}

