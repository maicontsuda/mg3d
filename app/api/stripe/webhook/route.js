import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const secret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !webhookSecret || !process.env.SUPABASE_SERVICE_ROLE_KEY) return new Response('Stripe webhook não configurado.', { status: 503 })
  const signature = request.headers.get('stripe-signature')
  const payload = await request.text()
  const stripe = new Stripe(secret)
  let event
  try { event = stripe.webhooks.constructEvent(payload, signature, webhookSecret) } catch (error) { return new Response(`Webhook inválido: ${error.message}`, { status: 400 }) }
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object
    const orderId = Number(session.metadata?.order_id)
    if (Number.isInteger(orderId)) {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      const { data: order } = await supabase.from('orders').select('id,payment_status').eq('id', orderId).single()
      if (order && order.payment_status !== 'paid') {
        await supabase.from('orders').update({ status: 'pending', payment_status: 'paid', payment_intent_id: session.payment_intent || null, updated_at: new Date().toISOString() }).eq('id', orderId)
        const { data: items } = await supabase.from('order_items').select('product_id,quantity').eq('order_id', orderId)
        for (const item of items || []) {
          if (!item.product_id) continue
          const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single()
          if (product) await supabase.from('products').update({ stock_quantity: Math.max(0, Number(product.stock_quantity || 0) - item.quantity), updated_at: new Date().toISOString() }).eq('id', item.product_id)
        }
      }
    }
  }
  if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
    const orderId = Number(event.data.object.metadata?.order_id)
    if (Number.isInteger(orderId)) {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      await supabase.from('orders').update({ status: 'cancelled', payment_status: 'failed', updated_at: new Date().toISOString() }).eq('id', orderId).eq('payment_status', 'unpaid')
    }
  }
  return Response.json({ received: true })
}
