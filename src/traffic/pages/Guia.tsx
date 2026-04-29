import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Step {
  number: number
  icon: string
  title: string
  subtitle: string
  description: string
  actions: { label: string; path: string; primary?: boolean }[]
  tips: string[]
  badge?: string
}

interface Section {
  id: string
  icon: string
  title: string
  color: string
  steps: Step[]
}

// ─── Content ──────────────────────────────────────────────────────────────────
const SECTIONS: Section[] = [
  {
    id: 'start',
    icon: '🚀',
    title: '1. Primeiros Passos',
    color: 'violet',
    steps: [
      {
        number: 1,
        icon: '📦',
        title: 'Cadastre seu Produto',
        subtitle: 'A base de tudo começa aqui',
        badge: 'Obrigatório',
        description:
          'Todo o sistema gira em torno do produto. Cadastre nome, nicho, público-alvo, promessa principal, mecanismo único e URL da página de vendas. Quanto mais completo, melhor a IA vai trabalhar para você.',
        actions: [
          { label: 'Novo Produto', path: '/produtos/novo', primary: true },
          { label: 'Ver Produtos', path: '/produtos' },
        ],
        tips: [
          'Preencha a "Dor Principal" e "Desejo Principal" com detalhes reais do seu cliente',
          'Adicione a URL da página de vendas e do checkout para análise de conversão',
          'Descreva o Mecanismo Único — o que diferencia sua oferta',
        ],
      },
      {
        number: 2,
        icon: '🔬',
        title: 'Diagnóstico de Oferta',
        subtitle: 'Valide sua oferta antes de investir',
        description:
          'A IA analisa 8 pontos críticos da sua oferta (headline, promessa, prova social, garantia, urgência, preço, valor percebido) e gera um score de 0 a 100 com recomendações detalhadas. Faça isso ANTES de criar campanhas.',
        actions: [
          { label: 'Diagnosticar Oferta', path: '/oferta', primary: true },
        ],
        tips: [
          'Score abaixo de 60? Ajuste a oferta antes de escalar',
          'Use as recomendações da IA para melhorar sua landing page',
          'Refaça o diagnóstico após mudanças para comparar evolução',
        ],
      },
    ],
  },
  {
    id: 'campaigns',
    icon: '📢',
    title: '2. Campanhas & Criativos',
    color: 'blue',
    steps: [
      {
        number: 3,
        icon: '📢',
        title: 'Crie Campanhas com IA',
        subtitle: 'Estratégia completa em segundos',
        description:
          'A IA gera uma estratégia completa de campanha: objetivo, público-alvo, segmentação, budget recomendado, estrutura de conjunto de anúncios e cronograma de otimização — tudo baseado no seu produto.',
        actions: [
          { label: 'Nova Campanha', path: '/campanhas/nova', primary: true },
          { label: 'Ver Campanhas', path: '/campanhas' },
        ],
        tips: [
          'Comece com campanhas de "Validação de Oferta" antes de escalar',
          'Use o objetivo "Teste Criativo" para descobrir o melhor ângulo',
          'Configure o budget diário realista — a IA sugere valores baseados no nicho',
        ],
      },
      {
        number: 4,
        icon: '🎨',
        title: 'Gere Criativos com IA',
        subtitle: 'Hooks, copies e variações prontas',
        description:
          'Gere briefs completos de criativos com hook, copy para o anúncio, legenda, CTA e roteiro para vídeo. Use "Gerar Mix" para criar 6 criativos com ângulos diferentes de uma vez e já chegar com variedade no teste A/B.',
        actions: [
          { label: 'Gerar Mix (6 criativos)', path: '/criativos/mix', primary: true },
          { label: 'Novo Criativo', path: '/criativos/novo' },
          { label: 'Ver Criativos', path: '/criativos' },
        ],
        tips: [
          '"Gerar Mix" é o caminho mais rápido — 6 ângulos diferentes em uma tacada',
          'Teste pelo menos 3-5 criativos por campanha para encontrar vencedores',
          'Ângulos que funcionam: dor, transformação, prova, autoridade, curiosidade',
        ],
      },
    ],
  },
  {
    id: 'metrics',
    icon: '📈',
    title: '3. Métricas & Análise',
    color: 'emerald',
    steps: [
      {
        number: 5,
        icon: '📊',
        title: 'Importe suas Métricas',
        subtitle: 'Alimente a IA com dados reais',
        description:
          'Importe dados do Meta Ads, Google Ads e TikTok Ads via CSV. O sistema detecta automaticamente as colunas e calcula CTR, CPA, ROAS e outros indicadores. Você também pode lançar métricas manualmente uma a uma.',
        actions: [
          { label: 'Importar CSV', path: '/metricas/importar', primary: true },
          { label: 'Nova Métrica Manual', path: '/metricas/novo' },
          { label: 'Ver Métricas', path: '/metricas' },
        ],
        tips: [
          'Exporte o CSV direto do painel do Meta/TikTok/Google — o sistema reconhece automaticamente',
          'Separe as métricas por criativo para análise individual de performance',
          'Importe pelo menos 7 dias de dados para análises confiáveis',
        ],
      },
      {
        number: 6,
        icon: '🤖',
        title: 'Análise de Decisões IA',
        subtitle: 'Saiba exatamente o que fazer agora',
        description:
          'A IA analisa suas métricas e gera até 6 decisões priorizadas: pausar criativo, escalar orçamento, testar novo público, revisar oferta, criar remarketing — com prazo, risco e passos específicos para executar.',
        actions: [
          { label: 'Gerar Decisões', path: '/decisoes', primary: true },
        ],
        tips: [
          'Decisões "critical" exigem ação imediata — não ignore',
          'Sempre leia o "supporting_data" para entender os números por trás',
          'Execute uma decisão por vez e monitore o resultado antes da próxima',
        ],
      },
    ],
  },
  {
    id: 'scale',
    icon: '🚀',
    title: '4. Otimização & Escala',
    color: 'amber',
    steps: [
      {
        number: 7,
        icon: '📅',
        title: 'Plano Diário de Ação',
        subtitle: 'Sua agenda de tráfego pago do dia',
        description:
          'A IA gera um plano de ação diário com tarefas prioritizadas: o que revisar, o que pausar, o que escalar, o que testar — tudo baseado nos seus dados mais recentes. Comece todo dia pelo plano.',
        actions: [
          { label: 'Gerar Plano do Dia', path: '/plano-diario', primary: true },
        ],
        tips: [
          'Gere o plano logo cedo — antes de abrir os painéis de anúncio',
          'Marque tarefas como concluídas para acompanhar execução',
          'O plano leva em conta todas as campanhas e métricas ativas',
        ],
      },
      {
        number: 8,
        icon: '🚀',
        title: 'Motor de Escala',
        subtitle: 'Identifique oportunidades de escalar',
        description:
          'O Motor de Escala analisa ROAS, CTR, CPA e volume para gerar oportunidades de escala priorizadas: aumentar budget, duplicar campanha, expandir público, criar variação de criativo — com limites seguros e próximos passos.',
        actions: [
          { label: 'Ver Oportunidades', path: '/escala', primary: true },
        ],
        tips: [
          'Só escale campanhas com ROAS ≥ 2x e pelo menos 7 dias de dados',
          'Aumente o budget no máximo 20-30% por vez, aguarde 48h antes de nova escala',
          'Duplicar conjunto de anúncios é mais seguro do que aumentar budget na mesma campanha',
        ],
      },
      {
        number: 9,
        icon: '🔁',
        title: 'Remarketing',
        subtitle: 'Recupere quem já demonstrou interesse',
        description:
          'Gere estratégias completas de remarketing para visitantes, leads e compradores de upsell. A IA cria segmentações, ângulos de copy específicos por estágio do funil e budget recomendado.',
        actions: [
          { label: 'Criar Estratégia', path: '/remarketing', primary: true },
        ],
        tips: [
          'Remarketing de visitantes de página de vendas é o de maior ROAS',
          'Use ângulos diferentes para abandono de carrinho vs. visitantes frios',
          'Frequência máxima recomendada: 3-4x por semana por usuário',
        ],
      },
    ],
  },
  {
    id: 'content',
    icon: '✍️',
    title: '5. Conteúdo & Copy',
    color: 'pink',
    steps: [
      {
        number: 10,
        icon: '🎬',
        title: 'Gerador de VSL',
        subtitle: 'Scripts de vídeo de vendas completos',
        description:
          'Gere scripts completos de VSL (Video Sales Letter) estruturados com hook, história, problema, solução, prova, oferta e CTA — adaptados ao seu produto e público. Inclui indicações de cena e tempo estimado.',
        actions: [
          { label: 'Criar VSL', path: '/vsl', primary: true },
        ],
        tips: [
          'VSLs de 8-12 minutos tendem a converter melhor em nichos de info-produtos',
          'O hook dos primeiros 30 segundos define o sucesso do vídeo',
          'Grave em formato vertical para usar também em Reels/TikTok como criativo',
        ],
      },
      {
        number: 11,
        icon: '📧',
        title: 'Sequência de Email',
        subtitle: 'Fluxo de nutrição e vendas automático',
        description:
          'Gere sequências de email de boas-vindas, nutrição, oferta e reengajamento. Cada email vem com assunto, preview text, corpo completo e CTA — pronto para copiar no seu ESP.',
        actions: [
          { label: 'Criar Sequência', path: '/email', primary: true },
          { label: 'Fluxo WhatsApp', path: '/whatsapp' },
        ],
        tips: [
          'Sequência de boas-vindas: 5-7 emails nos primeiros 14 dias',
          'Assuntos curtos (3-5 palavras) têm taxa de abertura maior',
          'Sempre inclua o mecanismo único do produto nos primeiros 2 emails',
        ],
      },
      {
        number: 12,
        icon: '🖥️',
        title: 'Landing Page & LP Publisher',
        subtitle: 'Páginas de captura e vendas com IA',
        description:
          'Gere estrutura completa de landing page com headline, subheadline, seções de benefícios, prova social e CTA. O LP Publisher gera o HTML completo pronto para publicar — sem precisar de programador.',
        actions: [
          { label: 'LP Publisher (HTML completo)', path: '/landing-publisher', primary: true },
          { label: 'Landing Pages', path: '/landing-page' },
        ],
        tips: [
          'Use o LP Publisher para testes rápidos — HTML gerado em segundos',
          'Sempre teste pelo menos 2 headlines diferentes na mesma página',
          'Mobile first: mais de 70% do tráfego pago chega via celular',
        ],
      },
    ],
  },
  {
    id: 'advanced',
    icon: '⚡',
    title: '6. Funcionalidades Avançadas',
    color: 'cyan',
    steps: [
      {
        number: 13,
        icon: '🛡️',
        title: 'Compliance de Anúncios',
        subtitle: 'Evite reprovações e banimentos',
        description:
          'Analise seus criativos e copies em 5 plataformas (Meta, TikTok, Google, YouTube, Native Ads) antes de publicar. A IA identifica violações de política, linguagem proibida e riscos por plataforma com sugestões de correção.',
        actions: [
          { label: 'Analisar Compliance', path: '/compliance', primary: true },
        ],
        tips: [
          'Sempre analise antes de subir criativos com claims de saúde, finanças ou resultados',
          'Score abaixo de 70 = risco real de reprovação — revise antes de publicar',
          'Cada plataforma tem políticas diferentes — analise uma a uma',
        ],
      },
      {
        number: 14,
        icon: '📊',
        title: 'Relatórios Executivos',
        subtitle: 'Análises completas para decisão estratégica',
        description:
          'Gere relatórios executivos diários, semanais ou mensais com KPIs consolidados, ranking de criativos, decisões tomadas e estratégia de próximos passos — prontos para exportar em PDF, TXT ou CSV.',
        actions: [
          { label: 'Gerar Relatório', path: '/relatorios', primary: true },
        ],
        tips: [
          'Relatório semanal toda segunda-feira para planejar a semana',
          'Exporte em CSV para análise no Excel ou Google Sheets',
          'Compartilhe o PDF com clientes ou sócios para prestação de contas',
        ],
      },
      {
        number: 15,
        icon: '🎯',
        title: 'Auto-Pilot & Automação',
        subtitle: 'Deixe a IA otimizar enquanto você dorme',
        description:
          'O Auto-Pilot monitora suas campanhas e gera decisões automatizadas de otimização. O Auto-Testing gerencia testes A/B de forma inteligente. O Full Auto cria estratégias completas de automação para escala contínua.',
        actions: [
          { label: 'Auto-Pilot', path: '/autopilot', primary: true },
          { label: 'Auto-Testing', path: '/auto-testing' },
          { label: 'Full Auto', path: '/full-auto' },
        ],
        tips: [
          'Comece pelo Auto-Testing para validar criativos antes do Auto-Pilot',
          'Defina regras conservadoras no início — aumente a agressividade gradualmente',
          'Sempre monitore os primeiros 3 dias de automação ativa',
        ],
      },
    ],
  },
]

// ─── Color maps ───────────────────────────────────────────────────────────────
const COLOR: Record<string, { bg: string; border: string; text: string; badge: string; dot: string }> = {
  violet: { bg: 'bg-violet-600/10', border: 'border-violet-600/30', text: 'text-violet-400', badge: 'bg-violet-600/20 text-violet-300', dot: 'bg-violet-500' },
  blue:   { bg: 'bg-blue-600/10',   border: 'border-blue-600/30',   text: 'text-blue-400',   badge: 'bg-blue-600/20 text-blue-300',   dot: 'bg-blue-500' },
  emerald:{ bg: 'bg-emerald-600/10',border: 'border-emerald-600/30',text: 'text-emerald-400',badge: 'bg-emerald-600/20 text-emerald-300',dot:'bg-emerald-500'},
  amber:  { bg: 'bg-amber-600/10',  border: 'border-amber-600/30',  text: 'text-amber-400',  badge: 'bg-amber-600/20 text-amber-300',  dot: 'bg-amber-500' },
  pink:   { bg: 'bg-pink-600/10',   border: 'border-pink-600/30',   text: 'text-pink-400',   badge: 'bg-pink-600/20 text-pink-300',   dot: 'bg-pink-500' },
  cyan:   { bg: 'bg-cyan-600/10',   border: 'border-cyan-600/30',   text: 'text-cyan-400',   badge: 'bg-cyan-600/20 text-cyan-300',   dot: 'bg-cyan-500' },
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Guia() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<string | null>(null)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-xl">📖</div>
          <div>
            <h1 className="text-2xl font-bold text-white">Guia de Uso — TrafficOS</h1>
            <p className="text-gray-400 text-sm">Aprenda a usar todas as funcionalidades do início ao fim</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { icon: '🎯', label: '15 funcionalidades', sub: 'Cobertas neste guia' },
            { icon: '⚡', label: '6 seções temáticas', sub: 'Do básico ao avançado' },
            { icon: '🚀', label: 'ROI em dias', sub: 'Com o fluxo correto' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div className="text-white font-semibold text-sm">{s.label}</div>
                <div className="text-gray-500 text-xs">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section index */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Ir para seção</div>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map(section => {
            const c = COLOR[section.color]
            return (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(activeSection === section.id ? null : section.id)
                  setTimeout(() => {
                    document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }, 50)
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  activeSection === section.id
                    ? `${c.bg} ${c.border} ${c.text}`
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Workflow diagram */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-8">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Fluxo Recomendado</div>
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { icon: '📦', label: 'Produto' },
            { icon: '🔬', label: 'Diagnóstico' },
            { icon: '📢', label: 'Campanhas' },
            { icon: '🎨', label: 'Criativos' },
            { icon: '📊', label: 'Métricas' },
            { icon: '🤖', label: 'Decisões IA' },
            { icon: '🚀', label: 'Escala' },
            { icon: '📅', label: 'Plano Diário' },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex items-center gap-1">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center text-base">
                  {step.icon}
                </div>
                <div className="text-[10px] text-gray-500 mt-1 text-center">{step.label}</div>
              </div>
              {i < arr.length - 1 && (
                <div className="text-gray-700 text-xs mb-3">→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {SECTIONS.map(section => {
          const c = COLOR[section.color]
          return (
            <div key={section.id} id={`section-${section.id}`}>
              {/* Section header */}
              <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-gray-800`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl ${c.bg} border ${c.border}`}>
                  {section.icon}
                </div>
                <h2 className={`text-lg font-bold ${c.text}`}>{section.title}</h2>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                {section.steps.map(step => (
                  <div
                    key={step.number}
                    className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors"
                  >
                    {/* Step header */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${c.bg} border ${c.border}`}>
                            {step.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-white font-semibold text-base">{step.title}</h3>
                              {step.badge && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${c.badge}`}>
                                  {step.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-gray-400 text-xs mt-0.5">{step.subtitle}</div>
                          </div>
                        </div>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${c.bg} ${c.text} border ${c.border}`}>
                          {step.number}
                        </div>
                      </div>

                      <p className="text-gray-300 text-sm leading-relaxed mb-4">{step.description}</p>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {step.actions.map(action => (
                          <button
                            key={action.label}
                            onClick={() => navigate(action.path)}
                            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                              action.primary
                                ? `bg-violet-600 hover:bg-violet-500 text-white`
                                : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                            }`}
                          >
                            {action.label} →
                          </button>
                        ))}
                      </div>

                      {/* Tips */}
                      <div className={`rounded-lg p-3 ${c.bg} border ${c.border}`}>
                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${c.text}`}>
                          💡 Dicas
                        </div>
                        <ul className="space-y-1">
                          {step.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${c.dot}`} />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer CTA */}
      <div className="mt-10 bg-gradient-to-r from-violet-600/20 to-blue-600/20 border border-violet-600/30 rounded-2xl p-6 text-center">
        <div className="text-2xl mb-2">🚀</div>
        <h3 className="text-white font-bold text-lg mb-1">Pronto para começar?</h3>
        <p className="text-gray-400 text-sm mb-4">Siga o fluxo: Produto → Diagnóstico → Campanha → Criativo → Métricas → Decisão → Escala</p>
        <div className="flex justify-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/produtos/novo')}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Cadastrar Primeiro Produto →
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-700"
          >
            Ir para o Dashboard
          </button>
        </div>
      </div>

      <div className="h-10" />
    </div>
  )
}
