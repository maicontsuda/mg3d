import Link from 'next/link'

export const metadata = { title: 'Página não encontrada' }

export default function NotFound() {
  return (
    <main className="status-page">
      <p className="eyebrow"><span></span> Erro 404</p>
      <h1>Essa peça<br /><i>saiu do catálogo.</i></h1>
      <p className="status-text">
        O endereço que você abriu não existe mais ou o produto foi desativado.
      </p>
      <Link className="button button-dark" href="/">Voltar para a coleção <span>→</span></Link>
    </main>
  )
}
