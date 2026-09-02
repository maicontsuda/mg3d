# MG3D — Loja de produtos impressos em 3D

Uma experiência de e-commerce para a MG3D, marca de objetos autorais produzidos sob demanda em impressão 3D.

## Experiência

A página inicial apresenta a coleção, busca por produto, filtros por categoria, carrinho lateral com controle de quantidade, manifesto da marca, processo de produção e cadastro de novidades.

## Desenvolvimento

```bash
npm install
npm run dev
```

Para validar uma versão de produção:

```bash
npm run build
npm start
```

## Stack

- Next.js 16 com App Router
- React 19
- CSS responsivo com identidade visual própria
- Catálogo demonstrativo com produtos e imagens de referência

O catálogo está estruturado no arquivo `app/page.js`, facilitando a substituição dos produtos demonstrativos pelos itens reais da MG3D e a integração posterior com estoque, pagamentos e logística.

## Cloudinary

As imagens do catálogo e da página inicial agora são entregues pela CDN do Cloudinary, na pasta `mg3d/products`, com transformações `f_auto`, `q_auto` e largura responsiva. O projeto também inclui `app/api/cloudinary/sign/route.js`, uma rota server-side para assinar uploads de imagens, vídeos e arquivos sem expor o API secret no navegador.

Para ativar o upload no Vercel, configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` e `MG3D_ADMIN_UPLOAD_KEY`. A última variável deve ser um segredo novo, criado especificamente para a área administrativa. Nunca coloque o API secret em `NEXT_PUBLIC_*` nem no repositório. A rota aceita apenas pastas iniciadas por `mg3d/` e exige o header `x-mg3d-admin-key`.

A conta Cloudinary foi validada e recebeu a pasta `mg3d`, com seis imagens migradas para `mg3d/products`. O `ProductForm` do painel administrativo agora envia imagens, vídeos e arquivos (`PDF`, `STL` e `ZIP`) diretamente ao Cloudinary, preenche a URL segura retornada e salva essa URL na coluna `products.image`. Vídeos e arquivos usam a mesma assinatura, mudando automaticamente o `resource_type` no upload.

## Notificações de pedidos

A alteração de status agora passa por `app/api/orders/status/route.js`, que valida o token Supabase e o e-mail administrador antes de atualizar o pedido. O endpoint tenta notificar o cliente por e-mail usando Resend e por WhatsApp usando Twilio, sem bloquear a atualização caso um provedor ainda não esteja configurado. O painel inclui busca por nome/e-mail e filtro por status.

Para e-mail, configure `RESEND_API_KEY` e `RESEND_FROM_EMAIL`. Para WhatsApp, configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` e salve o telefone do cliente no campo `customers.phone` em formato internacional, por exemplo `+819012345678`. As credenciais devem ser adicionadas somente nas variáveis privadas do Vercel.

## Estoque, encomendas e arquivos técnicos

O cadastro administrativo agora possui quantidade em estoque, opção para aceitar encomendas quando o estoque chegar a zero, prazo de produção, checkbox para exibir ou ocultar a foto pública e campo para armazenar um arquivo técnico ou link interno. O arquivo técnico é salvo em `products.admin_file_url` e não é exibido na loja. A imagem pública pode ser ocultada com `products.photo_visible` sem remover o asset do Cloudinary.

A loja informa ao cliente se há unidades em estoque, se o item está disponível por encomenda e qual é o prazo de produção. Pedidos confirmados reduzem a quantidade disponível no banco; produtos sem estoque e sem encomenda são bloqueados para o carrinho.


### Ativação dos canais de notificação

O código está pronto para envio real, mas os provedores precisam ser ativados com credenciais próprias. Para e-mail, crie uma API key no [Resend](https://resend.com), verifique o domínio remetente e configure `RESEND_API_KEY` e `RESEND_FROM_EMAIL` nas variáveis privadas do Vercel. Para WhatsApp, ative o WhatsApp Business no [Twilio](https://www.twilio.com/whatsapp), configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` e `TWILIO_WHATSAPP_FROM`; o telefone em `customers.phone` deve estar em formato E.164, como `+819012345678`.

O arquivo `.env.example` contém o modelo dessas variáveis. O endpoint atualiza o pedido primeiro e trata o envio em seguida: se um provedor estiver indisponível, o pedido continua atualizado e o painel informa a configuração pendente. A mesma mudança de status não é reenviada quando o administrador seleciona o status já salvo.

## Documento imprimível do pedido

O painel administrativo agora tem o botão `Imprimir nota` em cada pedido. Ele gera uma página separada com MG3D, número do pedido, cliente, e-mail, status, data, itens, quantidades e total em ienes. A janela de impressão permite imprimir em papel ou salvar como PDF. O documento é uma nota de conferência/expedição; não substitui uma nota fiscal oficial ou recibo fiscal emitido conforme as regras aplicáveis.


## Pagamentos Stripe

O checkout usa uma Checkout Session do Stripe em JPY e redireciona o cliente para a página hospedada do Stripe. Com os métodos ativados no Dashboard, o Stripe pode oferecer PayPay, Konbini, cartões e carteiras elegíveis dinamicamente. O pedido começa como `awaiting_payment`/`unpaid`; somente o webhook `checkout.session.completed` ou `checkout.session.async_payment_succeeded` muda o pedido para `pending`/`paid` e baixa o estoque. Sessões expiradas ou pagamentos assíncronos falhos são marcados como cancelados/failed.

Configure as variáveis do `.env.example` no Vercel. A `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` são privadas. O endpoint do webhook é `https://mg3d.vercel.app/api/stripe/webhook` e deve receber pelo menos `checkout.session.completed`; pagamentos reais exigem trocar as chaves `sk_test`/`pk_test` pelas chaves live depois que a conta Stripe estiver ativada.
