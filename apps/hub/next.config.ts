import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship as TypeScript source (no build step) — Next must transpile them.
  transpilePackages: ['@physics/core'],
  serverExternalPackages: ['yaml'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
