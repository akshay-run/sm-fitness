"use client";

type AvatarSize = "sm" | "md" | "lg";

const sizeMap: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-base",
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${second}`.toUpperCase();
}

function colorFromName(name: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue} 70% 92%)`,
    fg: `hsl(${hue} 55% 32%)`,
  };
}

export function AvatarFallback({
  name,
  photoUrl,
  size = "md",
}: {
  name: string;
  photoUrl?: string | null;
  size?: AvatarSize;
}) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt={name} className={`${sizeMap[size]} rounded-full object-cover`} />;
  }
  const palette = colorFromName(name);
  return (
    <div
      className={`flex ${sizeMap[size]} items-center justify-center rounded-full font-semibold`}
      style={{ backgroundColor: palette.bg, color: palette.fg }}
      aria-label={`${name} avatar`}
    >
      {initialsFromName(name)}
    </div>
  );
}
