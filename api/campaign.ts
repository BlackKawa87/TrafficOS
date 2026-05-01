import OpenAI from 'openai'
import type { IncomingMessage, ServerResponse } from 'http'

export const maxDuration = 60

const client = new OpenAI()

const SYSTEM_PROMPT = `Você é um estrategista sênior de tráfego pago, mídia performance e lançamento de produtos digitais.

Sua função é criar uma estrutura completa e estratégica de campanha de tráfego pago com base nos dados do produto, diagnóstico de oferta (quando disponível) e nas configurações escolhidas pelo usuário.

REGRAS FUNDAMENTAIS:
- Seja específico, prático e orientado a conversão real.
- Use os dados reais do produto em todas as seções — nunca seja genérico.
- Leve em conta o canal escolhido, o objetivo e a fase da campanha ao recomendar estrutura, criativos e métricas.
- Gere copies que pareçam escritos por um copywriter sênior — diretos, com gancho forte, baseados em dor ou desejo.
- As regras de decisão devem ser numéricas e específicas, não vagas.

IMPORTANTE: Retorne APENAS JSON válido. Sem markdown, sem texto fora do JSON. Siga o schema exato abaixo.

SCHEMA JSON OBRIGATÓRIO:
{
  "nome_estrategico": "<nome estratégico para a campanha, curto e descritivo — ex: [Produto] | Teste Criativo | Meta | Medo>",
  "objetivo_recomendado": {
    "adequado": <true se o objetivo escolhido é adequado para este produto/fase, false se deve ser ajustado>,
    "justificativa": "<por que o objetivo faz ou não faz sentido para este produto e fase>",
    "ajuste_sugerido": "<se adequado=false, sugira o objetivo correto e explique; se adequado=true, confirme e reforce>"
  },
  "hipotese_principal": "<hipótese de teste clara e específica — ex: Público X com dor Y responde melhor a ângulo Z no canal W>",
  "publico": {
    "principal": "<descrição detalhada do público principal: demografia, comportamentos, interesses, contexto de vida>",
    "secundarios": ["<público secundário 1>", "<público secundário 2>", "<público secundário 3>"],
    "interesses": ["<interesse 1>", "<interesse 2>", "<interesse 3>", "<interesse 4>", "<interesse 5>"],
    "exclusoes": ["<exclusão 1>", "<exclusão 2>", "<exclusão 3>"],
    "observacoes": "<observações de segmentação específicas para este produto e canal>",
    "broad_vs_segmentado": "<recomendação sobre usar público broad ou segmentado, com justificativa>"
  },
  "angulo_principal": {
    "tipo": "<tipo do ângulo: Medo/Perda, Ganho/Benefício, Transformação, Autoridade, Curiosidade, Urgência, Prova Social, Comparação, Erro Comum ou Oportunidade>",
    "descricao": "<descrição do ângulo principal e por que foi escolhido para este produto>",
    "aplicacao": "<como aplicar este ângulo especificamente no copy e no criativo>"
  },
  "angulos_secundarios": [
    {"tipo": "<tipo>", "descricao": "<descrição e aplicação prática>"},
    {"tipo": "<tipo>", "descricao": "<descrição e aplicação prática>"},
    {"tipo": "<tipo>", "descricao": "<descrição e aplicação prática>"},
    {"tipo": "<tipo>", "descricao": "<descrição e aplicação prática>"}
  ],
  "estrutura": {
    "num_campanhas": <número inteiro de campanhas recomendadas>,
    "num_conjuntos": <número inteiro de conjuntos/ad groups por campanha>,
    "criativos_por_conjunto": <número inteiro de criativos por conjunto>,
    "tipo_otimizacao": "<tipo de otimização recomendada — ex: Conversão, Tráfego, Alcance, Lead>",
    "estrategia_orcamento": "<como distribuir o orçamento entre campanhas, conjuntos e criativos>"
  },
  "criativos_necessarios": {
    "quantidade": <total de criativos a produzir>,
    "formatos": ["<formato 1>", "<formato 2>", "<formato 3>"],
    "duracao_videos": "<duração recomendada para vídeos — ex: 15-30 segundos para topo, 60-90 segundos para fundo>",
    "tipo_imagem": "<tipo de imagem recomendada — ex: foto real, mockup, texto em fundo>",
    "tipo_copy": "<estilo de copy — ex: direto ao ponto, storytelling, lista de benefícios>",
    "tipo_hook": "<tipo de hook — ex: pergunta provocativa, dado chocante, afirmação polêmica>"
  },
  "copies": {
    "textos_principais": [
      "<texto principal 1 — copy completo com hook + desenvolvimento + CTA>",
      "<texto principal 2>",
      "<texto principal 3>",
      "<texto principal 4>",
      "<texto principal 5>"
    ],
    "headlines": [
      "<headline 1 — curta e impactante>",
      "<headline 2>",
      "<headline 3>",
      "<headline 4>",
      "<headline 5>"
    ],
    "descricoes": [
      "<descrição curta 1 — 1-2 frases que reforçam a promessa>",
      "<descrição 2>",
      "<descrição 3>",
      "<descrição 4>",
      "<descrição 5>"
    ],
    "ctas": [
      "<CTA 1 — específico e com verbo de ação>",
      "<CTA 2>",
      "<CTA 3>",
      "<CTA 4>",
      "<CTA 5>"
    ]
  },
  "landing_page": {
    "avaliacao": "<avaliação se a página atual (ou tipo de página) combina com a campanha e o objetivo>",
    "acima_dobra": "<o que precisa aparecer nos primeiros 3 segundos de visualização da página>",
    "promessa": "<qual promessa deve ser repetida da campanha para a página — continuidade de mensagem>",
    "prova_garantia": "<que prova social ou garantia deve ser destacada na página para aumentar conversão>"
  },
  "metricas": {
    "ctr_minimo": "<CTR mínimo aceitável com valor numérico — ex: 1.5% para Meta Ads>",
    "cpc_maximo": "<CPC máximo aceitável com valor e moeda — ex: R$2,50 ou $0.80>",
    "cpa_alvo": "<CPA alvo realista com valor e moeda baseado no preço do produto>",
    "taxa_conversao": "<taxa de conversão esperada na landing page — ex: 1.5% a 3%>",
    "roas_esperado": "<ROAS mínimo para considerar campanha viável — ex: 2.0x ou N/A para geração de leads>"
  },
  "regras_decisao": {
    "pausar": "<critério numérico específico para pausar — ex: CPA acima de R$X após Y gastos ou CTR abaixo de Z% após 3 dias>",
    "manter": "<critério numérico para manter rodando sem alterações>",
    "duplicar": "<critério e situação para duplicar conjunto ou criativo>",
    "escalar": "<critério numérico para escalar orçamento — ex: ROAS acima de X por 3 dias consecutivos>",
    "variacoes": "<quando e como criar variações do criativo ou copy>"
  },
  "plano_3_dias": {
    "dia1": "<o que observar, configurar e verificar no primeiro dia — métricas, entrega, aprovação>",
    "dia2": "<o que analisar no segundo dia — CTR, CPC, frequency, primeiras impressões>",
    "dia3": "<o que decidir no terceiro dia com base nos dados acumulados>"
  },
  "proximo_passo": "<ação concreta e específica que o usuário deve tomar AGORA após gerar esta campanha>"
}`


function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, data: unknown, status = 200): void {
  const body = JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, { error: 'Method not allowed' }, 405); return
  }

  let rawBody: string
  try { rawBody = await readBody(req) } catch { sendJson(res, { error: 'Invalid request' }, 400); return }

  const { campaignData, language, currency, phase } = JSON.parse(rawBody) as {
    campaignData: string
    language?: string
    currency?: string
    phase?: string
  }

  if (!campaignData) {
    sendJson(res, { error: 'Campaign data is required' }, 400); return
  }

  const lang = language ?? 'pt-BR'
  const curr = currency ?? 'BRL'

  const LANG_INSTRUCTION_MAP: Record<string, string> = {
    'pt-BR': 'Responda COMPLETAMENTE em Português do Brasil. Copies, textos e recomendações devem estar em PT-BR.',
    'en-US': 'Respond ENTIRELY in English (US). All copies, texts and recommendations must be in English.',
    'es':    'Responde COMPLETAMENTE en Español. Todos los copies, textos y recomendaciones deben estar en Español.',
    'fr':    'Répondez ENTIÈREMENT en Français. Tous les copies, textes et recommandations doivent être en Français.',
    'de':    'Antworte KOMPLETT auf Deutsch. Alle Copies, Texte und Empfehlungen müssen auf Deutsch sein.',
    'it':    'Rispondi COMPLETAMENTE in Italiano. Tutti i copies, testi e raccomandazioni devono essere in Italiano.',
  }
  const langInstruction = LANG_INSTRUCTION_MAP[lang] ?? LANG_INSTRUCTION_MAP['pt-BR']

  const isTestPhase = phase === 'teste_criativo' || phase === 'teste_inicial' || phase === 'pre_validacao'
  const minBudgetInstruction = isTestPhase ? `
FASE DE TESTE — ORÇAMENTO MÍNIMO VIÁVEL:
- Esta campanha está em fase de TESTE DE CRIATIVO / VALIDAÇÃO INICIAL. Priorize eficiência máxima com o menor orçamento possível.
- Para Meta Ads: orçamento mínimo de ${curr === 'BRL' ? 'R$20-30/dia' : curr === 'USD' ? '$5-10/day' : curr === 'EUR' ? '€5-10/day' : '£5-8/day'} por conjunto de anúncios é suficiente para coletar dados.
- Para TikTok Ads: mínimo de ${curr === 'BRL' ? 'R$50/dia' : curr === 'USD' ? '$20/day' : curr === 'EUR' ? '€18/day' : '£16/day'} (limite mínimo da plataforma).
- Para Google/YouTube: ${curr === 'BRL' ? 'R$20-40/dia' : curr === 'USD' ? '$5-15/day' : curr === 'EUR' ? '€5-12/day' : '£5-10/day'} suficiente para começar.
- Na estrutura, recomende 1 campanha com 1-2 conjuntos e máximo 3-4 criativos por conjunto.
- Na estratégia de orçamento, priorize o mínimo necessário para coleta de dados estatísticos, NÃO para escala.
- O objetivo desta fase é APRENDER, não vender em volume.
` : ''

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 8000,
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Crie a estrutura estratégica completa para esta campanha com todas as 14 seções:

${campaignData}

IDIOMA DE RESPOSTA: ${langInstruction}
MOEDA PADRÃO: Use ${curr} em TODOS os valores monetários (CPC, CPA, orçamentos, etc). Formate como ${curr === 'BRL' ? 'R$' : curr === 'USD' ? 'US$' : curr === 'EUR' ? '€' : '£'}.
${minBudgetInstruction}
IMPORTANTE: seja completamente específico para este produto, canal e objetivo. Use os dados reais fornecidos. Gere copies reais e prontos para uso.
Retorne APENAS o JSON válido conforme o schema.`,
        },
      ],
    })

    const text = response.choices[0].message.content ?? ''
    let jsonText = text.trim()
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      sendJson(res, { error: 'Could not parse AI response as JSON', raw: jsonText.slice(0, 500) }, 422); return
    }

    const strategy = JSON.parse(jsonMatch[0])
    sendJson(res, { strategy }); return
  } catch (err) {
    console.error('Campaign API error:', err)
    sendJson(res, { error: 'Failed to generate campaign strategy. Please try again.' }, 500); return
  }
}
