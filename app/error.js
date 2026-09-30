'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('[MG3D] erro não tratado na interface', error)
  }, [error])

  return (
    <main className="status-page">
      <p className="eyebrow"><span></span> Algo saiu do prumo</p>
      <h1>Uma camada<br /><i>falhou aqui.</i></h1>
      <p className="status-text">
        Tivemos um problema inesperado ao carregar esta página. Você pode tentar de novo — seu carrinho continua salvo.
      </p>
      <button className="button button-dark" onClick={reset}>Tentar novamente <span>→</span></button>
    </main>
  )
}
