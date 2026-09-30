import Stripe from 'stripe'
import { SITE_URL } from '../../../lib/config'
import { authenticateRequest, createServiceClient } from '../../../lib/supabase-server'

export const dynamic = 'force-dynamic'

const MAX_LINES = 30
const MAX_QUANTITY = 99
const STRIPE_JPY_MINIMUM = 50

const fail = (error, status) => Response.json({ error }, { status })

/**
 * Normaliza o carrinho recebido do navegador.
 * O cliente só pode dizer O QUE quer e QUANTO quer — nunca o preço.
 */
function parseItems(body) {
  const rawItems = Array.isArray(body.items) ? body.items : []
  if (!rawItems.length || rawItems.length > MAX_LINES) return null

  const merged = new Map()
  for (const item of rawItems) {
    const productId = Number(item?.productId ?? item?.id)
    const quantity = Number(item?.quantity ?? item?.qty)
    if (!Number.isInteger(productId) || productId <= 0) return null
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) return null
    merged.set(productId, Math.min(MAX_QUANTITY, (merged.get(productId) || 0) + quantity))
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }))
}

export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return fail('Stripe ainda não está configurado no servidor.', 503)
  }

  const auth = await authenticateRequest(request)
  if (auth.error) return fail(auth.error, auth.status)
  const { user } = auth

  const body = await request.json().catch(() => ({}))
  const items = parseItems(body)
  if (!items) return fail('Carrinho inválido.', 400)

  // A service role key permite criar o pedido com preços confiáveis mesmo que a
  // RLS bloqueie escrita direta do cliente. Sem ela, caímos no token do usuário.
  const db = createServiceClient() || auth.client

  const { data: products, error: productsError } = await db
    .from('products')
    .select('id,name,price,stock_quantity,allow_preorder,active')
    .in('id', items.map(item => item.productId))

  if (productsError) return fail(`Não foi possível carregar os produtos: ${productsError.message}`, 500)

  const byId = new Map((products || []).map(product => [Number(product.id), product]))
  const lines = []

  for (const item of items) {
    const product = byId.get(item.productId)
    if (!product || product.active === false) {
      return fail('Um dos produtos do carrinho não está mais disponível.', 409)
    }
    const stock = Number(product.stock_quantity || 0)
    const allowPreorder = product.allow_preorder !== false
    if (stock <= 0 && !allowPreorder) {
      return fail(`"${product.name}" está esgotado e não aceita encomendas.`, 409)
    }
    if (!allowPreorder && item.quantity > stock) {
      return fail(`Só temos ${stock} unidade(s) de "${product.name}" em estoque.`, 409)
    }
    const unitPrice = Math.round(Number(product.price))
    if (!Number.isInteger(unitPrice) || unitPrice <= 0) {
      return fail(`"${product.name}" está com preço inválido no catálogo.`, 409)
    }
    lines.push({
      product_id: product.id,
      product_name: product.name,
      unit_price: unitPrice, // preço vem do banco, nunca do navegador
      quantity: item.quantity,
    })
  }

  const total = lines.reduce((sum, line) => sum + line.unit_price * line.quantity, 0)
  if (total < STRIPE_JPY_MINIMUM) {
    return fail(`O valor mínimo de um pedido é ¥${STRIPE_JPY_MINIMUM}.`, 400)
  }

  // Garante o cadastro do cliente (FK de orders.customer_id).
  await db
    .from('customers')
    .upsert(
      {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente',
      },
      { onConflict: 'id' },
    )
    .select('id')

  const { data: order, error: orderError } = await db
    .from('orders')
    .insert({
      customer_id: user.id,
      total,
      status: 'awaiting_payment',
      payment_provider: 'stripe',
      payment_status: 'unpaid',
    })
    .select('id')
    .single()

  if (orderError || !order) {
    return fail(`Não foi possível criar o pedido: ${orderError?.message || 'erro desconhecido'}`, 500)
  }

  const { error: itemsError } = await db
    .from('order_items')
    .insert(lines.map(line => ({ ...line, order_id: order.id })))

  if (itemsError) {
    await db.from('orders').delete().eq('id', order.id)
    return fail(`Não foi possível salvar os itens do pedido: ${itemsError.message}`, 500)
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  let session
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: user.email,
        line_items: lines.map(line => ({
          price_data: {
            currency: 'jpy',
            product_data: { name: line.product_name },
            unit_amount: line.unit_price,
          },
          quantity: line.quantity,
        })),
        metadata: { order_id: String(order.id), customer_id: user.id },
        success_url: `${SITE_URL}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE_URL}/?payment=cancelled`,
      },
      // Evita cobranças duplicadas em caso de retry da requisição.
      { idempotencyKey: `mg3d-order-${order.id}` },
    )
  } catch (error) {
    await db
      .from('orders')
      .update({ status: 'cancelled', payment_status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', order.id)
    return fail(`O Stripe recusou a sessão de pagamento: ${error.message}`, 502)
  }

  const { error: updateError } = await db
    .from('orders')
    .update({ payment_session_id: session.id, updated_at: new Date().toISOString() })
    .eq('id', order.id)

  if (updateError) {
    await stripe.checkout.sessions.expire(session.id).catch(() => {})
    return fail(updateError.message, 500)
  }

  return Response.json({ url: session.url, sessionId: session.id, orderId: order.id, total })
}
