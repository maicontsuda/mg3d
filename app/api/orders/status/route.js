import { createClient } from '@supabase/supabase-js'

const statusLabels = { pending: 'Recebido', processing: 'Em produção', shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado' }

export async function POST(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const authorization = request.headers.get('authorization')
  if (!supabaseUrl || !supabaseAnonKey || !authorization?.startsWith('Bearer ')) {
    return Response.json({ error: 'Sessão inválida.' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authorization } } })
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || user?.email?.toLowerCase() !== 'maicntsuda@gmail.com') {
    return Response.json({ error: 'Acesso administrativo não autorizado.' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const id = Number(body.id)
  const status = body.status
  if (!Number.isInteger(id) || !Object.hasOwn(statusLabels, status)) {
    return Response.json({ error: 'Pedido ou status inválido.' }, { status: 400 })
  }

  const { data: order, error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select('*, customers(name,email,phone)').single()
  if (error) return Response.json({ error: error.message }, { status: 400 })

  const message = `Olá${order.customers?.name ? `, ${order.customers.name}` : ''}! O status do seu pedido #${order.id} foi atualizado para: ${statusLabels[status]}. — MG3D`
  const notifications = []

  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && order.customers?.email) {
    const emailResponse = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [order.customers.email], subject: `MG3D — atualização do pedido #${order.id}`, text: message }) })
    notifications.push({ channel: 'email', sent: emailResponse.ok })
  } else notifications.push({ channel: 'email', sent: false, reason: 'provider_not_configured' })

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM && order.customers?.phone) {
    const params = new URLSearchParams({ From: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`, To: `whatsapp:${order.customers.phone}`, Body: message })
    const credentials = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')
    const whatsappResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params })
    notifications.push({ channel: 'whatsapp', sent: whatsappResponse.ok })
  } else notifications.push({ channel: 'whatsapp', sent: false, reason: 'provider_not_configured_or_phone_missing' })

  return Response.json({ order, notifications })
}
