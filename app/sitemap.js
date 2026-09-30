import { SITE_URL } from './lib/config'
import { getProducts } from './lib/products'

export const revalidate = 3600

export default async function sitemap() {
  const products = await getProducts()
  const now = new Date()

  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    ...products.map(product => ({
      url: `${SITE_URL}/produtos/${product.slug}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : now,
      changeFrequency: 'weekly',
      priority: 0.8,
    })),
  ]
}
