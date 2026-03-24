import type { NextConfig } from 'next'

// Extract hostname from NEXT_PUBLIC_APP_URL so this works on any machine
// e.g. http://192.168.1.101:3001  →  '192.168.1.101'
// Change the IP in .env.local and restart — no code changes needed
function getDevOrigins(): string[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return []
  try {
    const { hostname } = new URL(appUrl)
    return hostname !== 'localhost' ? [hostname] : []
  } catch {
    return []
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getDevOrigins(),

  turbopack: {},

  webpack(config, { isServer }) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    }
    if (isServer) {
      const externals = Array.isArray(config.externals) ? config.externals : []
      config.externals = [
        ...externals,
        'onnxruntime-web',
        '@imgly/background-removal',
      ]
    }
    return config
  },
}

export default nextConfig
