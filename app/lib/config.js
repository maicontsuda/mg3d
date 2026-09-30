// Fonte única de verdade para configuração do projeto.
// Tudo que antes estava espalhado (e divergente) entre page.js, rotas de API e
// o schema SQL passa a ser lido daqui.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kzfbiyygbjrhjlbdsxsd.supabase.co'

// O Supabase renomeou "anon key" para "publishable key"; aceitamos os dois nomes
// para não quebrar deploys existentes.
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  ''

// ATENÇÃO: este e-mail precisa ser exatamente o mesmo usado nas policies de RLS
// em supabase/schema.sql. Antes havia duas grafias diferentes no código
// (maicntsuda@ no banco/API e maicontsuda@ na interface), o que fazia o painel
// abrir para um usuário que o banco recusava.
export const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'maicntsuda@gmail.com')
  .trim()
  .toLowerCase()

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || ADMIN_EMAIL

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mg3d.vercel.app').replace(/\/$/, '')

export const isAdminEmail = email => Boolean(email) && email.trim().toLowerCase() === ADMIN_EMAIL

// Mantido por compatibilidade com imports antigos.
export const MG3D_SUPABASE_URL = SUPABASE_URL
