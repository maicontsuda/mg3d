import { createServiceClient } from '../../lib/supabase-server'

export const dynamic = 'force-dynamic'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()

  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    return Response.json({ error: 'Digite um e-mail válido.' }, { status: 400 })
  }

  const db = createServiceClient()
  if (!db) {
    // Sem service role key a inscrição não pode ser gravada: melhor avisar do
    // que fingir sucesso, como a versão anterior fazia.
    return Response.json({ error: 'Cadastro de newsletter ainda não está configurado.' }, { status: 503 })
  }

  const { error } = await db
    .from('newsletter_subscribers')
    .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })

  if (error) return Response.json({ error: 'Não foi possível concluir a inscrição.' }, { status: 500 })
  return Response.json({ subscribed: true })
}
