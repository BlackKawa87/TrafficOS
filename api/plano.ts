import OpenAI from 'openai'

export const config = { runtime: 'edge' }

export const maxDuration = 60

const client = new OpenAI()

const LANG_MAP: Record<string, string> = {
  'pt-BR': 'Responda COMPLETAMENTE em Português do Brasil. Todos os textos, análises, copies e recomendações devem estar em PT-BR.',
  'en-US': 'Respond ENTIRELY in English (US). All texts, analyses, copies and recommendations must be in English.',
  'es':    'Responde COMPLETAMENTE en Español. Todos los textos, análisis, copies y recomendaciones deben estar en Español.',
  'fr':    'Répondez ENTIÈREMENT en Français. Tous les textes, analyses, copies et recommandations doivent être en Français.',
  'de':    'Antworte KOMPLETT auf Deutsch. Alle Texte, Analysen, Copies und Empfehlungen müssen auf Deutsch sein.',
  'it':    'Rispondi COMPLETAMENTE in Italiano. Tutti i testi, analisi, copies e raccomandazioni devono essere in Italiano.',
}

const SYSTEM_PROMPT = `Você é um gestor de tráfego e estrategista de crescimento orientado a execução.

Sua função é transformar dados e decisões em um plano de ação claro, objetivo e executável para o dia atual.

CATEGORIAS DE TAREFAS:
- hoje: ação imediata, executar agora
- proximas_24h: ação para as próximas 24 horas
- proximos_3_dias: estratégia de curto prazo
- escala: ações para escalar o que está funcionando
- correcao: ações para corrigir o que está falhando

PRIORIDADES:
- critical: ação urgente agora — gasto sem retorno ou oportunidade crítica
- high: executar hoje
- medium: executar nos próximos dias
- low: monitorar

REGRAS:
- Máximo 15 tarefas no total
- Priorize impacto sobre volume de tarefas
- Evite tarefas genéricas — use os dados reais fornecidos
- Se dados forem insuficientes, coloque alertas e menos tarefas
- Diferencie sempre: problema de criativo, oferta, página ou público
- Nunca sugira escalar sem base mínima de dados (mínimo $20 gasto e 1000 impressões)
- Se houver decisões da IA, priorize transformá-las em tarefas concretas

ALERTAS OBRIGATÓRIOS (adicione quando aplicável):
- Amostra insuficiente (<1000 impressões ou <$20 gasto)
- Risco de decisão errada por falta de dados
- Problema pode não ser de tráfego (oferta, página, produto)
- Possível erro de tracking ou atribuição
- Saturação de criativos
- Ausência de diagnóstico de oferta

IMPORTANTE: Retorne APENAS JSON válido. Sem markdown, sem texto fora do JSON.

SCHEMA JSON OBRIGATÓRIO:
{
  "scenario_summary": "<resumo do cenário atual em 2-4 frases — o que está acontecendo, o que funciona, o que falha>",
  "day_priority": {
    "focus": "<foco principal do dia — ex: melhorar criativos, validar oferta, escalar campanha>",
    "reason": "<motivo estratégico baseado nos dados>"
  },
  "tasks": [
    {
      "description": "<descrição específica e executável — não genérica>",
      "category": "hoje | proximas_24h | proximos_3_dias | escala | correcao",
      "priority": "critical | high | medium | low",
      "estimated_time": "<ex: 15min, 30min, 1h, 2h>",
      "expected_impact": "<impacto esperado em CTR, ROAS, CPA ou volume>",
      "related_campaign_id": "<id exato da campanha ou null>",
      "related_creative_id": "<id exato do criativo ou null>"
    }
  ],
  "alerts": ["<alerta específico 1>", "<alerta específico 2>"],
  "next_strategic_step": "<o que fazer depois de executar este plano — próximo ciclo estratégico>"
}`


const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const { planData, language } = (await req.json()) as { planData: string; language?: string }

  const langLine = language && language !== 'pt-BR'
    ? `\n\nIDIOMA DE RESPOSTA: ${LANG_MAP[language] ?? LANG_MAP['pt-BR']}`
    : ''
  if (!planData) return json({ error: 'Missing planData' }, 400)

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 6000,
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        { role: 'user', content: planData + langLine },
      ],
    })

    const raw = response.choices[0].message.content ?? ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return json({ error: 'Invalid AI response' }, 500)

    const parsed = JSON.parse(match[0])
    return json(parsed)
  } catch (err) {
    console.error(err)
    return json({ error: 'AI generation failed' }, 500)
  }
}
