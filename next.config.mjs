/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externalsToAdd = {
        ws: "commonjs ws",
        bufferutil: "commonjs bufferutil",
        "utf-8-validate": "commonjs utf-8-validate",
      }

      if (Array.isArray(config.externals)) {
        config.externals.push(externalsToAdd)
      } else if (typeof config.externals === "function") {
        const original = config.externals
        config.externals = async (...args) => {
          const result = await original(...args)
          return Array.isArray(result) ? [...result, externalsToAdd] : [result, externalsToAdd]
        }
      }
    }

    return config
  },
  images: {
    domains: [
      'localhost',
      'api.dicebear.com',
      'images.unsplash.com',
      'plus.unsplash.com',
      'blob.v0.app'
    ],
  },
  serverExternalPackages: ["ws"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.vercel.app']
    },
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  }
}

export default nextConfig
