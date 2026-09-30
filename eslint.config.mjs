import coreWebVitals from 'eslint-config-next/core-web-vitals'

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'out/**'] },
  ...coreWebVitals,
  {
    rules: {
      // O layout depende de CSS próprio (object-fit, clip-path, filtros), por isso
      // o <img> continua permitido. A migração para next/image está no ANALISE.md.
      '@next/next/no-img-element': 'off',
    },
  },
]

export default config
