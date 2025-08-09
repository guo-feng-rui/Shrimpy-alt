import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for development
  typescript: {
    // Don't fail build on type errors during development
    ignoreBuildErrors: true,
  },
  eslint: {
    // Don't fail production builds on ESLint errors
    ignoreDuringBuilds: true,
  },
  // Disable source maps in development for better performance
  productionBrowserSourceMaps: false,
};

export default nextConfig;
