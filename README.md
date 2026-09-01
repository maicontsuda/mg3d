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
