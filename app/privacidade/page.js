import InfoPage from '../components/InfoPage'

export const metadata = {
  title: 'Política de privacidade — MG3D',
  description: 'Saiba quais dados a MG3D utiliza para autenticação, pedidos, atendimento e novidades.',
}

export default function PrivacyPage() {
  return <InfoPage
    eyebrow="Seus dados, com clareza"
    title={<>Política de<br />privacidade.</>}
    intro="Esta página explica, de forma direta, quais informações são usadas para operar a loja e atender seus pedidos. Última atualização: outubro de 2026."
  >
    <section><span>01</span><div><h2>Dados utilizados</h2><p>A MG3D pode tratar nome, e-mail, identificador da conta, telefone quando fornecido, itens do pedido, valores, status e mensagens enviadas durante o atendimento. A newsletter armazena somente o e-mail informado.</p></div></section>
    <section><span>02</span><div><h2>Finalidades</h2><p>Os dados são usados para autenticar sua conta, registrar e acompanhar pedidos, responder dúvidas, combinar entrega e pagamento, prevenir abuso e, mediante cadastro, enviar novidades da MG3D.</p></div></section>
    <section><span>03</span><div><h2>Serviços envolvidos</h2><p>A operação pode utilizar Supabase para autenticação e banco de dados, Vercel para hospedagem, Cloudinary para mídia e, quando ativados, Resend, Twilio e WhatsApp para comunicação. Cada serviço possui suas próprias práticas de privacidade.</p></div></section>
    <section><span>04</span><div><h2>Compartilhamento e segurança</h2><p>A MG3D não vende dados pessoais. Informações são compartilhadas apenas com serviços necessários à operação e ao atendimento. São aplicados controles de acesso e separação entre chaves públicas e credenciais privadas.</p></div></section>
    <section><span>05</span><div><h2>Suas escolhas</h2><p>Você pode solicitar correção ou exclusão de informações e cancelar novidades a qualquer momento. Para exercer essas opções, escreva para <a href="mailto:maicntsuda@gmail.com">maicntsuda@gmail.com</a>.</p></div></section>
  </InfoPage>
}
