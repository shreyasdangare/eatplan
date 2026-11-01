const buildId = (process.env.VERCEL_GIT_COMMIT_SHA ?? `local-${Date.now()}`).slice(0, 12);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep visited server-rendered tabs (Home, Recipes) in the client Router Cache so switching
    // tabs doesn't re-run the server render each time. Data changes call router.refresh()
    // (see app/components/SWRProvider.tsx), which purges this cache.
    staleTimes: { dynamic: 60, static: 300 },
  },
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  async headers() {
    return [
      {
        // The service worker must always be revalidated so new deploys take over promptly.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:file(icon-192.png|icon-512.png|icon-512-maskable.png|logo.png)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
