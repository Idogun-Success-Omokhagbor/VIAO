/** @type {import('next').NextConfig} */
const localOrigins = [
  "localhost:3000",
  "localhost:3001",
  "localhost:10000",
  "127.0.0.1:3000",
  "127.0.0.1:3001",
  "127.0.0.1:10000",
]

const appOriginHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || "").host || null
  } catch {
    return null
  }
})()

const allowedOrigins = Array.from(
  new Set([
    ...localOrigins,
    ...(appOriginHost ? [appOriginHost] : []),
    "*.vercel.app",
  ]),
)

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
    optimizePackageImports: ["lucide-react", "antd", "@ant-design/icons"],
    serverActions: {
      allowedOrigins,
    },
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  }
}

export default nextConfig
