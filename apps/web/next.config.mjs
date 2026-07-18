/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint is run explicitly via `pnpm lint`; don't fail the build on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
