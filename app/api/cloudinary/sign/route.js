import { createHash, timingSafeEqual } from 'node:crypto'
import { authenticateAdmin } from '../../../lib/supabase-server'

export const dynamic = 'force-dynamic'

const FOLDER_PATTERN = /^mg3d(?:\/[a-z0-9_-]+)*$/i

function safeEquals(a, b) {
  const left = Buffer.from(String(a || ''))
  const right = Buffer.from(String(b || ''))
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export async function POST(request) {
  const adminKey = process.env.MG3D_ADMIN_UPLOAD_KEY
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return Response.json({ error: 'Cloudinary não está configurado no servidor.' }, { status: 503 })
  }

  // Duas formas de autorizar: a sessão Supabase do administrador (padrão, sem
  // digitar segredo nenhum) ou a chave compartilhada no header (fallback).
  const headerKey = request.headers.get('x-mg3d-admin-key')
  let authorized = Boolean(adminKey && headerKey && safeEquals(headerKey, adminKey))

  if (!authorized && request.headers.get('authorization')) {
    const auth = await authenticateAdmin(request)
    authorized = !auth.error
  }

  if (!authorized) {
    return Response.json({ error: 'Acesso administrativo não autorizado.' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const timestamp = Math.floor(Date.now() / 1000)
  const folder = typeof body.folder === 'string' && FOLDER_PATTERN.test(body.folder) ? body.folder : 'mg3d/products'
  const signature = createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex')

  return Response.json({ cloudName, apiKey, timestamp, folder, signature })
}
