'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { products, categories, formatJPY } from './catalog'
import { supabase } from './lib/supabase'
import { isAdminEmail } from './lib/config'
import { fromDbProduct, toDbProduct } from './lib/product-utils'
import Icon from './components/Icon'
import ProductForm from './components/ProductForm'
import AdminOrders from './components/AdminOrders'

const CART_STORAGE_KEY = 'mg3d-cart-v1'

const ORDER_STATUS_LABELS = {
  awaiting_payment: 'Aguardando pagamento',
  pending: 'Recebido',
  processing: 'Em produção',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

// Antes o redirect de login era fixo em https://mg3d.vercel.app, o que quebrava
// o login em ambiente local e em previews.
const authRedirectUrl = () =>
  typeof window === 'undefined' ? process.env.NEXT_PUBLIC_SITE_URL || 'https://mg3d.vercel.app' : window.location.origin

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
  const [loginMessage, setLoginMessage] = useState('')
  const [checkoutState, setCheckoutState] = useState('idle')
  const [accountOpen, setAccountOpen] = useState(false)
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [adminOrders, setAdminOrders] = useState([])
  const [adminProducts, setAdminProducts] = useState(products)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productFormOpen, setProductFormOpen] = useState(false)
  const [customerPanelOpen, setCustomerPanelOpen] = useState(false)
  const [notice, setNotice] = useState(null)
  const [newsletterError, setNewsletterError] = useState('')
  const [cartLoaded, setCartLoaded] = useState(false)

  // Mensagens de sistema (erros de admin, estoque, checkout) aparecem num aviso
  // próprio; antes iam para o estado do formulário de login e ficavam invisíveis.
  const notify = useCallback((message, type = 'error') => {
    setNotice(message ? { message, type } : null)
  }, [])

  // O carrinho sobrevive a um refresh ou ao retorno do Stripe.
  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || '[]')
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe após a hidratação
      if (Array.isArray(stored) && stored.length) setCart(stored)
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY)
    }
    setCartLoaded(true)
  }, [])

  useEffect(() => {
    if (!cartLoaded) return
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    } catch {
      /* modo privado do navegador: seguimos sem persistir */
    }
  }, [cart, cartLoaded])

  // Mantém a tabela customers em dia com o usuário logado.
  // is_admin NÃO é enviado pelo navegador: quem decide isso é a RLS/servidor.
  const syncCustomer = useCallback(async current => {
    await supabase.from('customers').upsert({
      id: current.id,
      email: current.email,
      name: current.user_metadata?.full_name || current.email?.split('@')[0],
      phone: current.user_metadata?.phone || current.phone || null,
    })
  }, [])

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession()
      const current = sessionData.session?.user
      if (mounted && current) {
        setUser({ id: current.id, email: current.email, isAdmin: isAdminEmail(current.email) })
        await syncCustomer(current)
        const { data: orderData } = await supabase.from('orders').select('*, order_items(*)').eq('customer_id', current.id).order('created_at', { ascending: false })
        if (mounted && orderData) setOrders(orderData)
        if (isAdminEmail(current.email)) {
          const { data: customerData } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
          if (mounted && customerData) setCustomers(customerData)
          const { data: orderData } = await supabase.from('orders').select('*, order_items(*), customers(name,email)').order('created_at', { ascending: false })
          if (mounted && orderData) setAdminOrders(orderData)
        }
      }
      const { data } = await supabase.from('products').select('*').order('id')
      if (mounted && data?.length) setAdminProducts(data.map(fromDbProduct))
    }
    load()
    const refreshLiveOrders = async () => {
      const { data: liveOrders } = await supabase.from('orders').select('*, order_items(*), customers(name,email)').order('created_at', { ascending: false })
      if (mounted && liveOrders) setAdminOrders(liveOrders)
    }
    const orderChannel = supabase.channel('mg3d-orders-live').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refreshLiveOrders).on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, refreshLiveOrders).subscribe()
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const current = session?.user
      setUser(current ? { id: current.id, email: current.email, isAdmin: isAdminEmail(current.email) } : null)
      if (current) {
        await syncCustomer(current)
        const { data } = await supabase.from('orders').select('*, order_items(*)').eq('customer_id', current.id).order('created_at', { ascending: false })
        if (data) setOrders(data)
        if (isAdminEmail(current.email)) {
          const { data: customerData } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
          if (customerData) setCustomers(customerData)
        }
      }
    })
    return () => { mounted = false; listener.subscription.unsubscribe(); supabase.removeChannel(orderChannel) }
  }, [syncCustomer])


  async function saveProduct(product) {
    const payload = toDbProduct(product)
    const { data, error } = await supabase.from('products').upsert(payload).select().single()
    if (error) { notify(`Não foi possível salvar: ${error.message}`); return }
    const saved = fromDbProduct(data)
    setAdminProducts(current => current.some(item => item.id === saved.id) ? current.map(item => item.id === saved.id ? saved : item) : [...current, saved])
    setProductFormOpen(false); setEditingProduct(null); notify('Produto salvo com sucesso.', 'info')
  }

  async function updateOrderStatus(id, status) {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    const response = await fetch('/api/orders/status', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` }, body: JSON.stringify({ id, status }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { notify(`Não foi possível atualizar o pedido: ${result.error || 'erro desconhecido'}`); return }
    setAdminOrders(current => current.map(order => order.id === id ? { ...order, ...result.order } : order))
    const failed = result.notifications?.filter(item => !item.sent) || []
    if (failed.length === 2) notify('Pedido atualizado. Configure Resend ou Twilio no Vercel para enviar notificações.', 'info')
  }

  async function removeProduct(id) {
    if (!window.confirm('Remover este produto do catálogo?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { notify(`Não foi possível excluir: ${error.message}`); return }
    setAdminProducts(current => current.filter(item => item.id !== id))
  }

  async function toggleProduct(id) {
    const product = adminProducts.find(item => item.id === id)
    if (!product) return
    const { error } = await supabase.from('products').update({ active: product.active === false }).eq('id', id)
    if (error) { notify(`Não foi possível alterar o status: ${error.message}`); return }
    setAdminProducts(current => current.map(item => item.id === id ? { ...item, active: item.active === false } : item))
  }

  const filtered = useMemo(() => adminProducts.filter(p => p.active !== false && (category === 'Todos' || p.category === category) && p.name.toLowerCase().includes(query.toLowerCase())), [adminProducts, category, query])
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)

  async function handleLogin(event) {
    event.preventDefault()
    const email = loginEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) { setLoginError('Digite um e-mail válido.'); return }
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: authRedirectUrl() } })
    if (error) { setLoginError(error.message); return }
    setLoginError(''); setLoginMessage('Enviamos um link de acesso para o seu e-mail. Abra-o para concluir o login.'); setLoginEmail('')
  }

  async function handleGoogleLogin() {
    setLoginError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authRedirectUrl() },
    })
    if (error) setLoginError(`Não foi possível entrar com Google: ${error.message}`)
  }

  function addToCart(product) {
    const currentQty = cart.find(item => item.id === product.id)?.qty || 0
    if ((product.stock_quantity || 0) <= 0 && product.allow_preorder === false) { notify('Este produto está esgotado e não aceita encomendas no momento.'); return }
    if ((product.stock_quantity || 0) > 0 && currentQty >= product.stock_quantity && product.allow_preorder === false) { notify('A quantidade disponível deste produto já está no seu carrinho.'); return }
    setCart(current => {
      const found = current.find(item => item.id === product.id)
      return found ? current.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item) : [...current, { ...product, qty: 1 }]
    })
    setCartOpen(true)
  }

  function updateQty(id, delta) {
    setCart(current => current.map(item => item.id === id ? { ...item, qty: item.qty + delta } : item).filter(item => item.qty > 0))
  }

  async function checkout() {
    setCheckoutState('loading')
    notify(null)
    try {
      if (!user) { setCartOpen(false); setLoginOpen(true); return }

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) { setCartOpen(false); setLoginOpen(true); return }

      // O navegador manda apenas produto + quantidade. Preço, total e estoque
      // são recalculados no servidor a partir do banco (app/api/stripe/checkout).
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: cart.map(item => ({ productId: item.id, quantity: item.qty })) }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.url) {
        throw new Error(result.error || `A API de checkout respondeu HTTP ${response.status}.`)
      }

      setCartOpen(false)
      window.location.assign(result.url)
    } catch (error) {
      setCheckoutState('error')
      notify(error.message || 'Não foi possível iniciar o pagamento.')
    } finally {
      setCheckoutState(current => (current === 'loading' ? 'idle' : current))
    }
  }

  async function subscribeNewsletter(event) {
    event.preventDefault()
    const email = newsletter.trim()
    if (!email) return
    setNewsletterError('')
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a inscrição.')
      setSubscribed(true)
      setNewsletter('')
    } catch (error) {
      setNewsletterError(error.message)
    }
  }

  // Ao voltar do Stripe com pagamento concluído, esvazia o carrinho e avisa.
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('payment')
    if (status === 'success') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reage ao retorno do Stripe (fonte externa)
      setCart([])
      notify('Pagamento confirmado! Você recebe a atualização do pedido por e-mail.', 'info')
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (status === 'cancelled') {
      notify('Pagamento cancelado. Seu carrinho continua salvo.', 'info')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [notify])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setOrders([]); setAdminOpen(false); setAccountOpen(false)
  }

  return <main>
    {notice && <div className={`app-notice ${notice.type}`} role="status"><span>{notice.message}</span><button onClick={() => notify(null)} aria-label="Fechar aviso"><Icon name="x" size={16} /></button></div>}
    <div className="announcement"><Icon name="spark" size={15} /> FRETE GRÁTIS ACIMA DE ¥5.000 <span>·</span> PRECISÃO EM CADA CAMADA</div>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="MG3D início"><img className="brand-logo" src="/logo-mg.webp" alt="MG 3D Print" /><span><em>M</em><strong>G</strong><i>3D</i><small>PRINT LAB</small></span></a>
      <nav><a href="#colecao">Coleção</a><a href="#processo">Como fazemos</a><a href="#sobre">Sobre a MG3D</a></nav>
      <div className="header-actions"><label className="search"><Icon name="search" size={18} /><input aria-label="Buscar produtos" placeholder="Buscar" value={query} onChange={e => setQuery(e.target.value)} /></label><button className="account-button" onClick={() => user ? (user.isAdmin ? setAdminOpen(true) : setAccountOpen(true)) : setLoginOpen(true)}>{user ? (user.isAdmin ? 'Painel admin' : 'Minha conta') : 'Entrar'}</button><button className="bag-button" onClick={() => setCartOpen(true)} aria-label="Abrir carrinho"><Icon name="bag" size={21} />{cartCount > 0 && <b>{cartCount}</b>}</button></div>
    </header>

    <section className="hero" id="top">
      <div className="hero-copy"><p className="eyebrow"><span></span> Imprimindo design em 3D</p><p className="hero-slogan">Objetos que ganham forma.</p><h1>Inovação Em<br /><i>Cada Camada.</i></h1><p className="hero-text">Peças impressas em 3D para deixar seus espaços mais funcionais, mais bonitos e muito mais seus.</p><a className="button button-dark" href="#colecao">Explorar coleção <Icon name="arrow" size={17} /></a><div className="hero-note"><div className="avatar-stack"><span>✦</span><span>◌</span><span>✳</span></div><span>Feito em pequenos lotes<br /><strong>por quem acredita no detalhe.</strong></span></div></div>
      <div className="hero-art"><div className="sun"></div><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="hero-card card-back"></div><div className="hero-card card-front"><img src="https://res.cloudinary.com/dz5n4ul6j/image/upload/f_auto,q_auto,w_1100/v1788302531/vaso-orbital.jpg" alt="Vaso Orbital em ambiente" /></div><div className="hero-logo-plate"><img src="/logo-mg.webp" alt="MG 3D Print" /></div><span className="float-tag tag-top">01 / 06</span><span className="float-tag tag-bottom">Design + função</span></div>
    </section>

    <section className="ticker"><span>IMPRESSO COM INTENÇÃO</span><span>✳</span><span>MENOS DESPERDÍCIO</span><span>✳</span><span>FEITO NO JAPÃO</span><span>✳</span><span>IMPRESSO COM INTENÇÃO</span></section>

    <section className="collection section" id="colecao"><div className="section-heading"><div><p className="eyebrow"><span></span> A coleção atual</p><h2>Pequenos objetos.<br /><i>Grande presença.</i></h2></div><p>Designs pensados para acompanhar seus rituais diários — da primeira luz do dia ao último café.</p></div><div className="filter-row"><div className="filters">{categories.map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><span className="product-count">{filtered.length} peças encontradas</span></div><div className="product-grid">{filtered.map((product, index) => <article className={`product-card card-${index % 3}`} key={product.id}><div className="product-image">{product.photo_visible !== false ? <img src={product.image} alt={product.name} /> : <div className="product-image-hidden">Imagem reservada</div>}<span className="product-badge">{product.badge || product.category}</span><button className="quick-add" onClick={() => addToCart(product)} aria-label={`Adicionar ${product.name}`}><Icon name="plus" size={18} /></button></div><div className="product-info"><div><h3><Link href={`/produtos/${product.slug}`}>{product.name}</Link></h3><p>{product.desc}</p></div><strong>{formatJPY(product.price)}</strong></div><div className="product-meta"><span>{product.color}</span><span>Produzido sob demanda</span></div></article>)}</div></section>

    <section className="manifesto section" id="processo"><div className="manifesto-image"><div className="process-visual-art"><img className="process-logo" src="/logo-mg.webp" alt="Logo MG 3D Print" /></div><span className="process-caption">DO ARQUIVO<br /><i>AO OBJETO.</i></span></div><div className="manifesto-copy"><p className="eyebrow"><span></span> Nosso jeito de fazer</p><h2>Design consciente,<br /><i>sem linha de montagem.</i></h2><p>A gente acredita que uma boa peça nasce de uma boa pergunta: ela precisa existir? Cada produto MG3D é desenhado, impresso e finalizado por aqui, um de cada vez.</p><div className="values"><div><b>01</b><span><strong>Sob demanda</strong>produzimos o que você mais precisa.</span></div><div><b>02</b><span><strong>Material</strong>PLA, PETG e TPU — o material certo para cada produto.</span></div><div><b>03</b><span><strong>Feito por pessoas</strong>Do primeiro rascunho ao seu pacote.</span></div></div><a className="text-link" href="#sobre">Conheça nossa história <Icon name="arrow" size={16} /></a></div></section>

    <section className="newsletter section" id="sobre"><div><p className="eyebrow"><span></span> Entre para o clube</p><h2>Novidades que<br /><i>valem espaço.</i></h2></div><div><p>Receba lançamentos, bastidores e uma dose de inspiração — sem spam, prometemos.</p>{subscribed ? <div className="success"><Icon name="check" size={18} /> Você está na lista. Até breve!</div> : <><form onSubmit={subscribeNewsletter}><input type="email" required placeholder="seu melhor e-mail" value={newsletter} onChange={e => setNewsletter(e.target.value)} /><button aria-label="Cadastrar e-mail"><Icon name="arrow" size={18} /></button></form>{newsletterError && <small className="form-error" role="alert">{newsletterError}</small>}</>}<small>Ao assinar, você concorda com nossa política de privacidade.</small></div></section>

    <footer><div className="footer-brand"><a className="brand" href="#top"><img className="brand-logo" src="/logo-mg.webp" alt="MG 3D Print" /><span><em>M</em><strong>G</strong><i>3D</i><small>PRINT LAB</small></span></a><p>Objetos que ganham forma.<br />E um lugar na sua casa.</p></div><div className="footer-links"><div><b>Explorar</b><a href="#colecao">Coleção</a><a href="#processo">Nosso processo</a><a href="#sobre">Sobre nós</a></div><div><b>Ajuda</b><a href="#top">Envios e trocas</a><a href="#top">Cuidados com as peças</a><a href="#top">Fale com a gente</a></div></div><div className="footer-bottom"><span>© 2026 MG3D. Feito com intenção.</span><span>Instagram &nbsp;·&nbsp; Pinterest</span></div></footer>

    {loginOpen && <div className="overlay" onClick={() => setLoginOpen(false)}><section className="login-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setLoginOpen(false)} aria-label="Fechar"><Icon name="x" /></button><p className="eyebrow"><span></span> Área exclusiva</p><h2>Entre na<br /><i>MG3D.</i></h2><p className="modal-copy">Acompanhe seus pedidos e tenha uma experiência mais pessoal.</p>{loginMessage && <p className="login-success">{loginMessage}</p>}<button className="google-login" type="button" onClick={handleGoogleLogin}><span className="google-g">G</span> Continuar com Google</button><div className="login-divider"><span>ou entre com e-mail</span></div><form onSubmit={handleLogin}><label>E-mail</label><input type="email" autoFocus required placeholder="voce@email.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />{loginError && <small className="form-error">{loginError}</small>}<button className="button button-dark full" type="submit">Continuar <Icon name="arrow" size={17} /></button></form><small className="modal-foot">Ao continuar, você concorda com os termos da MG3D.</small></section></div>}

    {adminOpen && user?.isAdmin && <div className="overlay" onClick={() => setAdminOpen(false)}><section className="admin-modal" onClick={e => e.stopPropagation()}>{productFormOpen ? <ProductForm product={editingProduct} onSave={saveProduct} onCancel={() => { setProductFormOpen(false); setEditingProduct(null) }} /> : <><div className="drawer-head"><div><p className="eyebrow"><span></span> Acesso administrador</p><h2>Painel <i>MG3D</i></h2></div><button onClick={() => setAdminOpen(false)} aria-label="Fechar painel"><Icon name="x" /></button></div><div className="admin-welcome"><span className="admin-dot"></span><div><strong>Olá, Maicon</strong><p>Você está conectado como administrador.</p></div></div><div className="admin-grid"><button onClick={() => { setEditingProduct(null); setProductFormOpen(true) }}><span>＋</span><strong>Adicionar produto</strong><small>Criar uma nova página de produto</small><Icon name="arrow" size={16} /></button><button onClick={() => document.getElementById('admin-product-list')?.scrollIntoView({ behavior: 'smooth' })}><span>⌘</span><strong>Gerenciar produtos</strong><small>{adminProducts.length} produtos no catálogo</small><Icon name="arrow" size={16} /></button><button onClick={() => setCustomerPanelOpen(current => !current)}><span>◎</span><strong>Gerenciar clientes</strong><small>{customers.length} cliente{customers.length === 1 ? '' : 's'} cadastrado{customers.length === 1 ? '' : 's'}</small><Icon name="arrow" size={16} /></button>{customerPanelOpen && <div className="admin-customer-list"><strong>Clientes cadastrados</strong>{customers.length ? customers.map(customer => <div key={customer.id}><span>{customer.name || 'Cliente'}</span><small>{customer.email}</small><b>{customer.is_admin ? 'Administrador' : 'Cliente'}</b></div>) : <p>Nenhum cliente autenticado ainda.</p>}</div>}</div><div className="admin-product-list" id="admin-product-list"><div className="admin-list-head"><strong>Produtos cadastrados</strong><button className="detail-contact" onClick={() => { setEditingProduct(null); setProductFormOpen(true) }}>+ Novo produto</button></div>{adminProducts.map(product => <div className={`admin-product-row ${product.active === false ? 'inactive' : ''}`} key={product.id}><img src={product.image} alt="" /><div><strong>{product.name}</strong><small>{formatJPY(product.price)} · {product.material} · estoque: {product.stock_quantity || 0} · {product.active === false ? 'Desativado' : 'Ativo'}</small></div><button onClick={() => toggleProduct(product.id)}>{product.active === false ? 'Ativar' : 'Desativar'}</button><button onClick={() => { setEditingProduct(product); setProductFormOpen(true) }}>Editar</button><button className="danger" onClick={() => removeProduct(product.id)}>Excluir</button></div>)}</div><AdminOrders orders={adminOrders} onStatusChange={updateOrderStatus} /><div className="admin-session"><span>{user.email}</span><button onClick={signOut}>Sair da conta</button></div></>}</section></div>}

    {accountOpen && user && <div className="overlay" onClick={() => setAccountOpen(false)}><section className="login-modal account-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setAccountOpen(false)} aria-label="Fechar"><Icon name="x" /></button><p className="eyebrow"><span></span> Minha conta</p><h2>Seus <i>pedidos.</i></h2><p className="modal-copy">{user.email}</p>{orders.length ? <div className="order-history">{orders.map(order => <div className="order-card" key={order.id}><div><strong>Pedido #{order.id}</strong><span>{new Date(order.created_at).toLocaleDateString('ja-JP')}</span></div><p>{order.order_items?.map(item => `${item.product_name} × ${item.quantity}`).join(', ')}</p><b>{formatJPY(order.total)} · {ORDER_STATUS_LABELS[order.status] || order.status}</b></div>)}</div> : <p className="empty-account">Você ainda não fez nenhum pedido.</p>}<button className="detail-contact" onClick={signOut}>Sair da conta</button></section></div>}

    {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={e => e.stopPropagation()}><div className="drawer-head"><div><p className="eyebrow"><span></span> Sua seleção</p><h2>Carrinho <small>({cartCount})</small></h2></div><button onClick={() => setCartOpen(false)} aria-label="Fechar carrinho"><Icon name="x" /></button></div>{cart.length === 0 ? <div className="empty-cart"><div className="empty-icon"><Icon name="bag" size={28} /></div><h3>Seu carrinho está leve.</h3><p>Escolha uma peça para começar a transformar seu espaço.</p><button className="button button-dark" onClick={() => setCartOpen(false)}>Ver coleção</button></div> : <><div className="cart-items">{cart.map(item => <div className="cart-item" key={item.id}><img src={item.image} alt="" /><div><h3>{item.name}</h3><p>{formatJPY(item.price)}</p><div className="qty"><button onClick={() => updateQty(item.id, -1)}>−</button><span>{item.qty}</span><button onClick={() => updateQty(item.id, 1)}>+</button></div></div></div>)}</div><div className="cart-summary"><div><span>Subtotal</span><strong>{formatJPY(cartTotal)}</strong></div><p>Frete calculado no checkout</p><button className="button button-dark full" onClick={checkout} disabled={checkoutState === 'loading'}>{checkoutState === 'loading' ? 'Preparando pagamento...' : 'Finalizar pedido'} {checkoutState !== 'loading' && <Icon name="arrow" size={17} />}</button>{notice?.type === 'error' && <p className="form-error checkout-error" role="alert">{notice.message}</p>}</div></>}</aside></div>}
  </main>
}
