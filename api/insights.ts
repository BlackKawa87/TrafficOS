import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

const SYSTEM_PROMPT = `Você é um analista sênior de tráfego pago com expertise em Meta Ads, TikTok Ads e Google Ads.

Analise os dados de performance de criativos e métricas e gere insights estratégicos acionáveis.

REGRAS:
- Seja específico, cite métricas reais dos dados fornecidos.
- Identifique padrões reais — não gere genéricos.
- Priorize insights que levam a ações imediatas.

IMPORTANTE: Retorne APENAS JSON válido. Sem markdown, sem texto fora do JSON.

SCHEMA JSON OBRIGATÓRIO:
{
  "o_que_funciona": "<principais padrões de sucesso identificados com base nos dados>",
  "o_que_falha": "<principais problemas e padrões de falha identificados>",
  "hooks_que_performam": "<tipos de hooks com melhor CTR e engagement nos dados>",
  "angulos_que_convertem": "<ângulos e abordagens com melhor ROAS/CPA>",
  "melhores_canais": "<canais com melhor relação custo/resultado baseado nos dados>",
  "produtos_com_potencial": "<produtos com maior potencial baseado nas métricas>",
  "criativos_pausar": ["<nome ou id de criativo com baixo ROAS e alto gasto>"],
  "criativos_variar": ["<nome ou id de criativo que deve ter variações geradas>"],
  "proximos_testes": ["<teste recomendado 1>", "<teste recomendado 2>", "<teste recomendado 3>"]
}`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { insightsData } = req.body as { insightsData: string }
  if (!insightsData) return res.status(400).json({ error: 'Missing insightsData' })

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: insightsData }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return res.status(500).json({ error: 'Invalid AI response' })

    const insights = JSON.parse(match[0])
    return res.status(200).json({ insights })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'AI generation failed' })
  }
}
