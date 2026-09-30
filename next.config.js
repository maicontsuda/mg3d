/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production'

const baseHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
]

// Clickjacking e HSTS só em produção: em dev o app roda dentro de previews
// embutidos em iframe (Arena, Vercel preview, Codespaces).
const productionHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const securityHeaders = isProduction ? [...baseHeaders, ...productionHeaders] : baseHeaders

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' }],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Respostas de API (incluindo o webhook do Stripe) nunca devem ser cacheadas.
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ]
  },
}

module.exports = nextConfig
