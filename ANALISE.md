# Análise técnica da MG3D

Revisão completa do projeto (Next.js 16 + React 19 + Supabase + Stripe + Cloudinary),
com o que foi **corrigido agora** e o que fica recomendado para os próximos passos.

---

## 1. Resumo executivo

O projeto tinha uma base boa — App Router, RLS no Supabase, Stripe com webhook,
uploads assinados no Cloudinary — mas concentrava toda a aplicação em um único
componente cliente e tinha **falhas críticas de segurança e de integridade de dados**
no caminho do dinheiro.

| Área | Antes | Agora |
|---|---|---|
| Preço do pedido | Definido pelo navegador | Recalculado no servidor a partir do banco |
| E-mail de admin | Duas grafias divergentes (UI x banco) | Uma constante única, configurável por env |
| Schema SQL | Faltavam 5 colunas que o código já usava | Schema completo e idempotente |
| Baixa de estoque | Ler-modificar-gravar (condição de corrida) | Função SQL atômica |
| Dependências | Next 16.3.3 com CVE crítico | Next 16.3.8 |
| Lint | `next lint` (removido no Next 16) | ESLint 9 flat config, sem erros |
| SEO | Sem sitemap, robots, OG ou dados estruturados | Tudo presente + JSON-LD de produto |
| Página de produto | Só conhecia o catálogo estático (404 em produto novo) | Lê do Supabase com ISR |

---

## 2. Problemas críticos encontrados (corrigidos)

### 2.1 Qualquer cliente podia definir o preço que quisesse — CRÍTICO

O checkout antigo criava o pedido **no navegador**:

```js
supabase.from('orders').insert({ customer_id, total: cartTotal, ... })
supabase.from('order_items').insert(cart.map(item => ({ unit_price: item.price, ... })))
```

`cartTotal` e `unit_price` vinham do estado do React. Bastava abrir o console e
chamar a mesma inserção com `unit_price: 1` para comprar um vaso de ¥1.490 por ¥1 —
a rota `/api/stripe/checkout` lia os valores já gravados pelo cliente e montava a
sessão do Stripe em cima deles. As policies de RLS permitiam explicitamente essa
inserção (`users_create_orders`, `users_create_order_items`).

**Correção:** o navegador agora envia apenas `[{ productId, quantity }]`. O servidor
carrega os produtos, valida se estão ativos, confere estoque/encomenda, recalcula
`unit_price` e `total` a partir do banco, cria o pedido com a *service role key* e só
então abre a sessão do Stripe (com `idempotencyKey`, evitando cobrança dupla em
retry). As policies de INSERT do cliente foram removidas do schema.

### 2.2 O administrador estava dividido entre dois e-mails

- `app/page.js`: `maicontsuda@gmail.com`
- API, RLS e contato: `maicntsuda@gmail.com`

O painel abria na interface, mas **toda escrita era recusada pela RLS** — exatamente
o tipo de bug que parece "o Supabase não funciona". Agora existe `ADMIN_EMAIL` em
`app/lib/config.js` (env `NEXT_PUBLIC_ADMIN_EMAIL`) e a função `public.is_mg3d_admin()`
no banco: **dois lugares, um valor**. Confirme qual grafia é a correta e ajuste os dois.

### 2.3 O schema SQL não tinha as colunas que o código usava

`orders.payment_status`, `payment_provider`, `payment_session_id`,
`payment_intent_id` e `customers.phone` eram lidos/escritos pelo checkout, pelo
webhook e pelas notificações, mas **não existiam** em `supabase/schema.sql`. Em um
banco criado a partir desse arquivo, o checkout falharia na primeira inserção.
Também faltava policy de UPDATE em `orders`: a troca de status pelo painel era
bloqueada pela RLS.

### 2.4 Baixa de estoque com condição de corrida

O webhook fazia `select stock_quantity` → `update stock_quantity - qty`. Dois
pagamentos simultâneos podiam ler o mesmo valor e vender estoque inexistente. Agora
há `public.decrement_product_stock()` (SQL atômico, `security definer`, com execução
concedida só para `service_role`) e o próprio UPDATE do pedido funciona como trava de
idempotência (`.neq('payment_status', 'paid')`), impedindo baixa dupla quando o
Stripe reenvia o mesmo evento.

### 2.5 `ReferenceError` ao imprimir a nota com pop-up bloqueado

Em `AdminOrders.printOrder`, o fallback chamava `setLoginError(...)` — função que só
existe dentro do componente `Home`. Com pop-ups bloqueados, o clique quebrava a
interface em vez de mostrar o aviso. Agora o componente tem seu próprio estado de erro.

### 2.6 Vulnerabilidade crítica na dependência

`next@16.3.3` está na faixa afetada pelo [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j)
(RCE em `next/og`). Atualizado para `16.3.8`; `@supabase/supabase-js` e `stripe`
também foram atualizados. `npm audit` agora sai limpo.

### 2.7 Escalada de privilégio latente

`syncCustomer` gravava `is_admin` a partir do navegador. A policy permitia que o
usuário atualizasse a própria linha, então `is_admin: true` era gravável pelo cliente.
Hoje isso não dava acesso de fato (a RLS compara o e-mail do JWT), mas era uma bomba
armada para o dia em que alguma policy passasse a olhar `customers.is_admin`.
O campo saiu do payload do navegador.

---

## 3. Problemas importantes (corrigidos)

| # | Problema | Correção |
|---|---|---|
| 1 | Produto criado no painel dava **404**: `/produtos/[slug]` só lia `app/catalog.js` | `app/lib/products.js` busca no Supabase com fallback estático + ISR de 5 min |
| 2 | `params.slug` acessado de forma síncrona (no Next 15+ `params` é Promise) | `const { slug } = await params` |
| 3 | Chave do Supabase caía em `'placeholder-anon-key'` silenciosamente | Erro explícito no console quando a env falta |
| 4 | Redirect de login fixo em `https://mg3d.vercel.app` | Usa `window.location.origin` (funciona local e em preview) |
| 5 | Newsletter **fingia** sucesso e descartava o e-mail | Tabela `newsletter_subscribers` + `POST /api/newsletter` |
| 6 | Carrinho perdido a cada refresh e ao voltar do Stripe | Persistido em `localStorage`; limpo só quando o pagamento confirma |
| 7 | Erros de admin/estoque iam para o estado do formulário de login (invisíveis) | Aviso global `.app-notice` com tipo erro/info |
| 8 | Upload exigia digitar `MG3D_ADMIN_UPLOAD_KEY` a cada sessão | Autoriza pela sessão Supabase do admin; a chave virou fallback |
| 9 | Comparação da chave de upload vulnerável a *timing attack* | `crypto.timingSafeEqual` |
| 10 | Sem cabeçalhos de segurança; `X-Powered-By` exposto | `next.config.js` com nosniff, Referrer-Policy, Permissions-Policy, HSTS e X-Frame-Options (em produção) |
| 11 | `npm run lint` quebrado (`next lint` foi removido no Next 16) | ESLint 9 flat config com `eslint-config-next` |
| 12 | Sem `robots`, `sitemap`, OpenGraph, canonical ou dados estruturados | `app/robots.js`, `app/sitemap.js`, metadata completa, JSON-LD `Product` |
| 13 | Sem página de erro nem 404 com identidade visual | `app/error.js` e `app/not-found.js` |
| 14 | Fontes via `@import` no CSS (bloqueia a renderização) | `<link rel=preconnect>` + `<link rel=stylesheet>` no `<head>` |
| 15 | CSS com `font: 13px var(--body)` — variável inexistente, regra inválida | Corrigido para `var(--sans)` |
| 16 | `.env.example` sem Supabase e sem Cloudinary | Arquivo completo e comentado |
| 17 | Três componentes grandes dentro de `page.js` | Extraídos para `app/components/` |
| 18 | Sem índices em `orders(status)`, `order_items(order_id)`, `products(slug)` | Criados; `updated_at` agora é mantido por trigger |

---

## 4. O que NÃO foi feito (recomendações priorizadas)

### Alta prioridade

1. **Confirmar o e-mail do administrador.** Defina `NEXT_PUBLIC_ADMIN_EMAIL` no Vercel
   e o mesmo valor dentro de `public.is_mg3d_admin()` em `supabase/schema.sql`.
   Enquanto as duas grafias não forem conciliadas, o painel não escreve no banco.
2. **Rodar o novo `supabase/schema.sql`** no projeto Supabase. Ele é idempotente, mas
   revise a remoção das policies `users_create_orders` / `users_create_order_items`:
   é ela que fecha a brecha de preço.
3. **Testes automatizados.** Hoje não há nenhum. O mínimo valioso: testes de unidade
   para `parseItems`/cálculo de total no checkout e um teste de integração do webhook
   (evento duplicado não pode baixar estoque duas vezes). `vitest` + `@testing-library/react`.
4. **CI no GitHub Actions**: `npm ci && npm run lint && npm run build` em cada PR.
5. **Frete e impostos.** O texto diz "frete calculado no checkout" e "frete grátis acima
   de ¥5.000", mas não existe cálculo de frete nem endereço de entrega — o pedido não
   tem para onde ir. É a maior lacuna funcional da loja.
6. **Rate limiting** em `/api/newsletter` e `/api/stripe/checkout` (ex.: Upstash
   Redis ou Vercel Firewall). Hoje dá para criar pedidos em massa com uma conta válida.

### Média prioridade

7. **Dividir `app/page.js`** (ainda ~300 linhas densas, com carrinho, auth, admin e
   vitrine no mesmo componente). Sugestão: `CartDrawer`, `LoginModal`, `AccountModal`,
   `AdminPanel` + um `useCart`/`useAuth` em `app/hooks/`.
8. **Reformatar o código.** Linhas de 4.000 caracteres e CSS minificado à mão custam caro
   em revisão. Adicione Prettier (`printWidth: 120`) e rode uma vez em todo o projeto.
9. **`next/image`** nas fotos de produto (o `remotePatterns` do Cloudinary já está
   configurado): ganha srcset, lazy loading e evita CLS. Exige ajustar o CSS que hoje
   usa `object-fit` em `<img>` solto.
10. **Endereço de entrega + `shipping_address_collection`** na sessão do Stripe.
11. **Dividir `globals.css`** (32 KB em uma linha) em módulos CSS por área, ou adotar
    CSS Modules/Tailwind. Hoje qualquer ajuste exige editar um blob único.
12. **Internacionalização.** A loja é feita no Japão, com preços em ienes, mas a
    interface é só em pt-BR. `next-intl` com pt/ja/en ampliaria o público real.
13. **Realtime desnecessário para o cliente.** O canal `mg3d-orders-live` é aberto para
    *todo* visitante, mesmo deslogado, e recarrega todos os pedidos a cada evento.
    Deveria existir só quando o painel admin está aberto.
14. **Acessibilidade:** modais não prendem o foco (`focus trap`), não fecham com `Esc`
    e não têm `role="dialog"`/`aria-modal`. O contraste de `--muted` (#8fa3bf) sobre
    `#080d16` passa, mas `nav a` usa `#545550` sobre fundo escuro — abaixo de 4.5:1.

### Baixa prioridade

15. **TypeScript** (ou ao menos `checkJs` + JSDoc) — o projeto já roda o passo
    "Running TypeScript" no build sem nenhum tipo definido.
16. **Observabilidade:** Sentry ou Vercel Observability nas rotas de pagamento; hoje só
    há `console.error`.
17. **`public/logo-mg.webp` tem 136 KB** para ser exibido a 43×43 px. Gerar versões
    menores derruba isso para poucos KB.
18. **Nota fiscal japonesa.** O documento impresso é uma nota de conferência; para o
    Japão, considere os requisitos do sistema de fatura qualificada (インボイス制度).
19. **`app/catalog.js`** continua como fallback — bom para resiliência, mas os seis
    produtos demo aparecem se o Supabase falhar. Decida se isso é desejável em produção.

---

## 5. Como validar

```bash
npm install
npm run lint     # ESLint 9 — sem erros
npm run build    # build de produção
npm run dev      # http://localhost:3000
```

Depois de aplicar `supabase/schema.sql`, teste o caminho crítico:

1. Login → adicionar ao carrinho → finalizar pedido (deve criar o pedido no servidor).
2. Tente forçar `unit_price` pelo console: a inserção agora é recusada pela RLS.
3. Reenvie o mesmo evento `checkout.session.completed` pelo CLI do Stripe: o estoque
   deve baixar **uma única vez**.
