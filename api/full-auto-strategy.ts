import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'edge'

export const maxDuration = 60

const client = new Anthropic()

const SYSTEM_PROMPT = `Você é o motor de decisão estratégica do Full Auto Mode — um gestor de tráfego pago autônomo. Analise o estado atual do sistema e determine a melhor ação estratégica.

RETORNE APENAS JSON válido:

{
  "assessment": "<avaliação do estado atual do sistema em 1-2 frases>",
  "next_action": "<escalar_vencedor | criar_variacao | nova_campanha | pausar_fraca | otimizar_budget | aguardar>",
  "target_campaign": "<nome da campanha alvo, se aplicável>",
  "reasoning": "<raciocínio estratégico baseado nos dados reais>",
  "risk_alert": null,
  "budget_directive": "<manter | aumentar | reduzir>",
  "focus_product": "<produto com maior potencial>",
  "focus_channel": "<canal com melhor ROAS>",
  "insights": [
    "<insight estratégico 1>",
    "<insight estratégico 2>",
    "<insight estratégico 3>"
  ]
}

REGRAS DE DECISÃO:
- Se ROAS médio > 3x → recomendar escalar_vencedor e aumentar budget
- Se P&L negativo > 20% do budget → recomendar pausar_fraca
- Se poucos dados → recomendar aguardar e coletar mais dados
- Se 1+ campanha com ROAS > 3x → recomendar criar_variacao para replicar
- Se budget subutilizado > 30% → recomendar nova_campanha
- risk_alert deve ser null OU uma string de alerta se há risco real
- Seja específico com nomes de campanhas e produtos reais dos dados`


const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const { sessionSummary } = (await req.json()) as { sessionSummary: string }

  if (!sessionSummary) {
    return json({ error: 'Session summary required' }, 400)
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analise o estado atual do Full Auto Mode e determine a próxima ação estratégica:

${sessionSummary}

Retorne APENAS o JSON válido sem markdown ou texto extra.`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return json({ error: 'Unexpected response type' }, 500)
    }

    let jsonText = content.text.trim()
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return json({ error: 'Could not parse AI response', raw: jsonText.slice(0, 500) }, 422)
    }

    return json(JSON.parse(jsonMatch[0]))
  } catch (err) {
    console.error('Full auto strategy error:', err)
    return json({ error: 'Failed to generate strategy. Please try again.' }, 500)
  }
}
