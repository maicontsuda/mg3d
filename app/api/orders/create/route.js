import { createClient } from '@supabase/supabase-js'
import { MG3D_SUPABASE_URL } from '../../../lib/supabase-config'

const ADMIN_EMAIL = 'maicontsuda@gmail.com'
const MAX_DISTINCT_ITEMS = 25
const MAX_ITEM_QUANTITY = 50

function publicSupabaseKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.SUPABASE_PUBLISHABLE_KEY
}

function normalizeItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > MAX_DISTINCT_ITEMS) return null

  const quantities = new Map()
  for (const item of items) {
    const productId = Number(item?.productId)
    const quantity = Number(item?.quantity)
    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_ITEM_QUANTITY) return null
    quantities.set(productId, (quantities.get(productId) || 0) + quantity)
    if (quantities.get(productId) > MAX_ITEM_QUANTITY) return null
  }

  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }))
}

export async function POST(request) {
  const authorization = request.headers.get('authorization')
  const publishableKey = publicSupabaseKey()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!authorization?.startsWith('Bearer ')) return Response.json({ error: 'Faça login para enviar o pedido.' }, { status: 401 })
  if (!publishableKey || !serviceRoleKey) return Response.json({ error: 'O registro de pedidos ainda não está configurado no servidor.' }, { status: 503 })

  const authClient = createClient(MG3D_SUPABASE_URL, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: userError } = await authClient.auth.getUser()
  if (userError || !user) return Response.json({ error: 'Sua sessão expirou. Entre novamente para continuar.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const requestedItems = normalizeItems(body.items)
  if (!requestedItems) return Response.json({ error: 'O carrinho contém itens inválidos.' }, { status: 400 })

  const database = createClient(MG3D_SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const productIds = requestedItems.map(item => item.productId)
  const { data: products, error: productsError } = await database
    .from('products')
    .select('id,name,price,stock_quantity,allow_preorder,active')
    .in('id', productIds)
    .eq('active', true)

  if (productsError) return Response.json({ error: 'Não foi possível conferir o catálogo. Tente novamente.' }, { status: 500 })
  if (products?.length !== productIds.length) return Response.json({ error: 'Um dos produtos não está mais disponível.' }, { status: 409 })

  const productsById = new Map(products.map(product => [Number(product.id), product]))
  const orderItems = []
  let total = 0

  for (const requested of requestedItems) {
    const product = productsById.get(requested.productId)
    const stock = Number(product.stock_quantity || 0)
    if (product.allow_preorder === false && requested.quantity > stock) {
      return Response.json({ error: `${product.name} possui apenas ${stock} unidade(s) disponível(is).` }, { status: 409 })
    }

    const unitPrice = Number(product.price)
    total += unitPrice * requested.quantity
    orderItems.push({
      product_id: Number(product.id),
      product_name: product.name,
      unit_price: unitPrice,
      quantity: requested.quantity,
    })
  }

  const customer = {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente MG3D',
    is_admin: user.email?.toLowerCase() === ADMIN_EMAIL,
  }
  const { error: customerError } = await database.from('customers').upsert(customer)
  if (customerError) return Response.json({ error: 'Não foi possível atualizar os dados do cliente.' }, { status: 500 })

  const { data: order, error: orderError } = await database
    .from('orders')
    .insert({ customer_id: user.id, total, status: 'pending' })
    .select()
    .single()
  if (orderError) return Response.json({ error: 'Não foi possível registrar o pedido.' }, { status: 500 })

  const itemsToInsert = orderItems.map(item => ({ ...item, order_id: order.id }))
  const { data: savedItems, error: itemsError } = await database.from('order_items').insert(itemsToInsert).select()
  if (itemsError) {
    await database.from('orders').delete().eq('id', order.id)
    return Response.json({ error: 'Não foi possível registrar os itens do pedido.' }, { status: 500 })
  }

  return Response.json({ order: { ...order, order_items: savedItems }, items: savedItems, total })
}
