import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

const SYSTEM_PROMPT = `Você é um especialista em gestão de portfólio de produtos para tráfego pago. Analise múltiplos produtos rodando simultaneamente e forneça uma análise estratégica completa e acionável.

RETORNE APENAS JSON válido:

{
  "ranking_commentary": "<análise do ranking atual — quem lidera e por quê, baseado nos dados reais>",
  "winner_analysis": "<análise detalhada dos produtos com melhor ROAS e performance>",
  "loser_analysis": "<análise dos produtos com pior performance — CPA alto, ROAS negativo>",
  "budget_recommendation": "<como redistribuir o budget entre produtos — percentuais específicos>",
  "next_actions": [
    {
      "product_name": "<nome exato do produto>",
      "action": "<ação específica: ex: Escalar budget em 50%, Pausar, Criar variação, Testar nova oferta>",
      "reasoning": "<motivo baseado nos dados reais de ROAS/CPA/CTR>"
    }
  ],
  "overall_strategy": "<estratégia geral para o portfólio — foco, priorização, próximos 7 dias>",
  "predicted_winner": "<nome do produto mais provável de dominar o portfólio>",
  "estimated_timeline": "<estimativa de quando teremos um vencedor claro, ex: 3-5 dias de dados>"
}

REGRAS:
- Use os números reais fornecidos (ROAS, CPA, CTR, spend, receita)
- Seja específico — não use linguagem genérica
- Identifique claramente vencedores e elimine candidatos fracos
- Forneça exatamente 3-5 ações em next_actions, uma por produto relevante
- Se ROAS > 3x → escalar
- Se ROAS < 1x após volume → pausar ou revisar oferta
- Se CPA > 3x da meta → reduzir budget imediatamente`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { sessionData } = req.body as { sessionData: string }

  if (!sessionData) {
    return res.status(400).json({ error: 'Session data required' })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analise o desempenho deste portfólio de produtos em execução simultânea e forneça recomendações estratégicas:

${sessionData}

Retorne APENAS o JSON válido sem markdown ou texto extra.`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return res.status(500).json({ error: 'Unexpected response type' })
    }

    let jsonText = content.text.trim()
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(422).json({ error: 'Could not parse AI response', raw: jsonText.slice(0, 500) })
    }

    return res.status(200).json(JSON.parse(jsonMatch[0]))
  } catch (err) {
    console.error('Multi-produto analyze error:', err)
    return res.status(500).json({ error: 'Failed to generate analysis. Please try again.' })
  }
}
