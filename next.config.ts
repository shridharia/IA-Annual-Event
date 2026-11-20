import type { NextConfig } from "next";

const security = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: __dirname },
  // Short links to the design variations: v1 = Next.js "Doorway" app, v2-v4 = static design prototypes in /public.
  async rewrites() {
    return [
      { source: "/v1", destination: "/" },
      { source: "/v2", destination: "/prototype.html" },
      { source: "/v3", destination: "/variations/aurora.html" },
      { source: "/v4", destination: "/variations/poster.html" },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: security },
      // The service worker must never be served stale, or updates can't propagate.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      // Design previews shouldn't be indexed by search engines.
      ...["/v2", "/v3", "/v4", "/prototype.html", "/variations/:path*"].map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
      { source: "/organizer/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};
export default nextConfig;
