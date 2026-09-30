// Mantido apenas por compatibilidade: a configuração real vive em ./config.js
import { SUPABASE_URL } from './config'

export const MG3D_SUPABASE_URL = SUPABASE_URL

export function getSupabaseUrl() {
  return SUPABASE_URL
}
