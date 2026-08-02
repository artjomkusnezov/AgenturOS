import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.178.77'],
  experimental: {
    serverActions: {
      bodySizeLimit: '52mb',
    },
  },
}

export default nextConfig
