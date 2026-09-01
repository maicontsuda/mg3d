import { createHash } from 'node:crypto'

export async function POST(request) {
  const adminKey = process.env.MG3D_ADMIN_UPLOAD_KEY
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!adminKey || !cloudName || !apiKey || !apiSecret) {
    return Response.json({ error: 'Cloudinary não está configurado no servidor.' }, { status: 503 })
  }

  if (request.headers.get('x-mg3d-admin-key') !== adminKey) {
    return Response.json({ error: 'Acesso administrativo não autorizado.' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const timestamp = Math.floor(Date.now() / 1000)
  const folder = typeof body.folder === 'string' && /^mg3d(?:\/[a-z0-9_-]+)*$/i.test(body.folder)
    ? body.folder
    : 'mg3d/products'
  const signature = createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest('hex')

  return Response.json({ cloudName, apiKey, timestamp, folder, signature })
}
