import Link from 'next/link'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { products, formatJPY } from '../../catalog'
import { MG3D_SUPABASE_URL } from '../../lib/supabase-config'

export const revalidate = 60

export function generateStaticParams() {
  return products.map(product => ({ slug: product.slug }))
}

const getProduct = cache(async slug => {
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.SUPABASE_PUBLISHABLE_KEY

  if (publishableKey) {
    try {
      const supabase = createClient(MG3D_SUPABASE_URL, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data } = await supabase.from('products').select('*').eq('slug', slug).eq('active', true).maybeSingle()
      if (data) {
        return {
          ...data,
          desc: data.description || '',
          stock_quantity: Number(data.stock_quantity || 0),
          allow_preorder: data.allow_preorder !== false,
          photo_visible: data.photo_visible !== false,
        }
      }
    } catch {
      // Keep the demonstrative catalog available if Supabase is temporarily unreachable.
    }
  }

  return products.find(item => item.slug === slug) || null
})

export async function generateMetadata({ params }) {
  const { slug } = await params
  const product = await getProduct(slug)
  return product ? { title: `${product.name} — MG3D`, description: product.details } : {}
}

export default async function ProductPage({ params }) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()
  const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/\D/g, '')
  const contactHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre ${product.name}.`)}`
    : 'mailto:maicntsuda@gmail.com?subject=Interesse%20no%20produto%20MG3D'

  return <main className="product-detail-page">
    <header className="product-detail-header"><Link className="back-link" href="/#colecao">← Voltar para a coleção</Link><Link className="detail-brand" href="/" aria-label="MG3D início"><img src="/logo-mg.webp" alt="MG 3D Print" /></Link><span className="detail-code">MG3D / {String(product.id).padStart(2, '0')}</span></header>
    <section className="product-detail">
      <div className="detail-image">{product.photo_visible !== false ? <img src={product.image} alt={product.name} /> : <div className="detail-image-hidden">Imagem reservada para produção</div>}{product.badge && <span className="product-badge">{product.badge}</span>}</div>
      <div className="detail-copy"><p className="eyebrow"><span></span> {product.category} / feito no Japão</p><h1>{product.name}</h1><p className="detail-description">{product.details}</p><div className="detail-price">{formatJPY(product.price)}</div><p className="detail-production">{product.stock_quantity > 0 ? `${product.stock_quantity} unidade(s) em estoque` : (product.allow_preorder !== false ? `Disponível por encomenda · prazo de produção: ${product.production}` : 'Produto esgotado no momento')}</p><div className="detail-actions"><Link className="button button-dark" href="/#colecao">Voltar ao catálogo <span>→</span></Link><a className="detail-contact" href={contactHref}>Falar pelo WhatsApp →</a></div><dl className="spec-grid"><div><dt>Material</dt><dd>{product.material}</dd></div><div><dt>Dimensões</dt><dd>{product.dimensions}</dd></div><div><dt>Cores</dt><dd>{product.colors}</dd></div><div><dt>Produção</dt><dd>{product.production}</dd></div><div><dt>Disponibilidade</dt><dd>{product.stock_quantity > 0 ? `${product.stock_quantity} em estoque` : (product.allow_preorder !== false ? 'Aceita encomenda' : 'Esgotado')}</dd></div></dl></div>
    </section>
    <section className="detail-note"><p className="eyebrow"><span></span> Cada peça tem seu tempo</p><p>Projetado, impresso e finalizado no Japão. Pequenas variações fazem parte do processo e tornam cada objeto especial.</p></section>
  </main>
}
