import Link from 'next/link'

export default function InfoPage({ eyebrow, title, intro, children }) {
  return <main className="info-page">
    <header className="info-header">
      <Link className="back-link" href="/">← Voltar para a loja</Link>
      <Link className="detail-brand" href="/" aria-label="MG3D início"><img src="/logo-mg.webp" alt="MG 3D Print" /></Link>
      <span className="detail-code">MG3D / INFORMAÇÕES</span>
    </header>
    <section className="info-hero">
      <p className="eyebrow"><span></span> {eyebrow}</p>
      <h1>{title}</h1>
      <p>{intro}</p>
    </section>
    <article className="info-content">{children}</article>
    <nav className="info-nav" aria-label="Informações da loja">
      <Link href="/envios-e-trocas">Envios e trocas</Link>
      <Link href="/cuidados">Cuidados com as peças</Link>
      <Link href="/privacidade">Privacidade</Link>
    </nav>
  </main>
}
