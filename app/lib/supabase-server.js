import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, isAdminEmail } from './config'

const noPersist = { auth: { persistSession: false, autoRefreshToken: false } }

/** Cliente com a service role key: ignora RLS. Só pode ser usado no servidor. */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createClient(SUPABASE_URL, key, noPersist)
}

/** Cliente que age em nome do usuário logado (respeita RLS). */
export function createUserClient(authorization) {
  if (!SUPABASE_ANON_KEY) return null
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...noPersist,
    global: { headers: { Authorization: authorization } },
  })
}

/**
 * Valida o header Authorization e devolve o usuário do Supabase.
 * Retorna { user, client } ou { error, status }.
 */
export async function authenticateRequest(request) {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return { error: 'Sessão inválida.', status: 401 }
  }
  const client = createUserClient(authorization)
  if (!client) return { error: 'Supabase não está configurado no servidor.', status: 503 }

  const { data, error } = await client.auth.getUser()
  if (error || !data?.user) return { error: 'Faça login para continuar.', status: 401 }
  return { user: data.user, client }
}

/** Igual ao authenticateRequest, mas exige que o usuário seja o administrador. */
export async function authenticateAdmin(request) {
  const result = await authenticateRequest(request)
  if (result.error) return result
  if (!isAdminEmail(result.user.email)) {
    return { error: 'Acesso administrativo não autorizado.', status: 403 }
  }
  return result
}
