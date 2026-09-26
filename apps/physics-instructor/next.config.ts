import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lesson content is read from disk per request; these packages are server-only.
  serverExternalPackages: ['yaml'],
  experimental: {
    // Keeps MDX compilation off the client bundle.
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
