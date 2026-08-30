import Link from 'next/link'
import { notFound } from 'next/navigation'
import { products, formatJPY } from '../../catalog'

export function generateStaticParams() {
  return products.map(product => ({ slug: product.slug }))
}

export function generateMetadata({ params }) {
  const product = products.find(item => item.slug === params.slug)
  return product ? { title: `${product.name} — MG3D`, description: product.details } : {}
}

export default function ProductPage({ params }) {
  const product = products.find(item => item.slug === params.slug)
  if (!product) notFound()

  return <main className="product-detail-page">
    <header className="product-detail-header"><Link className="back-link" href="/#colecao">← Voltar para a coleção</Link><Link className="detail-brand" href="/" aria-label="MG3D início"><img src="/logo-mg.webp" alt="MG 3D Print" /></Link><span className="detail-code">MG3D / {String(product.id).padStart(2, '0')}</span></header>
    <section className="product-detail">
      <div className="detail-image"><img src={product.image} alt={product.name} />{product.badge && <span className="product-badge">{product.badge}</span>}</div>
      <div className="detail-copy"><p className="eyebrow"><span></span> {product.category} / feito no Japão</p><h1>{product.name}</h1><p className="detail-description">{product.details}</p><div className="detail-price">{formatJPY(product.price)}</div><p className="detail-production">Produção sob demanda · {product.production}</p><div className="detail-actions"><a className="button button-dark" href="/#colecao">Voltar e adicionar <span>→</span></a><a className="detail-contact" href="mailto:maicntsuda@gmail.com?subject=Interesse%20no%20produto%20MG3D">Tenho uma dúvida →</a></div><dl className="spec-grid"><div><dt>Material</dt><dd>{product.material}</dd></div><div><dt>Dimensões</dt><dd>{product.dimensions}</dd></div><div><dt>Cores</dt><dd>{product.colors}</dd></div><div><dt>Produção</dt><dd>{product.production}</dd></div></dl></div>
    </section>
    <section className="detail-note"><p className="eyebrow"><span></span> Cada peça tem seu tempo</p><p>Projetado, impresso e finalizado no Japão. Pequenas variações fazem parte do processo e tornam cada objeto especial.</p></section>
  </main>
}
