import './globals.css'
import { SITE_URL } from './lib/config'

// As fontes saíram do @import do CSS (que é descoberto tarde e bloqueia a
// renderização) para um <link> com preconnect, baixado em paralelo.
// Próximo passo possível: next/font/google, que exige rede no build.
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'MG3D — Inovação em cada camada',
    template: '%s — MG3D',
  },
  description: 'Produtos impressos em 3D, feitos sob demanda no Japão. Vasos, luminárias e organizadores em pequenos lotes.',
  applicationName: 'MG3D',
  keywords: ['impressão 3D', 'MG3D', 'design', 'Japão', 'vasos', 'luminárias', 'organizadores'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'MG3D',
    locale: 'pt_BR',
    url: SITE_URL,
    title: 'MG3D — Inovação em cada camada',
    description: 'Produtos impressos em 3D, feitos sob demanda no Japão.',
    images: [{ url: '/logo-mg.webp', width: 512, height: 512, alt: 'MG3D Print Lab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MG3D — Inovação em cada camada',
    description: 'Produtos impressos em 3D, feitos sob demanda no Japão.',
    images: ['/logo-mg.webp'],
  },
  icons: { icon: '/logo-mg.webp', apple: '/logo-mg.webp' },
  robots: { index: true, follow: true },
}

export const viewport = {
  themeColor: '#080d16',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="stylesheet" href={FONTS_HREF} />
      </head>
      <body>{children}</body>
    </html>
  )
}
