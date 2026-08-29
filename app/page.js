'use client'

import { useMemo, useState } from 'react'

const products = [
  { id: 1, name: 'Vaso Orbital', category: 'Casa', price: 1490, color: 'Tangerina', badge: 'Mais vendido', image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=85', desc: 'Geometria orgânica para plantas que pedem destaque.' },
  { id: 2, name: 'Luminária Halo', category: 'Luz', price: 2980, color: 'Areia', badge: 'Novo', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85', desc: 'Luz suave, sombra escultural e presença na medida.' },
  { id: 3, name: 'Suporte Arc', category: 'Organização', price: 890, color: 'Preto', badge: '', image: 'https://images.unsplash.com/photo-1616627561950-9f746e330187?auto=format&fit=crop&w=900&q=85', desc: 'Seu fone sempre no lugar. Design limpo, mesa leve.' },
  { id: 4, name: 'Bandeja Duna', category: 'Casa', price: 1190, color: 'Terracota', badge: '', image: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=900&q=85', desc: 'Uma peça tátil para chaves, joias e pequenos rituais.' },
  { id: 5, name: 'Vaso Nexo', category: 'Casa', price: 1790, color: 'Oliva', badge: 'Edição limitada', image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=85', desc: 'Volume e textura que transformam qualquer canto.' },
  { id: 6, name: 'Organizador Grid', category: 'Organização', price: 990, color: 'Cinza', badge: '', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=85', desc: 'Pequenas formas, grandes possibilidades de organização.' },
]

const categories = ['Todos', 'Casa', 'Luz', 'Organização']
const ADMIN_EMAIL = 'maicontsuda@gmail.com'
const formatJPY = value => `¥${value.toLocaleString('ja-JP')}`

function Icon({ name, size = 20 }) {
  const paths = {
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    bag: <><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    x: <><path d="m6 6 12 12M18 6 6 18"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    spark: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z"/><path d="m19 16 .5 2.5L22 19l-2.5.5L19 22l-.5-2.5L16 19l2.5-.5L19 16Z"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export default function Home() {
  const [category, setCategory] = useState('Todos')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [newsletter, setNewsletter] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [user, setUser] = useState(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginError, setLoginError] = useState('')
  const [customers, setCustomers] = useState([])

  const filtered = useMemo(() => products.filter(p => (category === 'Todos' || p.category === category) && p.name.toLowerCase().includes(query.toLowerCase())), [category, query])
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)

  function handleLogin(event) {
    event.preventDefault()
    const email = loginEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) { setLoginError('Digite um e-mail válido.'); return }
    const nextUser = { email, isAdmin: email === ADMIN_EMAIL }
    setUser(nextUser)
    setCustomers(current => current.some(item => item.email === email) ? current : [...current, { email, joined: new Date().toLocaleDateString('pt-BR') }])
    setLoginOpen(false)
    setLoginError('')
    setLoginEmail('')
  }

  function addToCart(product) {
    setCart(current => {
      const found = current.find(item => item.id === product.id)
      return found ? current.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item) : [...current, { ...product, qty: 1 }]
    })
    setCartOpen(true)
  }

  function updateQty(id, delta) {
    setCart(current => current.map(item => item.id === id ? { ...item, qty: item.qty + delta } : item).filter(item => item.qty > 0))
  }

  return <main>
    <div className="announcement"><Icon name="spark" size={15} /> Frete grátis acima de ¥5.000 <span>·</span> Produção sob demanda, sem desperdício</div>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="MG3D início"><span className="brand-mark">M</span><span>MG<span>3D</span></span></a>
      <nav><a href="#colecao">Coleção</a><a href="#processo">Como fazemos</a><a href="#sobre">Sobre a MG3D</a></nav>
      <div className="header-actions"><label className="search"><Icon name="search" size={18} /><input aria-label="Buscar produtos" placeholder="Buscar" value={query} onChange={e => setQuery(e.target.value)} /></label><button className="account-button" onClick={() => user ? (user.isAdmin ? setAdminOpen(true) : null) : setLoginOpen(true)}>{user ? (user.isAdmin ? 'Painel admin' : 'Minha conta') : 'Entrar'}</button><button className="bag-button" onClick={() => setCartOpen(true)} aria-label="Abrir carrinho"><Icon name="bag" size={21} />{cartCount > 0 && <b>{cartCount}</b>}</button></div>
    </header>

    <section className="hero" id="top">
      <div className="hero-copy"><p className="eyebrow"><span></span> Design que sai da tela</p><h1>Objetos que<br /><i>ganham forma.</i></h1><p className="hero-text">Peças autorais impressas em 3D para deixar seus espaços mais funcionais, mais bonitos e muito mais seus.</p><a className="button button-dark" href="#colecao">Explorar coleção <Icon name="arrow" size={17} /></a><div className="hero-note"><div className="avatar-stack"><span>✦</span><span>◌</span><span>✳</span></div><span>Feito em pequenos lotes<br /><strong>por quem acredita no detalhe.</strong></span></div></div>
      <div className="hero-art"><div className="sun"></div><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="hero-card card-back"></div><div className="hero-card card-front"><img src="https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1100&q=90" alt="Vaso Orbital em ambiente" /></div><span className="float-tag tag-top">01 / 06</span><span className="float-tag tag-bottom">Design + função</span></div>
    </section>

    <section className="ticker"><span>IMPRESSO COM INTENÇÃO</span><span>✳</span><span>MENOS DESPERDÍCIO</span><span>✳</span><span>FEITO NO BRASIL</span><span>✳</span><span>IMPRESSO COM INTENÇÃO</span></section>

    <section className="collection section" id="colecao"><div className="section-heading"><div><p className="eyebrow"><span></span> A coleção atual</p><h2>Pequenos objetos.<br /><i>Grande presença.</i></h2></div><p>Designs pensados para acompanhar seus rituais diários — da primeira luz do dia ao último café.</p></div><div className="filter-row"><div className="filters">{categories.map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><span className="product-count">{filtered.length} peças encontradas</span></div><div className="product-grid">{filtered.map((product, index) => <article className={`product-card card-${index % 3}`} key={product.id}><div className="product-image"><img src={product.image} alt={product.name} /><span className="product-badge">{product.badge || product.category}</span><button className="quick-add" onClick={() => addToCart(product)} aria-label={`Adicionar ${product.name}`}><Icon name="plus" size={18} /></button></div><div className="product-info"><div><h3>{product.name}</h3><p>{product.desc}</p></div><strong>{formatJPY(product.price)}</strong></div><div className="product-meta"><span>{product.color}</span><span>Produzido sob demanda</span></div></article>)}</div></section>

    <section className="manifesto section" id="processo"><div className="manifesto-image"><img src="https://images.unsplash.com/photo-1631541909061-71e349d1f9f3?auto=format&fit=crop&w=1200&q=85" alt="Processo de criação de peças" /><span>do arquivo<br /><i>ao objeto.</i></span></div><div className="manifesto-copy"><p className="eyebrow"><span></span> Nosso jeito de fazer</p><h2>Design consciente,<br /><i>sem linha de montagem.</i></h2><p>A gente acredita que uma boa peça nasce de uma boa pergunta: ela precisa existir? Cada produto MG3D é desenhado, impresso e finalizado por aqui, um de cada vez.</p><div className="values"><div><b>01</b><span><strong>Sob demanda</strong>Produzimos apenas o que vai encontrar uma casa.</span></div><div><b>02</b><span><strong>Material honesto</strong>PLA de origem vegetal, escolhido para durar.</span></div><div><b>03</b><span><strong>Feito por pessoas</strong>Do primeiro rascunho ao seu pacote.</span></div></div><a className="text-link" href="#sobre">Conheça nossa história <Icon name="arrow" size={16} /></a></div></section>

    <section className="newsletter section" id="sobre"><div><p className="eyebrow"><span></span> Entre para o clube</p><h2>Novidades que<br /><i>valem espaço.</i></h2></div><div><p>Receba lançamentos, bastidores e uma dose de inspiração — sem spam, prometemos.</p>{subscribed ? <div className="success"><Icon name="check" size={18} /> Você está na lista. Até breve!</div> : <form onSubmit={e => { e.preventDefault(); if (newsletter) setSubscribed(true) }}><input type="email" required placeholder="seu melhor e-mail" value={newsletter} onChange={e => setNewsletter(e.target.value)} /><button aria-label="Cadastrar e-mail"><Icon name="arrow" size={18} /></button></form>}<small>Ao assinar, você concorda com nossa política de privacidade.</small></div></section>

    <footer><div className="footer-brand"><a className="brand" href="#top"><span className="brand-mark">M</span><span>MG<span>3D</span></span></a><p>Objetos que ganham forma.<br />E um lugar na sua casa.</p></div><div className="footer-links"><div><b>Explorar</b><a href="#colecao">Coleção</a><a href="#processo">Nosso processo</a><a href="#sobre">Sobre nós</a></div><div><b>Ajuda</b><a href="#top">Envios e trocas</a><a href="#top">Cuidados com as peças</a><a href="#top">Fale com a gente</a></div></div><div className="footer-bottom"><span>© 2026 MG3D. Feito com intenção.</span><span>Instagram &nbsp;·&nbsp; Pinterest</span></div></footer>

    {loginOpen && <div className="overlay" onClick={() => setLoginOpen(false)}><section className="login-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setLoginOpen(false)} aria-label="Fechar"><Icon name="x" /></button><p className="eyebrow"><span></span> Área exclusiva</p><h2>Entre na<br /><i>MG3D.</i></h2><p className="modal-copy">Acompanhe seus pedidos e tenha uma experiência mais pessoal.</p><form onSubmit={handleLogin}><label>E-mail</label><input type="email" autoFocus required placeholder="voce@email.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />{loginError && <small className="form-error">{loginError}</small>}<button className="button button-dark full" type="submit">Continuar <Icon name="arrow" size={17} /></button></form><small className="modal-foot">Ao continuar, você concorda com os termos da MG3D.</small></section></div>}

    {adminOpen && user?.isAdmin && <div className="overlay" onClick={() => setAdminOpen(false)}><section className="admin-modal" onClick={e => e.stopPropagation()}><div className="drawer-head"><div><p className="eyebrow"><span></span> Acesso administrador</p><h2>Painel <i>MG3D</i></h2></div><button onClick={() => setAdminOpen(false)} aria-label="Fechar painel"><Icon name="x" /></button></div><div className="admin-welcome"><span className="admin-dot"></span><div><strong>Olá, Maicon</strong><p>Você está conectado como administrador.</p></div></div><div className="admin-grid"><button><span>⌘</span><strong>Gerenciar produtos</strong><small>Adicionar, editar e organizar seu catálogo</small><Icon name="arrow" size={16} /></button><button><span>◎</span><strong>Gerenciar clientes</strong><small>{customers.length} cliente{customers.length === 1 ? '' : 's'} cadastrado{customers.length === 1 ? '' : 's'}</small><Icon name="arrow" size={16} /></button></div><div className="admin-session"><span>{user.email}</span><button onClick={() => { setUser(null); setAdminOpen(false) }}>Sair da conta</button></div></section></div>}

    {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={e => e.stopPropagation()}><div className="drawer-head"><div><p className="eyebrow"><span></span> Sua seleção</p><h2>Carrinho <small>({cartCount})</small></h2></div><button onClick={() => setCartOpen(false)} aria-label="Fechar carrinho"><Icon name="x" /></button></div>{cart.length === 0 ? <div className="empty-cart"><div className="empty-icon"><Icon name="bag" size={28} /></div><h3>Seu carrinho está leve.</h3><p>Escolha uma peça para começar a transformar seu espaço.</p><button className="button button-dark" onClick={() => setCartOpen(false)}>Ver coleção</button></div> : <><div className="cart-items">{cart.map(item => <div className="cart-item" key={item.id}><img src={item.image} alt="" /><div><h3>{item.name}</h3><p>{formatJPY(item.price)}</p><div className="qty"><button onClick={() => updateQty(item.id, -1)}>−</button><span>{item.qty}</span><button onClick={() => updateQty(item.id, 1)}>+</button></div></div></div>)}</div><div className="cart-summary"><div><span>Subtotal</span><strong>{formatJPY(cartTotal)}</strong></div><p>Frete calculado no checkout</p><button className="button button-dark full">Finalizar pedido <Icon name="arrow" size={17} /></button></div></>}</aside></div>}
  </main>
}
