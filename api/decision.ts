import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

const SYSTEM_PROMPT = `Você é um estrategista sênior de tráfego pago e growth marketing.

Sua função é analisar os dados de um produto, suas campanhas, criativos e métricas, e gerar um conjunto de decisões estratégicas prioritizadas.

REGRAS:
- Seja específico e use os dados fornecidos — sem recomendações genéricas.
- Priorize decisões que impactam diretamente o ROI.
- Cada decisão deve ter ações claras e executáveis.
- Se os dados forem insuficientes para uma decisão confiante, indique isso no reasoning.
- Limite a no máximo 6 decisões mais relevantes.

TIPOS DE DECISÃO:
- pause: pausar algo que está custando dinheiro sem retorno
- scale: escalar algo que está performando bem
- maintain: manter e monitorar algo com resultados aceitáveis
- improve: melhorar algo com potencial mas que precisa de ajuste

PRIORIDADES:
- high: ação urgente nas próximas 24h
- medium: ação nos próximos 3 dias
- low: ação na próxima semana

IMPORTANTE: Retorne APENAS JSON válido. Sem markdown, sem texto fora do JSON.

SCHEMA JSON OBRIGATÓRIO:
{
  "decisions": [
    {
      "decision_type": "pause | scale | maintain | improve",
      "reasoning": "<raciocínio claro baseado nos dados fornecidos>",
      "actions": ["<ação 1>", "<ação 2>", "<ação 3>"],
      "priority": "high | medium | low"
    }
  ]
}`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { decisionData } = req.body as { decisionData: string }
  if (!decisionData) return res.status(400).json({ error: 'Missing decisionData' })

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: decisionData }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return res.status(500).json({ error: 'Invalid AI response' })

    const parsed = JSON.parse(match[0]) as { decisions: Array<{ decision_type: string; reasoning: string; actions: string[]; priority: string }> }
    return res.status(200).json({ decisions: parsed.decisions })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'AI generation failed' })
  }
}
