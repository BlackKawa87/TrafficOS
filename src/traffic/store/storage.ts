import type { Product, OfferDiagnosis, Campaign, Creative, Metric, AIDecision, PromptTemplate, AIOfferDiagnosis, AICampaign, AICreative, PerformanceInsight, DailyPlan, LandingPage, ScaleOpportunity, RemarketingStrategy, ExpansaoPlan, EmailSequence, WhatsappFlow, VslScript, MetaCredentials, TikTokCredentials, PlatformSync, LearningPattern, IntelligenceReport, AutoPilotSession, AutoTestSession, AICoreModel, MultiProductSession, FullAutoSession, VideoAIVideo, LandingPublisherPage, CloudOpsState, ComplianceCheck, Relatorio } from '../types'

const SEEDS_KEY = 'tos_seeds_v23'

const DEFAULT_PROMPTS: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Gerador Estratégico de Campanhas',
    category: 'Geração de Campanhas',
    description: 'Cria campanhas completas para produtos cadastrados na TrafficOS, usando dados do produto e diagnóstico de oferta.',
    variables: ['productData', 'offerDiagnosis', 'campaignInputs'],
    template: `Você é um estrategista sênior de tráfego pago, growth marketing, copywriting de resposta direta e validação de ofertas digitais.

Sua função é criar uma campanha completa com base nos dados do produto, objetivo escolhido, canal escolhido, fase da campanha, orçamento e diagnóstico de oferta disponível.

Dados do produto:
{{productData}}

Diagnóstico de oferta:
{{offerDiagnosis}}

Dados escolhidos pelo usuário:
{{campaignInputs}}

Gere uma campanha estratégica com as seguintes seções:

1. Nome estratégico da campanha

2. Objetivo recomendado
Explique se o objetivo escolhido faz sentido ou se deve ser ajustado.

3. Hipótese principal do teste

4. Público recomendado
Inclua público principal, secundário, interesses, exclusões e recomendação entre broad ou segmentado.

5. Ângulo principal da campanha

6. Ângulos secundários

7. Estrutura recomendada da campanha
Defina quantidade de campanhas, conjuntos, criativos, orçamento e otimização.

8. Criativos necessários
Liste formatos, quantidade, duração, estilo e tipo de hook.

9. Copies iniciais
Gere 5 textos principais, 5 headlines, 5 descrições e 5 CTAs.

10. Landing page/check-out
Avalie alinhamento da página com a campanha e sugira melhorias.

11. Métricas de acompanhamento
Defina CTR mínimo, CPC máximo, CPA alvo, taxa de conversão esperada e ROAS esperado.

12. Regras de decisão
Explique quando pausar, manter, duplicar, escalar ou criar variações.

13. Plano dos primeiros 3 dias
Explique o que observar e fazer no dia 1, dia 2 e dia 3.

14. Próximo passo recomendado

Seja direto, prático, crítico e específico. Não gere recomendações genéricas. Use os dados reais do produto e da oferta.`,
  },
  {
    name: 'Gerador de Criativos com IA',
    category: 'Criação de Criativos',
    description: 'Gera criativos completos de alta conversão para tráfego pago, com roteiro, hooks, copies e direção criativa.',
    variables: ['productData', 'campaignData', 'offerDiagnosis', 'creativeInputs'],
    template: `Você é um especialista sênior em criação de criativos para tráfego pago, com foco em Meta Ads, TikTok Ads e YouTube Ads.

Sua função é gerar um briefing criativo completo e pronto para execução, com base nos dados do produto, campanha e configurações escolhidas.

Dados do produto:
{{productData}}

Dados da campanha:
{{campaignData}}

Diagnóstico de oferta:
{{offerDiagnosis}}

Configurações do criativo:
{{creativeInputs}}

Gere o briefing criativo completo com as seguintes seções:

1. Nome do Criativo

2. Ideia Central
Resumo do conceito em 2-3 frases.

3. Hook (primeiros 3 segundos)
Gere 3 variações: Pergunta, Alerta e Curiosidade.

4. Roteiro Completo
Estrutura: Hook → Problema → Agitação → Solução → CTA
Tempo: 15 a 30 segundos.

5. Variações de Roteiro
Gere 3 variações do mesmo conceito com abordagens diferentes.

6. Texto do Anúncio
Gere 3 textos principais, 3 headlines, 3 descrições e 3 CTAs.

7. Direção Criativa
Explique: como gravar, cenário, tipo de pessoa, estilo, tom de voz e edição.

8. Referência Visual
Descreva como o criativo deve parecer visualmente.

9. Variações de Teste
Gere ideias de: troca de hook, CTA, abordagem e público.

10. Hipótese do Criativo
Por que este criativo deve performar bem.

11. Métricas Esperadas
CTR, CPC e CPA esperados.

12. Recomendações
Quando usar, quando pausar e quando escalar este criativo.

Seja direto, prático e específico. Use os dados reais do produto. Gere roteiros e copies prontos para execução.`,
  },
  {
    name: 'Gerador de Decisões Estratégicas',
    category: 'Decisões e Otimização',
    description: 'Analisa os dados de produto, campanhas, criativos e métricas para gerar decisões estratégicas prioritizadas com ações claras.',
    variables: ['productData', 'campaignData', 'creativeData', 'metricsData'],
    template: `Você é um estrategista sênior de tráfego pago e growth marketing.

Sua função é analisar os dados fornecidos e gerar decisões estratégicas claras e prioritizadas para otimizar os resultados.

Dados do produto:
{{productData}}

Dados das campanhas:
{{campaignData}}

Dados dos criativos:
{{creativeData}}

Métricas:
{{metricsData}}

Com base nos dados acima, gere de 3 a 6 decisões estratégicas priorizadas.

Para cada decisão, informe:

1. Tipo de decisão
   - pausar: algo que está custando sem retorno
   - escalar: algo que está performando bem
   - manter: algo com resultados aceitáveis que deve ser monitorado
   - melhorar: algo com potencial que precisa de ajuste

2. Raciocínio
   Explique claramente por que esta decisão é necessária, com base nos dados.
   Se os dados forem insuficientes, indique esse risco.

3. Ações práticas
   Liste 2 a 4 ações específicas e executáveis.

4. Prioridade
   - Alta: ação urgente nas próximas 24h
   - Média: ação nos próximos 3 dias
   - Baixa: ação na próxima semana

Seja crítico, direto e orientado para ROI.

Diferencie problemas de:
- Criativo (hook, copy, roteiro)
- Oferta (promessa, preço, garantia)
- Página (landing, checkout)
- Público (segmentação, exclusões)
- Tracking (dados incompletos, atribuição)`,
  },
  {
    name: 'Analisador de Performance de Criativos',
    category: 'Análise de Performance',
    description: 'Analisa métricas de criativos, campanhas e produtos para identificar padrões vencedores e sugerir ações práticas.',
    variables: ['productData', 'campaignData', 'creativeData', 'metricsData'],
    template: `Você é um analista sênior de tráfego pago, growth marketing e otimização de criativos.

Sua função é analisar os dados de performance informados e transformar números em decisões práticas.

Dados do produto:
{{productData}}

Dados da campanha:
{{campaignData}}

Dados dos criativos:
{{creativeData}}

Métricas:
{{metricsData}}

Analise:

1. O que está funcionando
2. O que está falhando
3. Quais hooks performam melhor
4. Quais ângulos geram mais resultado
5. Quais canais parecem mais promissores
6. Quais criativos devem ser pausados
7. Quais criativos devem ser mantidos
8. Quais criativos devem ser duplicados
9. Quais criativos devem virar novas variações
10. Quais produtos parecem ter maior potencial
11. Quais próximos testes devem ser feitos
12. Quais riscos existem nos dados atuais

Crie também um plano prático com:

- Ações imediatas
- Ações para as próximas 24 horas
- Ações para os próximos 3 dias
- Ações de escala
- Ações de correção

Seja crítico, direto e orientado para lucro.

Não tome decisões com pouca amostra sem alertar sobre o risco.

Sempre diferencie:
- Problema de criativo
- Problema de oferta
- Problema de página
- Problema de público
- Problema de tracking`,
  },
  {
    name: 'Gerador de Landing Page Executável',
    category: 'Landing Page e Conversão',
    description: 'Gera landing page completa com wireframe por blocos, copy posicionada, direção de design, paleta de cores e versão mobile.',
    variables: ['productData', 'offerDiagnosis'],
    template: `Você é um especialista em design de landing pages de alta conversão, copywriting de resposta direta e UX para tráfego pago.

Sua função é gerar uma landing page COMPLETA e EXECUTÁVEL — wireframe, layout, copy posicionada e direção de design.

Produto:
{{productData}}

Diagnóstico de oferta:
{{offerDiagnosis}}

Gere:

1. WIREFRAME POR BLOCOS
Para cada bloco (Hero, Problema, Solução, Benefícios, Prova, Oferta, CTA Final):
- Posição dos elementos
- Tamanho relativo
- Espaçamento
- Hierarquia visual

2. COPY JÁ POSICIONADA
Headline, subheadline, corpo, lista de itens, CTA — tudo dentro de cada bloco.

3. DIREÇÃO DE DESIGN
- Paleta de cores (hex codes)
- Tipografia
- Estilo visual
- Estilo de botão
- Estilo de imagens

4. VERSÃO MOBILE
O que muda, ordem das seções, ajustes de tamanho.

5. NOTAS DE CONVERSÃO
Recomendações estratégicas para aumentar conversão.

Seja específico. Nada genérico. Use os dados reais do produto.`,
  },
  {
    name: 'Plano Diário de Execução',
    category: 'Planejamento e Execução',
    description: 'Transforma dados, campanhas, criativos e decisões em tarefas práticas organizadas por prioridade para execução diária.',
    variables: ['productData', 'offerDiagnosis', 'campaignData', 'creativeData', 'metricsData', 'decisionData'],
    template: `Você é um gestor de tráfego e estrategista de crescimento orientado a execução.

Sua função é transformar dados e decisões em um plano de ação claro, objetivo e executável.

Dados do produto:
{{productData}}

Diagnóstico de oferta:
{{offerDiagnosis}}

Campanhas:
{{campaignData}}

Criativos:
{{creativeData}}

Métricas:
{{metricsData}}

Decisões IA pendentes:
{{decisionData}}

Gere:

1. Resumo do cenário atual (o que está acontecendo, o que funciona, o que falha)

2. Prioridade principal do dia
Defina o foco e o motivo estratégico.

3. Lista de tarefas imediatas (hoje)
Para cada tarefa: descrição específica, prioridade, tempo estimado e impacto esperado.

4. Tarefas para próximas 24h

5. Tarefas para próximos 3 dias

6. Ações de escala (se houver sinais positivos)

7. Ações de correção (se houver problemas)

8. Alertas importantes

9. Próximo passo estratégico

Regras:
- Máximo 15 tarefas
- Priorize impacto sobre volume
- Evite tarefas genéricas — use os dados reais
- Se dados forem insuficientes, avisar claramente
- Diferenciar problema de criativo, oferta, página e público`,
  },
  {
    name: 'Motor de Decisão Estratégica de Tráfego',
    category: 'Decisões e Otimização',
    description: 'Analisa produto, campanhas, criativos e métricas com regras estratégicas avançadas para gerar decisões priorizadas com risco, confiança e prazo.',
    variables: ['productData', 'offerDiagnosis', 'campaignData', 'creativeData', 'metricsData'],
    template: `Você é um gestor sênior de tráfego pago, growth strategist e analista de performance.

Sua função é analisar dados de produtos, ofertas, campanhas, criativos e métricas para gerar decisões práticas, críticas e acionáveis.

Dados do produto:
{{productData}}

Diagnóstico de oferta:
{{offerDiagnosis}}

Campanhas ativas:
{{campaignData}}

Criativos em teste:
{{creativeData}}

Métricas de performance:
{{metricsData}}

TIPOS DE DECISÃO DISPONÍVEIS:
- pausar_criativo: CTR baixo, ROAS negativo, alto gasto sem retorno
- manter_criativo: CPA dentro da meta mas volume baixo, aguardar dados
- escalar_criativo: CPA bom, ROAS positivo, potencial claro de escala
- duplicar_campanha: Campanha com resultados positivos para replicar
- criar_variacao: Criativo com bom CTR que pode melhorar conversão
- trocar_hook: Hook fraco (CTR baixo), bom produto
- trocar_publico: CTR bom mas conversão baixa, público errado
- revisar_oferta: Muitos cliques, poucas vendas, problema na promessa
- revisar_pagina: CTR alto, baixa conversão, problema na página
- criar_remarketing: Muito tráfego, poucos compradores, oportunidade de retargeting
- aumentar_orcamento: Resultados sólidos, escalar budget
- reduzir_orcamento: CPA alto, ROAS negativo, reduzir exposição
- encerrar_campanha: Campanha sem resultados após período de teste adequado
- coletar_dados: Poucos dados, aguardar antes de decidir

REGRAS DE ANÁLISE:
- CTR < 1% + CPC alto → trocar_hook ou pausar_criativo
- CTR > 2% + conversão < 1% → revisar_pagina ou revisar_oferta
- Gasto > $50 + zero venda → pausar_criativo (critical)
- CPA bom + ROAS ≥ 2x → escalar_criativo ou aumentar_orcamento
- CPA aceitável + volume baixo → manter_criativo
- Amostra < 1000 impressões → coletar_dados (alerte que amostra é pequena)

ALERTAS OBRIGATÓRIOS:
- Se amostra < 1000 impressões ou < $20 gasto: alerte no reasoning
- Sempre diferencie: problema de criativo, oferta, página, público ou tracking
- Não force conclusões onde os dados são fracos — seja honesto sobre incerteza

LIMITE: Máximo 6 decisões mais relevantes, priorizadas por impacto no ROI.

Para cada decisão, gere:
1. Título curto e descritivo
2. Tipo de decisão (da lista acima)
3. Prioridade: critical | high | medium | low
4. Justificativa baseada nos dados reais
5. Métricas que justificam (CTR X%, ROAS Xx, gasto $X, etc)
6. Nível de confiança: baixo | medio | alto
7. Risco de tomar ou não tomar esta decisão
8. Ação recomendada imediata e específica
9. Próximo passo após executar a ação
10. Prazo: Agora | Hoje | Próximas 24h | Próximos 3 dias | Próxima semana
11. Lista de 2-3 ações executáveis

Seja crítico, direto e orientado para ROI. Não gere recomendações genéricas.`,
  },
  {
    name: 'Motor de Escala e Otimização',
    category: 'Escala e Otimização',
    description: 'Analisa campanhas, criativos e métricas para gerar oportunidades priorizadas de escala, duplicação, otimização e expansão com critérios de risco e limite de ação.',
    variables: ['productData', 'campaignData', 'creativeData', 'metricsData'],
    template: `Você é um especialista em escala de tráfego pago e otimização de ROI.

Sua função é analisar os dados fornecidos e gerar oportunidades de escala e otimização priorizadas por impacto.

Dados do produto:
{{productData}}

Campanhas e criativos:
{{campaignData}}

Criativos:
{{creativeData}}

Métricas:
{{metricsData}}

Para cada oportunidade, gere:
1. Título da ação
2. Tipo: escalar_orcamento | duplicar_campanha | duplicar_conjunto | criar_variacao_criativo | expandir_publico | criar_remarketing | replicar_canal | ajustar_oferta | pausar_campanha | continuar_teste
3. Prioridade: baixa | media | alta | critica
4. Motivo (baseado nos dados reais)
5. Dados que justificam (métricas exatas)
6. Potencial de ganho: baixo | medio | alto
7. Nível de risco: baixo | medio | alto
8. Confiança: baixo | medio | alto
9. Ação recomendada (passo a passo)
10. Limite da ação (seguro)
11. Próximo passo

Regras obrigatórias:
- CPA abaixo da meta + volume → escalar_orcamento
- CTR > 2% + conversão boa → duplicar campanha
- CTR alto + conversão baixa → ajustar oferta
- Criativo com ROAS ≥ 2x → criar variação
- Sem dados suficientes → continuar_teste
- Pausar: gasto alto + zero resultado`,
  },
  {
    name: 'Gerador de Criativos de Alta Conversão',
    category: 'Criação de Criativos',
    description: 'Gera criativos completos para campanhas de tráfego pago com base em produto, campanha e diagnóstico de oferta.',
    variables: ['productData', 'campaignData', 'offerDiagnosis', 'creativeInputs'],
    template: `Você é um especialista em copywriting, tráfego pago e criação de criativos de alta performance.

Seu objetivo é criar criativos que gerem cliques, engajamento e conversão.

Dados do produto:
{{productData}}

Dados da campanha:
{{campaignData}}

Diagnóstico de oferta:
{{offerDiagnosis}}

Configurações do criativo:
{{creativeInputs}}

Gere:

1. Nome do criativo
2. Ideia central
3. 3 hooks diferentes
4. Roteiro completo (15–30 segundos)
5. 3 variações do roteiro
6. 3 textos principais
7. 3 headlines
8. 3 descrições
9. 3 CTAs
10. Direção criativa detalhada
11. Referência visual (descrição)
12. Variações de teste
13. Hipótese do criativo
14. Métricas esperadas
15. Recomendações de uso

Seja direto, prático e orientado para conversão.

Evite textos genéricos.

Crie criativos que chamem atenção rapidamente e gerem curiosidade.`,
  },
]

function seedDefaultPrompts() {
  try {
    const seeded = localStorage.getItem(SEEDS_KEY)
    if (seeded) return
    const existing = JSON.parse(localStorage.getItem('tos_prompts') ?? '[]') as PromptTemplate[]
    const ts = new Date().toISOString()
    const toAdd: PromptTemplate[] = DEFAULT_PROMPTS
      .filter(dp => !existing.some(e => e.name === dp.name))
      .map((dp, i) => ({
        ...dp,
        id: `seed_${i}_${Date.now().toString(36)}`,
        created_at: ts,
        updated_at: ts,
      }))
    if (toAdd.length > 0) {
      localStorage.setItem('tos_prompts', JSON.stringify([...existing, ...toAdd]))
    }
    localStorage.setItem(SEEDS_KEY, '1')
  } catch {
    // silently fail — seeds are non-critical
  }
}

seedDefaultPrompts()

const KEYS = {
  products: 'tos_products',
  diagnoses: 'tos_diagnoses',
  aiDiagnoses: 'tos_ai_diagnoses',
  aiCampaigns: 'tos_ai_campaigns',
  aiCreatives: 'tos_ai_creatives',
  insights: 'tos_insights',
  campaigns: 'tos_campaigns',
  creatives: 'tos_creatives',
  metrics: 'tos_metrics',
  decisions: 'tos_decisions',
  dailyPlans: 'tos_daily_plans',
  landingPages: 'tos_landing_pages',
  scaleOpportunities: 'tos_scale_opportunities',
  remarketingStrategies: 'tos_remarketing_strategies',
  expansaoPlans: 'tos_expansao_plans',
  emailSequences: 'tos_email_sequences',
  whatsappFlows: 'tos_whatsapp_flows',
  vslScripts: 'tos_vsl_scripts',
  learningPatterns: 'tos_learning_patterns',
  intelligenceReports: 'tos_intelligence_reports',
  autoPilotSessions: 'tos_autopilot_sessions',
  autoTestSessions: 'tos_autotest_sessions',
  multiProductSessions: 'tos_multi_product_sessions',
  fullAutoSessions: 'tos_full_auto_sessions',
  videoAiVideos: 'tos_video_ai_videos',
  landingPublisherPages: 'tos_landing_publisher_pages',
  complianceChecks: 'tos_compliance_checks',
  relatorios: 'tos_relatorios',
  prompts: 'tos_prompts',
  // aiCoreModel stored separately (not in KEYS — single object, not array)
}

function getAll<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[]
  } catch {
    return []
  }
}

function saveAll<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items))
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

export function now(): string {
  return new Date().toISOString()
}

export const tosDb = {
  products: {
    getAll: (): Product[] => getAll<Product>(KEYS.products),
    getById: (id: string): Product | null =>
      getAll<Product>(KEYS.products).find(p => p.id === id) ?? null,
    save: (product: Product): void => {
      const all = getAll<Product>(KEYS.products)
      const idx = all.findIndex(p => p.id === product.id)
      if (idx >= 0) all[idx] = product
      else all.push(product)
      saveAll(KEYS.products, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.products, getAll<Product>(KEYS.products).filter(p => p.id !== id)),
  },

  diagnoses: {
    getAll: (): OfferDiagnosis[] => getAll<OfferDiagnosis>(KEYS.diagnoses),
    getByProduct: (productId: string): OfferDiagnosis[] =>
      getAll<OfferDiagnosis>(KEYS.diagnoses)
        .filter(d => d.product_id === productId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    save: (d: OfferDiagnosis): void => {
      const all = getAll<OfferDiagnosis>(KEYS.diagnoses)
      const idx = all.findIndex(x => x.id === d.id)
      if (idx >= 0) all[idx] = d
      else all.push(d)
      saveAll(KEYS.diagnoses, all)
    },
  },

  campaigns: {
    getAll: (): Campaign[] => getAll<Campaign>(KEYS.campaigns),
    getByProduct: (productId: string): Campaign[] =>
      getAll<Campaign>(KEYS.campaigns).filter(c => c.product_id === productId),
    getById: (id: string): Campaign | null =>
      getAll<Campaign>(KEYS.campaigns).find(c => c.id === id) ?? null,
    save: (c: Campaign): void => {
      const all = getAll<Campaign>(KEYS.campaigns)
      const idx = all.findIndex(x => x.id === c.id)
      if (idx >= 0) all[idx] = c
      else all.push(c)
      saveAll(KEYS.campaigns, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.campaigns, getAll<Campaign>(KEYS.campaigns).filter(c => c.id !== id)),
  },

  creatives: {
    getAll: (): Creative[] => getAll<Creative>(KEYS.creatives),
    getByProduct: (productId: string): Creative[] =>
      getAll<Creative>(KEYS.creatives).filter(c => c.product_id === productId),
    save: (c: Creative): void => {
      const all = getAll<Creative>(KEYS.creatives)
      const idx = all.findIndex(x => x.id === c.id)
      if (idx >= 0) all[idx] = c
      else all.push(c)
      saveAll(KEYS.creatives, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.creatives, getAll<Creative>(KEYS.creatives).filter(c => c.id !== id)),
  },

  metrics: {
    getAll: (): Metric[] => getAll<Metric>(KEYS.metrics),
    getByProduct: (productId: string): Metric[] =>
      getAll<Metric>(KEYS.metrics).filter(m => m.product_id === productId),
    getByCreative: (creativeId: string): Metric[] =>
      getAll<Metric>(KEYS.metrics).filter(m => m.creative_id === creativeId),
    save: (m: Metric): void => {
      const all = getAll<Metric>(KEYS.metrics)
      const idx = all.findIndex(x => x.id === m.id)
      if (idx >= 0) all[idx] = m
      else all.push(m)
      saveAll(KEYS.metrics, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.metrics, getAll<Metric>(KEYS.metrics).filter(m => m.id !== id)),
  },

  decisions: {
    getAll: (): AIDecision[] => getAll<AIDecision>(KEYS.decisions),
    getByProduct: (productId: string): AIDecision[] =>
      getAll<AIDecision>(KEYS.decisions).filter(d => d.product_id === productId),
    save: (d: AIDecision): void => {
      const all = getAll<AIDecision>(KEYS.decisions)
      const idx = all.findIndex(x => x.id === d.id)
      if (idx >= 0) all[idx] = d
      else all.push(d)
      saveAll(KEYS.decisions, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.decisions, getAll<AIDecision>(KEYS.decisions).filter(d => d.id !== id)),
  },

  prompts: {
    getAll: (): PromptTemplate[] => getAll<PromptTemplate>(KEYS.prompts),
    getById: (id: string): PromptTemplate | null =>
      getAll<PromptTemplate>(KEYS.prompts).find(p => p.id === id) ?? null,
    save: (p: PromptTemplate): void => {
      const all = getAll<PromptTemplate>(KEYS.prompts)
      const idx = all.findIndex(x => x.id === p.id)
      if (idx >= 0) all[idx] = p
      else all.push(p)
      saveAll(KEYS.prompts, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.prompts, getAll<PromptTemplate>(KEYS.prompts).filter(p => p.id !== id)),
  },

  aiDiagnoses: {
    getAll: (): AIOfferDiagnosis[] => getAll<AIOfferDiagnosis>(KEYS.aiDiagnoses),
    getByProduct: (productId: string): AIOfferDiagnosis[] =>
      getAll<AIOfferDiagnosis>(KEYS.aiDiagnoses)
        .filter(d => d.product_id === productId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    getLatestByProduct: (productId: string): AIOfferDiagnosis | null => {
      const all = getAll<AIOfferDiagnosis>(KEYS.aiDiagnoses)
        .filter(d => d.product_id === productId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
      return all[0] ?? null
    },
    save: (d: AIOfferDiagnosis): void => {
      const all = getAll<AIOfferDiagnosis>(KEYS.aiDiagnoses)
      const idx = all.findIndex(x => x.id === d.id)
      if (idx >= 0) all[idx] = d
      else all.push(d)
      saveAll(KEYS.aiDiagnoses, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.aiDiagnoses, getAll<AIOfferDiagnosis>(KEYS.aiDiagnoses).filter(d => d.id !== id)),
  },

  insights: {
    getAll: (): PerformanceInsight[] => getAll<PerformanceInsight>(KEYS.insights),
    getLatest: (): PerformanceInsight | null => {
      const all = getAll<PerformanceInsight>(KEYS.insights).sort((a, b) => b.generated_at.localeCompare(a.generated_at))
      return all[0] ?? null
    },
    save: (i: PerformanceInsight): void => {
      const all = getAll<PerformanceInsight>(KEYS.insights)
      const idx = all.findIndex(x => x.id === i.id)
      if (idx >= 0) all[idx] = i
      else all.push(i)
      saveAll(KEYS.insights, all)
    },
    clear: (): void => saveAll(KEYS.insights, []),
  },

  aiCreatives: {
    getAll: (): AICreative[] => getAll<AICreative>(KEYS.aiCreatives),
    getByProduct: (productId: string): AICreative[] =>
      getAll<AICreative>(KEYS.aiCreatives).filter(c => c.product_id === productId),
    getByCampaign: (campaignId: string): AICreative[] =>
      getAll<AICreative>(KEYS.aiCreatives).filter(c => c.campaign_id === campaignId),
    getById: (id: string): AICreative | null =>
      getAll<AICreative>(KEYS.aiCreatives).find(c => c.id === id) ?? null,
    save: (c: AICreative): void => {
      const all = getAll<AICreative>(KEYS.aiCreatives)
      const idx = all.findIndex(x => x.id === c.id)
      if (idx >= 0) all[idx] = c
      else all.push(c)
      saveAll(KEYS.aiCreatives, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.aiCreatives, getAll<AICreative>(KEYS.aiCreatives).filter(c => c.id !== id)),
  },

  aiCampaigns: {
    getAll: (): AICampaign[] => getAll<AICampaign>(KEYS.aiCampaigns),
    getByProduct: (productId: string): AICampaign[] =>
      getAll<AICampaign>(KEYS.aiCampaigns).filter(c => c.product_id === productId),
    getById: (id: string): AICampaign | null =>
      getAll<AICampaign>(KEYS.aiCampaigns).find(c => c.id === id) ?? null,
    save: (c: AICampaign): void => {
      const all = getAll<AICampaign>(KEYS.aiCampaigns)
      const idx = all.findIndex(x => x.id === c.id)
      if (idx >= 0) all[idx] = c
      else all.push(c)
      saveAll(KEYS.aiCampaigns, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.aiCampaigns, getAll<AICampaign>(KEYS.aiCampaigns).filter(c => c.id !== id)),
  },

  landingPages: {
    getAll: (): LandingPage[] => getAll<LandingPage>(KEYS.landingPages),
    getByProduct: (productId: string): LandingPage[] =>
      getAll<LandingPage>(KEYS.landingPages).filter(lp => lp.product_id === productId),
    getById: (id: string): LandingPage | null =>
      getAll<LandingPage>(KEYS.landingPages).find(lp => lp.id === id) ?? null,
    save: (lp: LandingPage): void => {
      const all = getAll<LandingPage>(KEYS.landingPages)
      const idx = all.findIndex(x => x.id === lp.id)
      if (idx >= 0) all[idx] = lp
      else all.push(lp)
      saveAll(KEYS.landingPages, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.landingPages, getAll<LandingPage>(KEYS.landingPages).filter(lp => lp.id !== id)),
  },

  dailyPlans: {
    getAll: (): DailyPlan[] => getAll<DailyPlan>(KEYS.dailyPlans),
    getByProduct: (productId: string): DailyPlan[] =>
      getAll<DailyPlan>(KEYS.dailyPlans).filter(p => p.product_id === productId),
    getById: (id: string): DailyPlan | null =>
      getAll<DailyPlan>(KEYS.dailyPlans).find(p => p.id === id) ?? null,
    getByDate: (date: string): DailyPlan[] =>
      getAll<DailyPlan>(KEYS.dailyPlans).filter(p => p.date === date),
    save: (p: DailyPlan): void => {
      const all = getAll<DailyPlan>(KEYS.dailyPlans)
      const idx = all.findIndex(x => x.id === p.id)
      if (idx >= 0) all[idx] = p
      else all.push(p)
      saveAll(KEYS.dailyPlans, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.dailyPlans, getAll<DailyPlan>(KEYS.dailyPlans).filter(p => p.id !== id)),
  },

  scaleOpportunities: {
    getAll: (): ScaleOpportunity[] => getAll<ScaleOpportunity>(KEYS.scaleOpportunities),
    getByProduct: (productId: string): ScaleOpportunity[] =>
      getAll<ScaleOpportunity>(KEYS.scaleOpportunities).filter(o => o.product_id === productId),
    getById: (id: string): ScaleOpportunity | null =>
      getAll<ScaleOpportunity>(KEYS.scaleOpportunities).find(o => o.id === id) ?? null,
    save: (o: ScaleOpportunity): void => {
      const all = getAll<ScaleOpportunity>(KEYS.scaleOpportunities)
      const idx = all.findIndex(x => x.id === o.id)
      if (idx >= 0) all[idx] = o
      else all.push(o)
      saveAll(KEYS.scaleOpportunities, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.scaleOpportunities, getAll<ScaleOpportunity>(KEYS.scaleOpportunities).filter(o => o.id !== id)),
  },

  whatsappFlows: {
    getAll: (): WhatsappFlow[] => getAll<WhatsappFlow>(KEYS.whatsappFlows),
    getByProduct: (productId: string): WhatsappFlow[] =>
      getAll<WhatsappFlow>(KEYS.whatsappFlows).filter(f => f.product_id === productId),
    getById: (id: string): WhatsappFlow | null =>
      getAll<WhatsappFlow>(KEYS.whatsappFlows).find(f => f.id === id) ?? null,
    save: (f: WhatsappFlow): void => {
      const all = getAll<WhatsappFlow>(KEYS.whatsappFlows)
      const idx = all.findIndex(x => x.id === f.id)
      if (idx >= 0) all[idx] = f
      else all.push(f)
      saveAll(KEYS.whatsappFlows, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.whatsappFlows, getAll<WhatsappFlow>(KEYS.whatsappFlows).filter(f => f.id !== id)),
  },

  emailSequences: {
    getAll: (): EmailSequence[] => getAll<EmailSequence>(KEYS.emailSequences),
    getByProduct: (productId: string): EmailSequence[] =>
      getAll<EmailSequence>(KEYS.emailSequences).filter(s => s.product_id === productId),
    getById: (id: string): EmailSequence | null =>
      getAll<EmailSequence>(KEYS.emailSequences).find(s => s.id === id) ?? null,
    save: (s: EmailSequence): void => {
      const all = getAll<EmailSequence>(KEYS.emailSequences)
      const idx = all.findIndex(x => x.id === s.id)
      if (idx >= 0) all[idx] = s
      else all.push(s)
      saveAll(KEYS.emailSequences, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.emailSequences, getAll<EmailSequence>(KEYS.emailSequences).filter(s => s.id !== id)),
  },

  expansaoPlans: {
    getAll: (): ExpansaoPlan[] => getAll<ExpansaoPlan>(KEYS.expansaoPlans),
    getByProduct: (productId: string): ExpansaoPlan[] =>
      getAll<ExpansaoPlan>(KEYS.expansaoPlans).filter(p => p.product_id === productId),
    getById: (id: string): ExpansaoPlan | null =>
      getAll<ExpansaoPlan>(KEYS.expansaoPlans).find(p => p.id === id) ?? null,
    save: (p: ExpansaoPlan): void => {
      const all = getAll<ExpansaoPlan>(KEYS.expansaoPlans)
      const idx = all.findIndex(x => x.id === p.id)
      if (idx >= 0) all[idx] = p
      else all.push(p)
      saveAll(KEYS.expansaoPlans, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.expansaoPlans, getAll<ExpansaoPlan>(KEYS.expansaoPlans).filter(p => p.id !== id)),
  },

  vslScripts: {
    getAll: (): VslScript[] => getAll<VslScript>(KEYS.vslScripts),
    getByProduct: (productId: string): VslScript[] =>
      getAll<VslScript>(KEYS.vslScripts).filter(v => v.product_id === productId),
    getById: (id: string): VslScript | null =>
      getAll<VslScript>(KEYS.vslScripts).find(v => v.id === id) ?? null,
    save: (v: VslScript): void => {
      const all = getAll<VslScript>(KEYS.vslScripts)
      const idx = all.findIndex(x => x.id === v.id)
      if (idx >= 0) all[idx] = v
      else all.push(v)
      saveAll(KEYS.vslScripts, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.vslScripts, getAll<VslScript>(KEYS.vslScripts).filter(v => v.id !== id)),
  },

  remarketingStrategies: {
    getAll: (): RemarketingStrategy[] => getAll<RemarketingStrategy>(KEYS.remarketingStrategies),
    getByProduct: (productId: string): RemarketingStrategy[] =>
      getAll<RemarketingStrategy>(KEYS.remarketingStrategies).filter(s => s.product_id === productId),
    getById: (id: string): RemarketingStrategy | null =>
      getAll<RemarketingStrategy>(KEYS.remarketingStrategies).find(s => s.id === id) ?? null,
    save: (s: RemarketingStrategy): void => {
      const all = getAll<RemarketingStrategy>(KEYS.remarketingStrategies)
      const idx = all.findIndex(x => x.id === s.id)
      if (idx >= 0) all[idx] = s
      else all.push(s)
      saveAll(KEYS.remarketingStrategies, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.remarketingStrategies, getAll<RemarketingStrategy>(KEYS.remarketingStrategies).filter(s => s.id !== id)),
  },

  learningPatterns: {
    getAll: (): LearningPattern[] =>
      getAll<LearningPattern>(KEYS.learningPatterns)
        .sort((a, b) => b.performance_score - a.performance_score),
    getByType: (tipo: string): LearningPattern[] =>
      getAll<LearningPattern>(KEYS.learningPatterns).filter(p => p.tipo === tipo),
    getByProduct: (productId: string): LearningPattern[] =>
      getAll<LearningPattern>(KEYS.learningPatterns).filter(p => p.product_id === productId),
    getById: (id: string): LearningPattern | null =>
      getAll<LearningPattern>(KEYS.learningPatterns).find(p => p.id === id) ?? null,
    save: (p: LearningPattern): void => {
      const all = getAll<LearningPattern>(KEYS.learningPatterns)
      const idx = all.findIndex(x => x.id === p.id)
      if (idx >= 0) all[idx] = p
      else all.push(p)
      saveAll(KEYS.learningPatterns, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.learningPatterns, getAll<LearningPattern>(KEYS.learningPatterns).filter(p => p.id !== id)),
  },

  intelligenceReports: {
    getAll: (): IntelligenceReport[] =>
      getAll<IntelligenceReport>(KEYS.intelligenceReports)
        .sort((a, b) => b.generated_at.localeCompare(a.generated_at)),
    getLatest: (): IntelligenceReport | null => {
      const all = getAll<IntelligenceReport>(KEYS.intelligenceReports)
        .sort((a, b) => b.generated_at.localeCompare(a.generated_at))
      return all[0] ?? null
    },
    getById: (id: string): IntelligenceReport | null =>
      getAll<IntelligenceReport>(KEYS.intelligenceReports).find(r => r.id === id) ?? null,
    save: (r: IntelligenceReport): void => {
      const all = getAll<IntelligenceReport>(KEYS.intelligenceReports)
      const idx = all.findIndex(x => x.id === r.id)
      if (idx >= 0) all[idx] = r
      else all.push(r)
      saveAll(KEYS.intelligenceReports, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.intelligenceReports, getAll<IntelligenceReport>(KEYS.intelligenceReports).filter(r => r.id !== id)),
  },

  relatorios: {
    getAll: (): Relatorio[] =>
      getAll<Relatorio>(KEYS.relatorios)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    getById: (id: string): Relatorio | null =>
      getAll<Relatorio>(KEYS.relatorios).find(r => r.id === id) ?? null,
    save: (r: Relatorio): void => {
      const all = getAll<Relatorio>(KEYS.relatorios)
      const idx = all.findIndex(x => x.id === r.id)
      if (idx >= 0) all[idx] = r
      else all.push(r)
      saveAll(KEYS.relatorios, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.relatorios, getAll<Relatorio>(KEYS.relatorios).filter(r => r.id !== id)),
  },

  complianceChecks: {
    getAll: (): ComplianceCheck[] =>
      getAll<ComplianceCheck>(KEYS.complianceChecks)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    getById: (id: string): ComplianceCheck | null =>
      getAll<ComplianceCheck>(KEYS.complianceChecks).find(c => c.id === id) ?? null,
    getByProduct: (productId: string): ComplianceCheck[] =>
      getAll<ComplianceCheck>(KEYS.complianceChecks).filter(c => c.product_id === productId),
    save: (c: ComplianceCheck): void => {
      const all = getAll<ComplianceCheck>(KEYS.complianceChecks)
      const idx = all.findIndex(x => x.id === c.id)
      if (idx >= 0) all[idx] = c
      else all.push(c)
      saveAll(KEYS.complianceChecks, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.complianceChecks, getAll<ComplianceCheck>(KEYS.complianceChecks).filter(c => c.id !== id)),
  },

  cloudOps: {
    get: (): CloudOpsState | null => {
      try { return JSON.parse(localStorage.getItem('tos_cloud_ops') ?? 'null') } catch { return null }
    },
    save: (s: CloudOpsState): void => localStorage.setItem('tos_cloud_ops', JSON.stringify(s)),
    clear: (): void => localStorage.removeItem('tos_cloud_ops'),
  },

  aiCoreModel: {
    get: (): AICoreModel | null => {
      try { return JSON.parse(localStorage.getItem('tos_ai_core_model') ?? 'null') } catch { return null }
    },
    save: (m: AICoreModel): void => localStorage.setItem('tos_ai_core_model', JSON.stringify(m)),
    clear: (): void => localStorage.removeItem('tos_ai_core_model'),
  },

  autoTestSessions: {
    getAll: (): AutoTestSession[] =>
      getAll<AutoTestSession>(KEYS.autoTestSessions)
        .sort((a, b) => b.started_at.localeCompare(a.started_at)),
    getActive: (): AutoTestSession | null => {
      const all = getAll<AutoTestSession>(KEYS.autoTestSessions)
      return all.find(s => s.status === 'ativo' || s.status === 'pausado') ?? null
    },
    getById: (id: string): AutoTestSession | null =>
      getAll<AutoTestSession>(KEYS.autoTestSessions).find(s => s.id === id) ?? null,
    save: (s: AutoTestSession): void => {
      const all = getAll<AutoTestSession>(KEYS.autoTestSessions)
      const idx = all.findIndex(x => x.id === s.id)
      if (idx >= 0) all[idx] = s
      else all.push(s)
      saveAll(KEYS.autoTestSessions, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.autoTestSessions, getAll<AutoTestSession>(KEYS.autoTestSessions).filter(s => s.id !== id)),
  },

  autoPilotSessions: {
    getAll: (): AutoPilotSession[] =>
      getAll<AutoPilotSession>(KEYS.autoPilotSessions)
        .sort((a, b) => b.started_at.localeCompare(a.started_at)),
    getActive: (): AutoPilotSession | null => {
      const all = getAll<AutoPilotSession>(KEYS.autoPilotSessions)
      return all.find(s => s.status === 'running' || s.status === 'paused') ?? null
    },
    getById: (id: string): AutoPilotSession | null =>
      getAll<AutoPilotSession>(KEYS.autoPilotSessions).find(s => s.id === id) ?? null,
    save: (s: AutoPilotSession): void => {
      const all = getAll<AutoPilotSession>(KEYS.autoPilotSessions)
      const idx = all.findIndex(x => x.id === s.id)
      if (idx >= 0) all[idx] = s
      else all.push(s)
      saveAll(KEYS.autoPilotSessions, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.autoPilotSessions, getAll<AutoPilotSession>(KEYS.autoPilotSessions).filter(s => s.id !== id)),
  },

  multiProductSessions: {
    getAll: (): MultiProductSession[] =>
      getAll<MultiProductSession>(KEYS.multiProductSessions)
        .sort((a, b) => b.started_at.localeCompare(a.started_at)),
    getActive: (): MultiProductSession | null => {
      const all = getAll<MultiProductSession>(KEYS.multiProductSessions)
      return all.find(s => s.status === 'running' || s.status === 'paused') ?? null
    },
    getById: (id: string): MultiProductSession | null =>
      getAll<MultiProductSession>(KEYS.multiProductSessions).find(s => s.id === id) ?? null,
    save: (s: MultiProductSession): void => {
      const all = getAll<MultiProductSession>(KEYS.multiProductSessions)
      const idx = all.findIndex(x => x.id === s.id)
      if (idx >= 0) all[idx] = s
      else all.push(s)
      saveAll(KEYS.multiProductSessions, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.multiProductSessions, getAll<MultiProductSession>(KEYS.multiProductSessions).filter(s => s.id !== id)),
  },

  fullAutoSessions: {
    getAll: (): FullAutoSession[] =>
      getAll<FullAutoSession>(KEYS.fullAutoSessions)
        .sort((a, b) => b.started_at.localeCompare(a.started_at)),
    getActive: (): FullAutoSession | null => {
      const all = getAll<FullAutoSession>(KEYS.fullAutoSessions)
      return all.find(s => s.status === 'running' || s.status === 'paused' || s.status === 'emergency_stop') ?? null
    },
    getById: (id: string): FullAutoSession | null =>
      getAll<FullAutoSession>(KEYS.fullAutoSessions).find(s => s.id === id) ?? null,
    save: (s: FullAutoSession): void => {
      const all = getAll<FullAutoSession>(KEYS.fullAutoSessions)
      const idx = all.findIndex(x => x.id === s.id)
      if (idx >= 0) all[idx] = s
      else all.push(s)
      saveAll(KEYS.fullAutoSessions, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.fullAutoSessions, getAll<FullAutoSession>(KEYS.fullAutoSessions).filter(s => s.id !== id)),
  },

  landingPublisherPages: {
    getAll: (): LandingPublisherPage[] =>
      getAll<LandingPublisherPage>(KEYS.landingPublisherPages)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    getById: (id: string): LandingPublisherPage | null =>
      getAll<LandingPublisherPage>(KEYS.landingPublisherPages).find(p => p.id === id) ?? null,
    getByProduct: (productId: string): LandingPublisherPage[] =>
      getAll<LandingPublisherPage>(KEYS.landingPublisherPages).filter(p => p.product_id === productId),
    save: (p: LandingPublisherPage): void => {
      const all = getAll<LandingPublisherPage>(KEYS.landingPublisherPages)
      const idx = all.findIndex(x => x.id === p.id)
      if (idx >= 0) all[idx] = p
      else all.push(p)
      saveAll(KEYS.landingPublisherPages, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.landingPublisherPages, getAll<LandingPublisherPage>(KEYS.landingPublisherPages).filter(p => p.id !== id)),
  },

  videoAiVideos: {
    getAll: (): VideoAIVideo[] =>
      getAll<VideoAIVideo>(KEYS.videoAiVideos)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    getById: (id: string): VideoAIVideo | null =>
      getAll<VideoAIVideo>(KEYS.videoAiVideos).find(v => v.id === id) ?? null,
    getByProduct: (productId: string): VideoAIVideo[] =>
      getAll<VideoAIVideo>(KEYS.videoAiVideos).filter(v => v.product_id === productId),
    save: (v: VideoAIVideo): void => {
      const all = getAll<VideoAIVideo>(KEYS.videoAiVideos)
      const idx = all.findIndex(x => x.id === v.id)
      if (idx >= 0) all[idx] = v
      else all.push(v)
      saveAll(KEYS.videoAiVideos, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.videoAiVideos, getAll<VideoAIVideo>(KEYS.videoAiVideos).filter(v => v.id !== id)),
  },

  integrations: {
    getMeta: (): MetaCredentials | null => {
      try { return JSON.parse(localStorage.getItem('tos_integration_meta') ?? 'null') } catch { return null }
    },
    getTikTok: (): TikTokCredentials | null => {
      try { return JSON.parse(localStorage.getItem('tos_integration_tiktok') ?? 'null') } catch { return null }
    },
    saveMeta: (c: MetaCredentials): void => localStorage.setItem('tos_integration_meta', JSON.stringify(c)),
    saveTikTok: (c: TikTokCredentials): void => localStorage.setItem('tos_integration_tiktok', JSON.stringify(c)),
    deleteMeta: (): void => { localStorage.removeItem('tos_integration_meta'); localStorage.removeItem('tos_integration_meta_sync') },
    deleteTikTok: (): void => { localStorage.removeItem('tos_integration_tiktok'); localStorage.removeItem('tos_integration_tiktok_sync') },
    getMetaSync: (): PlatformSync | null => {
      try { return JSON.parse(localStorage.getItem('tos_integration_meta_sync') ?? 'null') } catch { return null }
    },
    getTikTokSync: (): PlatformSync | null => {
      try { return JSON.parse(localStorage.getItem('tos_integration_tiktok_sync') ?? 'null') } catch { return null }
    },
    saveMetaSync: (s: PlatformSync): void => localStorage.setItem('tos_integration_meta_sync', JSON.stringify(s)),
    saveTikTokSync: (s: PlatformSync): void => localStorage.setItem('tos_integration_tiktok_sync', JSON.stringify(s)),
  },

  reAggregateCreative: (creativeId: string): void => {
    if (!creativeId) return
    const creative = getAll<AICreative>(KEYS.aiCreatives).find(c => c.id === creativeId)
    if (!creative) return
    const metrics = getAll<Metric>(KEYS.metrics).filter(m => m.creative_id === creativeId)
    if (metrics.length === 0) return
    const totalSpend = metrics.reduce((s, m) => s + m.spend, 0)
    const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0)
    const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0)
    const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0)
    const totalLeads = metrics.reduce((s, m) => s + (m.leads ?? 0), 0)
    const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0)
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
    const updated: AICreative = {
      ...creative,
      spend: totalSpend,
      revenue: totalRevenue,
      impressions: totalImpressions,
      clicks: totalClicks,
      leads: totalLeads,
      conversions: totalConversions,
      ctr,
      cpc,
      cpa,
      roas,
      updated_at: new Date().toISOString(),
    }
    const all = getAll<AICreative>(KEYS.aiCreatives)
    const idx = all.findIndex(c => c.id === creativeId)
    if (idx >= 0) all[idx] = updated
    saveAll(KEYS.aiCreatives, all)
  },

  exportAll: (): string => {
    const data: Record<string, unknown> = {}
    for (const [name, key] of Object.entries(KEYS)) {
      data[name] = getAll(key)
    }
    return JSON.stringify(data, null, 2)
  },

  importAll: (json: string): void => {
    const data = JSON.parse(json) as Record<string, unknown[]>
    for (const [name, key] of Object.entries(KEYS)) {
      if (Array.isArray(data[name])) {
        saveAll(key, data[name])
      }
    }
  },

  clearAll: (): void => {
    for (const key of Object.values(KEYS)) {
      localStorage.removeItem(key)
    }
  },
}
