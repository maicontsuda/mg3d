import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mg3d.vercel.app'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'MG3D — Inovação em cada camada',
    template: '%s',
  },
  description: 'Produtos impressos em 3D, feitos sob demanda no Japão.',
  applicationName: 'MG3D Print Lab',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'MG3D Print Lab',
    title: 'MG3D — Inovação em cada camada',
    description: 'Produtos impressos em 3D, feitos sob demanda no Japão.',
    images: [{ url: '/logo-mg.webp', width: 900, height: 900, alt: 'MG3D Print Lab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MG3D — Inovação em cada camada',
    description: 'Produtos impressos em 3D, feitos sob demanda no Japão.',
    images: ['/logo-mg.webp'],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }) {
  return <html lang="pt-BR"><body>{children}</body></html>
}
