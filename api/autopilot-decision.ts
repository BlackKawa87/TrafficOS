import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

const SYSTEM_PROMPT = `Você é um gestor sênior de tráfego pago responsável por um sistema de auto-pilot de anúncios em tempo real.

Analise o estado atual da sessão de auto-pilot (campanhas ativas, métricas, ações tomadas, configuração) e gere um diagnóstico estratégico completo.

RETORNE APENAS JSON válido:

{
  "diagnostico": "<análise do estado atual em 2-3 frases diretas>",
  "score_performance": <número 0-100 representando saúde geral da operação>,
  "proximas_acoes": [
    {
      "tipo": "<tipo: escalar | pausar | criar_variacao | aumentar_orcamento | testar_novo_hook | revisar_oferta>",
      "descricao": "<ação específica a tomar>",
      "motivo": "<por que esta ação agora, baseada nos dados>",
      "urgencia": "<agora | hoje | amanhã>"
    }
  ],
  "alertas": [
    "<alerta de risco específico baseado nos dados>"
  ],
  "previsao_24h": {
    "spend_estimado": <número>,
    "revenue_estimado": <número>,
    "roas_estimado": <número com 2 casas decimais>,
    "cpa_estimado": <número>,
    "campanhas_ativas_estimadas": <número>
  },
  "recomendacao_principal": "<a ação mais importante para fazer agora — seja específico>"
}

REGRAS:
- Baseie-se apenas nos dados fornecidos
- Se dados forem insuficientes, mencione isso no diagnóstico
- Seja crítico e direto — sem elogios genéricos
- Mínimo 3 próximas ações, máximo 5
- Mínimo 2 alertas`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { sessionData } = req.body as { sessionData: string }

  if (!sessionData) {
    return res.status(400).json({ error: 'Session data is required' })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analise esta sessão de auto-pilot e gere o diagnóstico estratégico:\n\n${sessionData}\n\nRetorne APENAS o JSON válido (objeto) sem markdown ou texto extra.`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return res.status(500).json({ error: 'Unexpected response type from AI' })
    }

    let jsonText = content.text.trim()
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(422).json({ error: 'Could not parse AI response as JSON', raw: jsonText.slice(0, 500) })
    }

    const analysis = JSON.parse(jsonMatch[0])
    return res.status(200).json({ analysis })
  } catch (err) {
    console.error('Autopilot decision API error:', err)
    return res.status(500).json({ error: 'Failed to generate analysis. Please try again.' })
  }
}
