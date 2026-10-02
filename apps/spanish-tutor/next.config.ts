import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship as TypeScript source (no build step) — Next must transpile them
  // itself rather than treating them as pre-built node_modules.
  transpilePackages: ['@physics/core', '@physics/checker'],
  serverExternalPackages: ['yaml'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
