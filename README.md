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
