import { createClient } from '@supabase/supabase-js'
import { MG3D_SUPABASE_URL } from './supabase-config'

const url = MG3D_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key'

export const supabase = createClient(url, key)
