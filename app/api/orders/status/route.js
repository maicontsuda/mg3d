import { authenticateAdmin, createServiceClient } from '../../../lib/supabase-server'

export const dynamic = 'force-dynamic'

const statusLabels = {
  pending: 'Recebido',
  processing: 'Em produção',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

async function sendEmail(order, message) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL || !order.customers?.email) {
    return { channel: 'email', sent: false, reason: 'provider_not_configured_or_email_missing' }
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [order.customers.email],
        subject: `MG3D — atualização do pedido #${order.id}`,
        text: message,
      }),
    })
    return { channel: 'email', sent: response.ok, reason: response.ok ? undefined : 'provider_rejected_request' }
  } catch {
    return { channel: 'email', sent: false, reason: 'provider_unreachable' }
  }
}

async function sendWhatsApp(order, message) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM || !order.customers?.phone) {
    return { channel: 'whatsapp', sent: false, reason: 'provider_not_configured_or_phone_missing' }
  }
  try {
    const phone = order.customers.phone.trim().replace(/^(whatsapp:)+/i, '')
    const params = new URLSearchParams({
      From: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
      To: `whatsapp:${phone}`,
      Body: message,
    })
    const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      },
    )
    return { channel: 'whatsapp', sent: response.ok, reason: response.ok ? undefined : 'provider_rejected_request' }
  } catch {
    return { channel: 'whatsapp', sent: false, reason: 'provider_unreachable' }
  }
}

export async function POST(request) {
  const auth = await authenticateAdmin(request)
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => ({}))
  const id = Number(body.id)
  const status = body.status
  if (!Number.isInteger(id) || !Object.hasOwn(statusLabels, status)) {
    return Response.json({ error: 'Pedido ou status inválido.' }, { status: 400 })
  }

  // A escrita usa a service role quando disponível: assim o painel não depende
  // de uma policy de UPDATE em orders para o administrador.
  const db = createServiceClient() || auth.client

  const { data: previous, error: previousError } = await db
    .from('orders')
    .select('status')
    .eq('id', id)
    .single()
  if (previousError) return Response.json({ error: previousError.message }, { status: 404 })
  if (previous.status === status) {
    return Response.json({ order: previous, notifications: [], unchanged: true })
  }

  const { data: order, error } = await db
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, customers(name,email,phone)')
    .single()
  if (error) return Response.json({ error: error.message }, { status: 400 })

  const message = `Olá${order.customers?.name ? `, ${order.customers.name}` : ''}! O status do seu pedido #${order.id} foi atualizado para: ${statusLabels[status]}. — MG3D`
  const notifications = await Promise.all([sendEmail(order, message), sendWhatsApp(order, message)])
  return Response.json({ order, notifications })
}
