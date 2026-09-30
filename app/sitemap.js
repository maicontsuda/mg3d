import { products } from './catalog'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mg3d.vercel.app'

export default function sitemap() {
  const now = new Date()
  const pages = [
    { path: '', priority: 1, changeFrequency: 'weekly' },
    { path: '/envios-e-trocas', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/cuidados', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/privacidade', priority: 0.3, changeFrequency: 'yearly' },
  ]

  return [
    ...pages.map(page => ({ url: `${baseUrl}${page.path}`, lastModified: now, changeFrequency: page.changeFrequency, priority: page.priority })),
    ...products.map(product => ({ url: `${baseUrl}/produtos/${product.slug}`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 })),
  ]
}
