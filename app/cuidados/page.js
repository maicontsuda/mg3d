import InfoPage from '../components/InfoPage'

export const metadata = {
  title: 'Cuidados com peças impressas em 3D — MG3D',
  description: 'Orientações para limpar, conservar e usar produtos MG3D impressos em PLA, PETG e TPU.',
}

export default function CarePage() {
  return <InfoPage
    eyebrow="Faça sua peça durar"
    title={<>Cuidados simples.<br />Mais tempo com você.</>}
    intro="Produtos impressos em 3D têm textura, acabamento e limites próprios do material. Siga as orientações da página de cada produto e, em caso de dúvida, fale com a MG3D."
  >
    <section><span>01</span><div><h2>Limpeza</h2><p>Use pano macio levemente umedecido e sabão neutro. Evite produtos abrasivos, solventes, álcool concentrado e esponjas ásperas, que podem alterar a cor e o acabamento.</p></div></section>
    <section><span>02</span><div><h2>Calor e sol</h2><p>Não deixe peças de PLA dentro de veículos fechados, próximas a chamas, aquecedores ou sob sol intenso por longos períodos. Temperaturas elevadas podem deformar o material.</p></div></section>
    <section><span>03</span><div><h2>Água e alimentos</h2><p>A menos que a descrição diga expressamente o contrário, não considere a peça impermeável, própria para lava-louças ou certificada para contato direto com alimentos. Vasos decorativos podem precisar de recipiente interno.</p></div></section>
    <section><span>04</span><div><h2>Peças articuladas</h2><p>Movimente as articulações com cuidado, sem torcer além do limite natural. Não force partes travadas e mantenha componentes pequenos fora do alcance de crianças e animais.</p></div></section>
    <section><span>05</span><div><h2>Variações naturais</h2><p>Linhas de camada e pequenas diferenças de textura fazem parte da impressão 3D. Elas não comprometem o uso e tornam cada unidade visualmente única.</p></div></section>
  </InfoPage>
}
