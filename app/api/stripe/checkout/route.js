import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'Stripe ainda não está configurado no servidor.' }, { status: 503 })
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return Response.json({ error: 'Sessão inválida.' }, { status: 401 })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { global: { headers: { Authorization: authorization } } })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Faça login para continuar.' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const orderId = Number(body.orderId)
  if (!Number.isInteger(orderId)) return Response.json({ error: 'Pedido inválido.' }, { status: 400 })
  const { data: order, error: orderError } = await supabase.from('orders').select('id,total,customer_id,payment_status').eq('id', orderId).eq('customer_id', user.id).single()
  if (orderError || !order || order.payment_status !== 'unpaid') return Response.json({ error: 'Pedido não disponível para pagamento.' }, { status: 400 })
  const { data: items, error: itemsError } = await supabase.from('order_items').select('product_name,unit_price,quantity').eq('order_id', orderId)
  if (itemsError || !items?.length) return Response.json({ error: 'O pedido não possui itens.' }, { status: 400 })
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://mg3d.vercel.app'
  const session = await stripe.checkout.sessions.create({ mode: 'payment', customer_email: user.email, line_items: items.map(item => ({ price_data: { currency: 'jpy', product_data: { name: item.product_name }, unit_amount: item.unit_price }, quantity: item.quantity })), metadata: { order_id: String(orderId), customer_id: user.id }, success_url: `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/?payment=cancelled` })
  const { error: updateError } = await supabase.from('orders').update({ payment_provider: 'stripe', payment_session_id: session.id, status: 'awaiting_payment' }).eq('id', orderId)
  if (updateError) { await stripe.checkout.sessions.expire(session.id).catch(() => {}); return Response.json({ error: updateError.message }, { status: 400 }) }
  return Response.json({ url: session.url, sessionId: session.id })
}
