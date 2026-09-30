import Stripe from 'stripe'
import { createServiceClient } from '../../../lib/supabase-server'

export const dynamic = 'force-dynamic'

const PAID_EVENTS = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])
const FAILED_EVENTS = new Set(['checkout.session.expired', 'checkout.session.async_payment_failed'])

async function decrementStock(db, orderId) {
  const { data: items } = await db.from('order_items').select('product_id,quantity').eq('order_id', orderId)
  for (const item of items || []) {
    if (!item.product_id) continue
    // Atualização atômica no banco: evita a corrida do padrão ler-e-depois-gravar.
    const { error } = await db.rpc('decrement_product_stock', {
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    })
    if (error) {
      console.error('[MG3D webhook] falha ao baixar estoque via RPC', { orderId, item, error: error.message })
    }
  }
}

export async function POST(request) {
  const secret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const db = createServiceClient()
  if (!secret || !webhookSecret || !db) {
    return new Response('Stripe webhook não configurado.', { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  const payload = await request.text()
  const stripe = new Stripe(secret)

  let event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    return new Response(`Webhook inválido: ${error.message}`, { status: 400 })
  }

  const orderId = Number(event.data?.object?.metadata?.order_id)
  if (!Number.isInteger(orderId)) return Response.json({ received: true, ignored: 'sem order_id' })

  try {
    if (PAID_EVENTS.has(event.type)) {
      // O filtro por payment_status garante idempotência: se o Stripe reenviar o
      // mesmo evento, nenhuma linha é atualizada e o estoque não baixa duas vezes.
      const { data: updated } = await db
        .from('orders')
        .update({
          status: 'pending',
          payment_status: 'paid',
          payment_intent_id: event.data.object.payment_intent || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .neq('payment_status', 'paid')
        .select('id')

      if (updated?.length) await decrementStock(db, orderId)
    }

    if (FAILED_EVENTS.has(event.type)) {
      await db
        .from('orders')
        .update({ status: 'cancelled', payment_status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('payment_status', 'unpaid')
    }
  } catch (error) {
    console.error('[MG3D webhook] erro ao processar evento', { type: event.type, orderId, message: error.message })
    // 500 faz o Stripe reenviar o evento mais tarde.
    return new Response('Erro ao processar o evento.', { status: 500 })
  }

  return Response.json({ received: true })
}
