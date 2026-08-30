'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { products, categories, formatJPY } from './catalog'
import { supabase } from './lib/supabase'

const ADMIN_EMAIL = 'maicontsuda@gmail.com'
const emptyProduct = { name: '', category: 'Casa', price: 0, color: '', material: 'PLA', dimensions: '', production: '3 a 5 dias úteis', colors: '', image: '', desc: '', details: '', badge: '', active: true }
const slugify = value => value.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

function ProductForm({ product, onSave, onCancel }) {
  const [form, setForm] = useState(product || emptyProduct)
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))
  function submit(event) {
    event.preventDefault()
    if (!form.name.trim() || !form.price || !form.image.trim()) return
    onSave({ ...form, id: form.id || Date.now(), slug: form.slug || slugify(form.name), price: Number(form.price), active: form.active !== false })
  }
  return <form className="admin-product-form" onSubmit={submit}><div className="admin-form-head"><div><p className="eyebrow"><span></span> Catálogo</p><h3>{product ? 'Editar produto' : 'Novo produto'}</h3></div><button type="button" className="modal-close" onClick={onCancel} aria-label="Fechar formulário"><Icon name="x" /></button></div><div className="admin-form-grid"><label>Nome<input required value={form.name} onChange={e => update('name', e.target.value)} placeholder="Ex.: Vaso Orbit" /></label><label>Preço em ienes<input required min="1" type="number" value={form.price || ''} onChange={e => update('price', e.target.value)} placeholder="1490" /></label><label>Categoria<select value={form.category} onChange={e => update('category', e.target.value)}><option>Casa</option><option>Luz</option><option>Organização</option></select></label><label>Material<select value={form.material} onChange={e => update('material', e.target.value)}><option>PLA</option><option>PETG</option><option>TPU</option></select></label><label>Cor principal<input value={form.color} onChange={e => update('color', e.target.value)} placeholder="Azul" /></label><label>Cores disponíveis<input value={form.colors} onChange={e => update('colors', e.target.value)} placeholder="Azul, branco e preto" /></label><label>Dimensões<input value={form.dimensions} onChange={e => update('dimensions', e.target.value)} placeholder="20 × 15 × 10 cm" /></label><label>Prazo de produção<input value={form.production} onChange={e => update('production', e.target.value)} placeholder="3 a 5 dias úteis" /></label><label className="admin-form-wide">URL da imagem<input required value={form.image} onChange={e => update('image', e.target.value)} placeholder="https://..." /></label><label className="admin-form-wide">Resumo curto<input value={form.desc} onChange={e => update('desc', e.target.value)} placeholder="Uma descrição para a coleção" /></label><label className="admin-form-wide">Descrição completa<textarea rows="3" value={form.details} onChange={e => update('details', e.target.value)} placeholder="Conte a história e os detalhes do produto" /></label></div><div className="admin-form-actions"><button type="button" className="detail-contact" onClick={onCancel}>Cancelar</button><button className="button button-dark" type="submit">Salvar produto <Icon name="check" size={17} /></button></div></form>
}

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
  const [loginMessage, setLoginMessage] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [adminProducts, setAdminProducts] = useState(products)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productFormOpen, setProductFormOpen] = useState(false)
  const [customerPanelOpen, setCustomerPanelOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession()
      const current = sessionData.session?.user
      if (mounted && current) {
        setUser({ id: current.id, email: current.email, isAdmin: current.email?.toLowerCase() === ADMIN_EMAIL })
        await syncCustomer(current)
        const { data: orderData } = await supabase.from('orders').select('*, order_items(*)').eq('customer_id', current.id).order('created_at', { ascending: false })
        if (mounted && orderData) setOrders(orderData)
        if (current.email?.toLowerCase() === ADMIN_EMAIL) {
          const { data: customerData } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
          if (mounted && customerData) setCustomers(customerData)
        }
      }
      const { data } = await supabase.from('products').select('*').order('id')
      if (mounted && data?.length) setAdminProducts(data.map(fromDbProduct))
    }
    load()
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const current = session?.user
      setUser(current ? { id: current.id, email: current.email, isAdmin: current.email?.toLowerCase() === ADMIN_EMAIL } : null)
      if (current) {
        await syncCustomer(current)
        const { data } = await supabase.from('orders').select('*, order_items(*)').eq('customer_id', current.id).order('created_at', { ascending: false })
        if (data) setOrders(data)
        if (current.email?.toLowerCase() === ADMIN_EMAIL) {
          const { data: customerData } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
          if (customerData) setCustomers(customerData)
        }
      }
    })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  async function syncCustomer(current) {
    await supabase.from('customers').upsert({ id: current.id, email: current.email, name: current.user_metadata?.full_name || current.email?.split('@')[0], is_admin: current.email?.toLowerCase() === ADMIN_EMAIL })
  }

  function fromDbProduct(item) { return { ...item, desc: item.description || '', active: item.active !== false } }
  function toDbProduct(product) { return { id: product.id, slug: product.slug || slugify(product.name), name: product.name, category: product.category, price: Number(product.price), color: product.color || '', badge: product.badge || '', image: product.image, description: product.desc || '', details: product.details || '', material: product.material || 'PLA', dimensions: product.dimensions || '', production: product.production || '', colors: product.colors || '', active: product.active !== false } }

  async function saveProduct(product) {
    const payload = toDbProduct(product)
    const { data, error } = await supabase.from('products').upsert(payload).select().single()
    if (error) { setLoginError(`Não foi possível salvar: ${error.message}`); return }
    const saved = fromDbProduct(data)
    setAdminProducts(current => current.some(item => item.id === saved.id) ? current.map(item => item.id === saved.id ? saved : item) : [...current, saved])
    setProductFormOpen(false); setEditingProduct(null); setLoginError('')
  }

  async function removeProduct(id) {
    if (!window.confirm('Remover este produto do catálogo?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { setLoginError(`Não foi possível excluir: ${error.message}`); return }
    setAdminProducts(current => current.filter(item => item.id !== id))
  }

  async function toggleProduct(id) {
    const product = adminProducts.find(item => item.id === id)
    if (!product) return
    const { error } = await supabase.from('products').update({ active: product.active === false }).eq('id', id)
    if (error) { setLoginError(`Não foi possível alterar o status: ${error.message}`); return }
    setAdminProducts(current => current.map(item => item.id === id ? { ...item, active: item.active === false } : item))
  }

  const filtered = useMemo(() => adminProducts.filter(p => p.active !== false && (category === 'Todos' || p.category === category) && p.name.toLowerCase().includes(query.toLowerCase())), [adminProducts, category, query])
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)

  async function handleLogin(event) {
    event.preventDefault()
    const email = loginEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) { setLoginError('Digite um e-mail válido.'); return }
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    if (error) { setLoginError(error.message); return }
    setLoginError(''); setLoginMessage('Enviamos um link de acesso para o seu e-mail. Abra-o para concluir o login.'); setLoginEmail('')
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

  async function checkout() {
    if (!user) { setCartOpen(false); setLoginOpen(true); return }
    const { data: sessionData } = await supabase.auth.getSession()
    const customerId = sessionData.session?.user?.id
    if (!customerId) { setCartOpen(false); setLoginOpen(true); return }
    const { data: order, error } = await supabase.from('orders').insert({ customer_id: customerId, total: cartTotal, status: 'pending' }).select().single()
    if (error) { setLoginError(`Não foi possível criar o pedido: ${error.message}`); return }
    const { error: itemsError } = await supabase.from('order_items').insert(cart.map(item => ({ order_id: order.id, product_id: typeof item.id === 'number' ? item.id : null, product_name: item.name, unit_price: item.price, quantity: item.qty })))
    if (itemsError) { setLoginError(`Pedido criado, mas os itens não foram salvos: ${itemsError.message}`); return }
    setOrders(current => [{ ...order, order_items: cart.map(item => ({ product_name: item.name, unit_price: item.price, quantity: item.qty })) }, ...current])
    setCart([]); setCartOpen(false); setAccountOpen(true)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setOrders([]); setAdminOpen(false); setAccountOpen(false)
  }

  return <main>
    <div className="announcement"><Icon name="spark" size={15} /> FRETE GRÁTIS ACIMA DE ¥5.000 <span>·</span> PRECISÃO EM CADA CAMADA</div>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="MG3D início"><img className="brand-logo" src="/logo-mg.webp" alt="MG 3D Print" /><span><em>M</em><strong>G</strong><i>3D</i><small>PRINT LAB</small></span></a>
      <nav><a href="#colecao">Coleção</a><a href="#processo">Como fazemos</a><a href="#sobre">Sobre a MG3D</a></nav>
      <div className="header-actions"><label className="search"><Icon name="search" size={18} /><input aria-label="Buscar produtos" placeholder="Buscar" value={query} onChange={e => setQuery(e.target.value)} /></label><button className="account-button" onClick={() => user ? (user.isAdmin ? setAdminOpen(true) : setAccountOpen(true)) : setLoginOpen(true)}>{user ? (user.isAdmin ? 'Painel admin' : 'Minha conta') : 'Entrar'}</button><button className="bag-button" onClick={() => setCartOpen(true)} aria-label="Abrir carrinho"><Icon name="bag" size={21} />{cartCount > 0 && <b>{cartCount}</b>}</button></div>
    </header>

    <section className="hero" id="top">
      <div className="hero-copy"><p className="eyebrow"><span></span> Imprimindo design em 3D</p><p className="hero-slogan">Objetos que ganham forma.</p><h1>Inovação Em<br /><i>Cada Camada.</i></h1><p className="hero-text">Peças impressas em 3D para deixar seus espaços mais funcionais, mais bonitos e muito mais seus.</p><a className="button button-dark" href="#colecao">Explorar coleção <Icon name="arrow" size={17} /></a><div className="hero-note"><div className="avatar-stack"><span>✦</span><span>◌</span><span>✳</span></div><span>Feito em pequenos lotes<br /><strong>por quem acredita no detalhe.</strong></span></div></div>
      <div className="hero-art"><div className="sun"></div><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="hero-card card-back"></div><div className="hero-card card-front"><img src="https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1100&q=90" alt="Vaso Orbital em ambiente" /></div><div className="hero-logo-plate"><img src="/logo-mg.webp" alt="MG 3D Print" /></div><span className="float-tag tag-top">01 / 06</span><span className="float-tag tag-bottom">Design + função</span></div>
    </section>

    <section className="ticker"><span>IMPRESSO COM INTENÇÃO</span><span>✳</span><span>MENOS DESPERDÍCIO</span><span>✳</span><span>FEITO NO JAPÃO</span><span>✳</span><span>IMPRESSO COM INTENÇÃO</span></section>

    <section className="collection section" id="colecao"><div className="section-heading"><div><p className="eyebrow"><span></span> A coleção atual</p><h2>Pequenos objetos.<br /><i>Grande presença.</i></h2></div><p>Designs pensados para acompanhar seus rituais diários — da primeira luz do dia ao último café.</p></div><div className="filter-row"><div className="filters">{categories.map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><span className="product-count">{filtered.length} peças encontradas</span></div><div className="product-grid">{filtered.map((product, index) => <article className={`product-card card-${index % 3}`} key={product.id}><div className="product-image"><img src={product.image} alt={product.name} /><span className="product-badge">{product.badge || product.category}</span><button className="quick-add" onClick={() => addToCart(product)} aria-label={`Adicionar ${product.name}`}><Icon name="plus" size={18} /></button></div><div className="product-info"><div><h3><Link href={`/produtos/${product.slug}`}>{product.name}</Link></h3><p>{product.desc}</p></div><strong>{formatJPY(product.price)}</strong></div><div className="product-meta"><span>{product.color}</span><span>Produzido sob demanda</span></div></article>)}</div></section>

    <section className="manifesto section" id="processo"><div className="manifesto-image"><div className="process-visual-art"><img className="process-logo" src="/logo-mg.webp" alt="Logo MG 3D Print" /></div><span className="process-caption">DO ARQUIVO<br /><i>AO OBJETO.</i></span></div><div className="manifesto-copy"><p className="eyebrow"><span></span> Nosso jeito de fazer</p><h2>Design consciente,<br /><i>sem linha de montagem.</i></h2><p>A gente acredita que uma boa peça nasce de uma boa pergunta: ela precisa existir? Cada produto MG3D é desenhado, impresso e finalizado por aqui, um de cada vez.</p><div className="values"><div><b>01</b><span><strong>Sob demanda</strong>produzimos o que você mais precisa.</span></div><div><b>02</b><span><strong>Material</strong>PLA, PETG e TPU o material para cada produto.</span></div><div><b>03</b><span><strong>Feito por pessoas</strong>Do primeiro rascunho ao seu pacote.</span></div></div><a className="text-link" href="#sobre">Conheça nossa história <Icon name="arrow" size={16} /></a></div></section>

    <section className="newsletter section" id="sobre"><div><p className="eyebrow"><span></span> Entre para o clube</p><h2>Novidades que<br /><i>valem espaço.</i></h2></div><div><p>Receba lançamentos, bastidores e uma dose de inspiração — sem spam, prometemos.</p>{subscribed ? <div className="success"><Icon name="check" size={18} /> Você está na lista. Até breve!</div> : <form onSubmit={e => { e.preventDefault(); if (newsletter) setSubscribed(true) }}><input type="email" required placeholder="seu melhor e-mail" value={newsletter} onChange={e => setNewsletter(e.target.value)} /><button aria-label="Cadastrar e-mail"><Icon name="arrow" size={18} /></button></form>}<small>Ao assinar, você concorda com nossa política de privacidade.</small></div></section>

    <footer><div className="footer-brand"><a className="brand" href="#top"><img className="brand-logo" src="/logo-mg.webp" alt="MG 3D Print" /><span><em>M</em><strong>G</strong><i>3D</i><small>PRINT LAB</small></span></a><p>Objetos que ganham forma.<br />E um lugar na sua casa.</p></div><div className="footer-links"><div><b>Explorar</b><a href="#colecao">Coleção</a><a href="#processo">Nosso processo</a><a href="#sobre">Sobre nós</a></div><div><b>Ajuda</b><a href="#top">Envios e trocas</a><a href="#top">Cuidados com as peças</a><a href="#top">Fale com a gente</a></div></div><div className="footer-bottom"><span>© 2026 MG3D. Feito com intenção.</span><span>Instagram &nbsp;·&nbsp; Pinterest</span></div></footer>

    {loginOpen && <div className="overlay" onClick={() => setLoginOpen(false)}><section className="login-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setLoginOpen(false)} aria-label="Fechar"><Icon name="x" /></button><p className="eyebrow"><span></span> Área exclusiva</p><h2>Entre na<br /><i>MG3D.</i></h2><p className="modal-copy">Acompanhe seus pedidos e tenha uma experiência mais pessoal.</p>{loginMessage && <p className="login-success">{loginMessage}</p>}<form onSubmit={handleLogin}><label>E-mail</label><input type="email" autoFocus required placeholder="voce@email.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />{loginError && <small className="form-error">{loginError}</small>}<button className="button button-dark full" type="submit">Continuar <Icon name="arrow" size={17} /></button></form><small className="modal-foot">Ao continuar, você concorda com os termos da MG3D.</small></section></div>}

    {adminOpen && user?.isAdmin && <div className="overlay" onClick={() => setAdminOpen(false)}><section className="admin-modal" onClick={e => e.stopPropagation()}>{productFormOpen ? <ProductForm product={editingProduct} onSave={saveProduct} onCancel={() => { setProductFormOpen(false); setEditingProduct(null) }} /> : <><div className="drawer-head"><div><p className="eyebrow"><span></span> Acesso administrador</p><h2>Painel <i>MG3D</i></h2></div><button onClick={() => setAdminOpen(false)} aria-label="Fechar painel"><Icon name="x" /></button></div><div className="admin-welcome"><span className="admin-dot"></span><div><strong>Olá, Maicon</strong><p>Você está conectado como administrador.</p></div></div><div className="admin-grid"><button onClick={() => { setEditingProduct(null); setProductFormOpen(true) }}><span>＋</span><strong>Adicionar produto</strong><small>Criar uma nova página de produto</small><Icon name="arrow" size={16} /></button><button onClick={() => document.getElementById('admin-product-list')?.scrollIntoView({ behavior: 'smooth' })}><span>⌘</span><strong>Gerenciar produtos</strong><small>{adminProducts.length} produtos no catálogo</small><Icon name="arrow" size={16} /></button><button onClick={() => setCustomerPanelOpen(current => !current)}><span>◎</span><strong>Gerenciar clientes</strong><small>{customers.length} cliente{customers.length === 1 ? '' : 's'} cadastrado{customers.length === 1 ? '' : 's'}</small><Icon name="arrow" size={16} /></button>{customerPanelOpen && <div className="admin-customer-list"><strong>Clientes cadastrados</strong>{customers.length ? customers.map(customer => <div key={customer.id}><span>{customer.name || 'Cliente'}</span><small>{customer.email}</small><b>{customer.is_admin ? 'Administrador' : 'Cliente'}</b></div>) : <p>Nenhum cliente autenticado ainda.</p>}</div>}</div><div className="admin-product-list" id="admin-product-list"><div className="admin-list-head"><strong>Produtos cadastrados</strong><button className="detail-contact" onClick={() => { setEditingProduct(null); setProductFormOpen(true) }}>+ Novo produto</button></div>{adminProducts.map(product => <div className={`admin-product-row ${product.active === false ? 'inactive' : ''}`} key={product.id}><img src={product.image} alt="" /><div><strong>{product.name}</strong><small>{formatJPY(product.price)} · {product.material} · {product.active === false ? 'Desativado' : 'Ativo'}</small></div><button onClick={() => toggleProduct(product.id)}>{product.active === false ? 'Ativar' : 'Desativar'}</button><button onClick={() => { setEditingProduct(product); setProductFormOpen(true) }}>Editar</button><button className="danger" onClick={() => removeProduct(product.id)}>Excluir</button></div>)}</div><div className="admin-session"><span>{user.email}</span><button onClick={signOut}>Sair da conta</button></div></>}</section></div>}

    {accountOpen && user && <div className="overlay" onClick={() => setAccountOpen(false)}><section className="login-modal account-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setAccountOpen(false)} aria-label="Fechar"><Icon name="x" /></button><p className="eyebrow"><span></span> Minha conta</p><h2>Seus <i>pedidos.</i></h2><p className="modal-copy">{user.email}</p>{orders.length ? <div className="order-history">{orders.map(order => <div className="order-card" key={order.id}><div><strong>Pedido #{order.id}</strong><span>{new Date(order.created_at).toLocaleDateString('ja-JP')}</span></div><p>{order.order_items?.map(item => `${item.product_name} × ${item.quantity}`).join(', ')}</p><b>{formatJPY(order.total)} · {order.status === 'pending' ? 'Recebido' : order.status}</b></div>)}</div> : <p className="empty-account">Você ainda não fez nenhum pedido.</p>}<button className="detail-contact" onClick={signOut}>Sair da conta</button></section></div>}

    {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={e => e.stopPropagation()}><div className="drawer-head"><div><p className="eyebrow"><span></span> Sua seleção</p><h2>Carrinho <small>({cartCount})</small></h2></div><button onClick={() => setCartOpen(false)} aria-label="Fechar carrinho"><Icon name="x" /></button></div>{cart.length === 0 ? <div className="empty-cart"><div className="empty-icon"><Icon name="bag" size={28} /></div><h3>Seu carrinho está leve.</h3><p>Escolha uma peça para começar a transformar seu espaço.</p><button className="button button-dark" onClick={() => setCartOpen(false)}>Ver coleção</button></div> : <><div className="cart-items">{cart.map(item => <div className="cart-item" key={item.id}><img src={item.image} alt="" /><div><h3>{item.name}</h3><p>{formatJPY(item.price)}</p><div className="qty"><button onClick={() => updateQty(item.id, -1)}>−</button><span>{item.qty}</span><button onClick={() => updateQty(item.id, 1)}>+</button></div></div></div>)}</div><div className="cart-summary"><div><span>Subtotal</span><strong>{formatJPY(cartTotal)}</strong></div><p>Frete calculado no checkout</p><button className="button button-dark full" onClick={checkout}>Finalizar pedido <Icon name="arrow" size={17} /></button></div></>}</aside></div>}
  </main>
}
