import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!raw) return undefined;
    return new URL(raw).hostname;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/sign/**",
          },
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default nextConfig;
