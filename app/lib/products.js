import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'
import { products as fallbackProducts } from '../catalog'

// Cliente somente-leitura usado durante o build/SSR das páginas públicas.
const publicClient = SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  : null

const SELECT = 'id,slug,name,category,price,color,badge,image,description,details,material,dimensions,production,colors,stock_quantity,allow_preorder,photo_visible,active'

export function normalizeProduct(item) {
  return {
    ...item,
    desc: item.desc ?? item.description ?? '',
    details: item.details || '',
    stock_quantity: Number(item.stock_quantity || 0),
    allow_preorder: item.allow_preorder !== false,
    photo_visible: item.photo_visible !== false,
    active: item.active !== false,
  }
}

/** Catálogo público. Usa o Supabase e cai no catálogo estático se ele falhar. */
export async function getProducts() {
  if (!publicClient) return fallbackProducts.map(normalizeProduct)
  try {
    const { data, error } = await publicClient.from('products').select(SELECT).eq('active', true).order('id')
    if (error || !data?.length) return fallbackProducts.map(normalizeProduct)
    return data.map(normalizeProduct)
  } catch {
    return fallbackProducts.map(normalizeProduct)
  }
}

/**
 * Busca um produto pelo slug.
 * Antes a página de produto só conhecia o catálogo estático, então qualquer
 * produto criado no painel admin devolvia 404.
 */
export async function getProductBySlug(slug) {
  if (publicClient) {
    try {
      const { data } = await publicClient.from('products').select(SELECT).eq('slug', slug).eq('active', true).maybeSingle()
      if (data) return normalizeProduct(data)
    } catch {
      // segue para o fallback estático
    }
  }
  const local = fallbackProducts.find(item => item.slug === slug)
  return local ? normalizeProduct(local) : null
}
