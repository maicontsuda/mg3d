import { createClient } from '@supabase/supabase-js'
import { MG3D_SUPABASE_URL } from '../../lib/supabase-config'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  // Honeypot fields are invisible to people and commonly filled by simple spambots.
  if (body.website) return Response.json({ subscribed: true })
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return Response.json({ error: 'Digite um e-mail válido.' }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return Response.json({ error: 'O cadastro de novidades ainda não está configurado.' }, { status: 503 })
  }

  const database = createClient(MG3D_SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await database.from('newsletter_subscribers').upsert(
    { email, active: true, updated_at: new Date().toISOString() },
    { onConflict: 'email' },
  )

  if (error) return Response.json({ error: 'Não foi possível concluir o cadastro agora.' }, { status: 500 })
  return Response.json({ subscribed: true })
}
