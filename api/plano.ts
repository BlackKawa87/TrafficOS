import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'edge'

export const maxDuration = 60

const client = new Anthropic()

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

  const { planData } = (await req.json()) as { planData: string }
  if (!planData) return json({ error: 'Missing planData' }, 400)

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: planData }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text
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
