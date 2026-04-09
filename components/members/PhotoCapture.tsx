"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { compressImageToJpeg } from "@/lib/imageCompress";

type Props = {
  memberId: string;
  existingUrl?: string | null;
  onUploaded: (signedUrl: string | null) => void;
};

export function PhotoCapture({ memberId, existingUrl, onUploaded }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<"upload" | "camera">("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(existingUrl ?? null);
  }, [existingUrl]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  async function startCamera() {
    setError(null);
    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to access camera");
      setMode("upload");
    } finally {
      setBusy(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function uploadBlob(blob: Blob) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", blob, "photo.jpg");

      const res = await fetch(`/api/members/${memberId}/photo`, {
        method: "POST",
        body: form,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Upload failed");

      setPreviewUrl(json?.signedUrl ?? null);
      onUploaded(json?.signedUrl ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onFilePicked(file: File) {
    const blob = await compressImageToJpeg(file, { maxBytes: 200 * 1024 });
    await uploadBlob(blob);
  }

  async function captureFromCamera() {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Capture failed"))),
        "image/jpeg",
        0.92
      );
    });

    const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
    const compressed = await compressImageToJpeg(file, { maxBytes: 200 * 1024 });
    await uploadBlob(compressed);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Photo</div>
          <div className="text-xs text-zinc-600">Compressed to &lt; 200KB</div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={[
              "rounded-lg px-3 py-2 text-xs",
              mode === "upload"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 hover:bg-zinc-50",
            ].join(" ")}
            onClick={() => {
              stopCamera();
              setMode("upload");
            }}
            disabled={busy}
          >
            Upload
          </button>
          <button
            type="button"
            className={[
              "rounded-lg px-3 py-2 text-xs",
              mode === "camera"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 hover:bg-zinc-50",
            ].join(" ")}
            onClick={async () => {
              setMode("camera");
              await startCamera();
            }}
            disabled={busy}
          >
            Camera
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-xs font-medium text-zinc-700">Preview</div>
          <div className="mt-3 flex items-center justify-center">
            {previewUrl ? (
              <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <Image src={previewUrl} alt="Member photo" fill className="object-cover" />
              </div>
            ) : (
              <div className="h-40 w-40 rounded-xl border border-dashed border-zinc-300 bg-white flex items-center justify-center text-xs text-zinc-500">
                No photo
              </div>
            )}
          </div>
        </div>

        {mode === "upload" ? (
          <div className="rounded-xl border border-zinc-200 p-3">
            <div className="text-xs font-medium text-zinc-700">Upload</div>
            <p className="mt-2 text-xs text-zinc-600">
              Choose an image. We’ll compress it before upload.
            </p>
            <input
              className="mt-3 block w-full text-xs"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFilePicked(f);
              }}
              disabled={busy}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 p-3">
            <div className="text-xs font-medium text-zinc-700">Camera</div>
            <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-black">
              <video ref={videoRef} className="h-40 w-full object-cover" playsInline />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void captureFromCamera()}
                disabled={busy || !streamRef.current}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {busy ? "Working..." : "Capture & upload"}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setMode("upload");
                }}
                disabled={busy}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs hover:bg-zinc-50"
              >
                Stop
              </button>
            </div>
          </div>
        )}
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}

