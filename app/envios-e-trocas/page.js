import InfoPage from '../components/InfoPage'

export const metadata = {
  title: 'Pedidos, envios e trocas — MG3D',
  description: 'Entenda como funcionam os pedidos pelo WhatsApp, a produção, o envio e o atendimento pós-venda da MG3D.',
}

export default function ShippingAndReturnsPage() {
  return <InfoPage
    eyebrow="Antes e depois do pedido"
    title={<>Pedidos, envios<br />e trocas.</>}
    intro="Cada peça tem características próprias de produção. Por isso, disponibilidade, entrega e pagamento são confirmados com transparência antes da conclusão do pedido."
  >
    <section><span>01</span><div><h2>Como o pedido funciona</h2><p>Monte o carrinho, entre na sua conta e envie o resumo pelo WhatsApp. O pedido fica registrado na MG3D, mas só é considerado confirmado depois que disponibilidade, prazo, frete e forma de pagamento forem acordados na conversa.</p></div></section>
    <section><span>02</span><div><h2>Produção e prazo</h2><p>O prazo indicado em cada produto é uma estimativa de produção. Pedidos com várias peças, personalizações ou períodos de alta demanda podem precisar de mais tempo. O prazo final será informado antes do pagamento.</p></div></section>
    <section><span>03</span><div><h2>Entrega</h2><p>O valor e a modalidade de envio dependem do endereço e das dimensões do pedido. Essas informações são calculadas e confirmadas pelo WhatsApp. Quando houver rastreamento disponível, o código será enviado ao cliente.</p></div></section>
    <section><span>04</span><div><h2>Alterações e cancelamentos</h2><p>Se precisar alterar ou cancelar um pedido, fale com a MG3D o quanto antes. Peças personalizadas ou cuja produção já tenha começado podem ter condições específicas, sempre apresentadas antes do pagamento.</p></div></section>
    <section><span>05</span><div><h2>Problemas com a peça</h2><p>Se o produto chegar danificado ou diferente do que foi confirmado, preserve a embalagem e envie fotos pelo WhatsApp assim que possível. A MG3D avaliará o caso e informará as opções aplicáveis de correção, substituição ou devolução.</p></div></section>
  </InfoPage>
}
