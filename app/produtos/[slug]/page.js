import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatJPY } from '../../catalog'
import { CONTACT_EMAIL, SITE_URL } from '../../lib/config'
import { getProductBySlug, getProducts } from '../../lib/products'

// ISR: páginas estáticas que se atualizam sozinhas quando o admin edita o catálogo.
export const revalidate = 300

export async function generateStaticParams() {
  const products = await getProducts()
  return products.map(product => ({ slug: product.slug }))
}

// No Next 15+ `params` é uma Promise — acessar params.slug direto é erro.
export async function generateMetadata({ params }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Produto não encontrado' }

  const description = product.details || product.desc || 'Produto impresso em 3D pela MG3D.'
  return {
    title: product.name,
    description,
    alternates: { canonical: `/produtos/${product.slug}` },
    openGraph: {
      type: 'website',
      title: `${product.name} — MG3D`,
      description,
      url: `${SITE_URL}/produtos/${product.slug}`,
      images: product.photo_visible !== false && product.image ? [{ url: product.image, alt: product.name }] : undefined,
    },
  }
}

function availabilityLabel(product) {
  if (product.stock_quantity > 0) return `${product.stock_quantity} unidade(s) em estoque`
  if (product.allow_preorder !== false) return `Disponível por encomenda · prazo de produção: ${product.production}`
  return 'Produto esgotado no momento'
}

export default async function ProductPage({ params }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const inStock = product.stock_quantity > 0 || product.allow_preorder !== false
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.details || product.desc,
    image: product.photo_visible !== false ? product.image : undefined,
    material: product.material,
    brand: { '@type': 'Brand', name: 'MG3D' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'JPY',
      price: product.price,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/produtos/${product.slug}`,
    },
  }

  return (
    <main className="product-detail-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="product-detail-header">
        <Link className="back-link" href="/#colecao">← Voltar para a coleção</Link>
        <Link className="detail-brand" href="/" aria-label="MG3D início">
          <img src="/logo-mg.webp" alt="MG 3D Print" width="43" height="43" />
        </Link>
        <span className="detail-code">MG3D / {String(product.id).padStart(2, '0')}</span>
      </header>

      <section className="product-detail">
        <div className="detail-image">
          {product.photo_visible !== false
            ? <img src={product.image} alt={product.name} fetchPriority="high" decoding="async" />
            : <div className="detail-image-hidden">Imagem reservada para produção</div>}
          {product.badge && <span className="product-badge">{product.badge}</span>}
        </div>

        <div className="detail-copy">
          <p className="eyebrow"><span></span> {product.category} / feito no Japão</p>
          <h1>{product.name}</h1>
          <p className="detail-description">{product.details}</p>
          <div className="detail-price">{formatJPY(product.price)}</div>
          <p className="detail-production">{availabilityLabel(product)}</p>
          <div className="detail-actions">
            <Link className="button button-dark" href="/#colecao">Voltar e adicionar <span>→</span></Link>
            <a className="detail-contact" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Interesse no produto ${product.name} (MG3D)`)}`}>
              Tenho uma dúvida →
            </a>
          </div>
          <dl className="spec-grid">
            <div><dt>Material</dt><dd>{product.material}</dd></div>
            <div><dt>Dimensões</dt><dd>{product.dimensions}</dd></div>
            <div><dt>Cores</dt><dd>{product.colors}</dd></div>
            <div><dt>Produção</dt><dd>{product.production}</dd></div>
            <div>
              <dt>Disponibilidade</dt>
              <dd>{product.stock_quantity > 0 ? `${product.stock_quantity} em estoque` : (product.allow_preorder !== false ? 'Aceita encomenda' : 'Esgotado')}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="detail-note">
        <p className="eyebrow"><span></span> Cada peça tem seu tempo</p>
        <p>Projetado, impresso e finalizado no Japão. Pequenas variações fazem parte do processo e tornam cada objeto especial.</p>
      </section>
    </main>
  )
}
