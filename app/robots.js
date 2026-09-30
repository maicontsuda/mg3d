const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mg3d.vercel.app'

export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/admin/'] },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
