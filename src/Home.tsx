
const Home = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-inter px-6 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <header className="mb-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Bem-vindo ao <span className="text-blue-500">FootballCoreHub</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300">
            A plataforma de análise individual mais inteligente do futebol moderno
          </p>
        </header>

        {/* Seções principais */}
        <section className="grid md:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-2xl font-semibold mb-2">🧠 Inteligência Tática Personalizada</h2>
            <p className="text-gray-400">
              Gere análises pré e pós-jogo baseadas no seu estilo de jogo. Relatórios em vídeo com insights estratégicos, sugestões de evolução e comparação inteligente com outros atletas.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">🚀 Para Jogadores, Clubes e Scouts</h2>
            <p className="text-gray-400">
              Conectamos jogadores com empresários e clubes compatíveis, através de filtros avançados e perfis táticos detalhados. Nossa IA entende o futebol como você joga.
            </p>
          </div>
        </section>

        {/* Destaques Visuais */}
        <section className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition">
            <h3 className="text-xl font-bold text-blue-400 mb-2">Perfil Inteligente</h3>
            <p className="text-gray-300">Seu estilo, suas métricas, seus desafios. Tudo em um painel visual completo.</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition">
            <h3 className="text-xl font-bold text-blue-400 mb-2">Análise Pré-Jogo</h3>
            <p className="text-gray-300">Prepare-se contra o adversário com dados estratégicos e vídeos explicativos.</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition">
            <h3 className="text-xl font-bold text-blue-400 mb-2">Análise Pós-Jogo</h3>
            <p className="text-gray-300">Entenda seus pontos fortes, suas falhas e receba sugestões de treino.</p>
          </div>
        </section>

        {/* Chamada Final */}
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">⚡ Comece agora</h2>
          <p className="text-gray-400 mb-6">Crie sua conta e leve sua performance para o próximo nível.</p>
          <a
            href="/cadastro"
            className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-white font-semibold transition"
          >
            Criar Conta
          </a>
        </div>
      </div>
    </div>
  )
}

export default Home
