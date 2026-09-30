import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'

if (!SUPABASE_ANON_KEY && typeof window !== 'undefined') {
  // Antes o código caía num 'placeholder-anon-key' silencioso: a loja parecia
  // funcionar, mas toda chamada ao banco falhava sem explicação.
  console.error(
    '[MG3D] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) não está definida. Login, catálogo e pedidos não vão funcionar.',
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'missing-publishable-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
