/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep visited server-rendered tabs (Home, Recipes) in the client Router Cache so switching
    // tabs doesn't re-run the server render each time. Data changes call router.refresh()
    // (see app/components/SWRProvider.tsx), which purges this cache.
    staleTimes: { dynamic: 60, static: 300 },
  },
};

export default nextConfig;

