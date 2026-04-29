import OpenAI from 'openai'

export const config = { runtime: 'edge' }

export const maxDuration = 60

const client = new OpenAI()

const SYSTEM_PROMPT = `Você é um motor de previsão de performance de anúncios de tráfego pago. Com base no histórico de aprendizado da conta e na descrição de um novo criativo/campanha, gere previsões precisas de performance.

Suas previsões devem ser baseadas nos padrões históricos da conta — não use números genéricos.

RETORNE APENAS JSON válido:

{
  "predicted_ctr": <número decimal, ex: 2.35>,
  "predicted_cpa": <número, ex: 32.50>,
  "predicted_roas": <número decimal, ex: 2.80>,
  "confidence": <0–100, confiança na previsão baseada em dados disponíveis>,
  "score_potencial": <0–100, potencial geral deste criativo/campanha>,
  "reasoning": "<explicação em 2–3 frases: por que estes números, baseado nos padrões históricos da conta>",
  "recommendations": [
    "<recomendação específica para maximizar performance>",
    "<recomendação 2>",
    "<recomendação 3>"
  ],
  "riscos": [
    "<risco específico a monitorar>"
  ],
  "quando_pausar": "<critério específico: ex: 'Se CTR < 1% após 3000 impressões'>",
  "quando_escalar": "<critério específico: ex: 'Se ROAS > 3x após 5 conversões'>"
}

REGRAS:
- Se a conta tiver poucos dados históricos, confidence deve ser baixa (20–40)
- Previsões devem ser honestas — não superestime
- Se o criativo descrito for similar a um vencedor histórico, aumente confidence e score
- Forneça exatamente 3 recomendações e 1–2 riscos`


const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const { creativeDescription, channel, objective, modelContext } = (await req.json()) as {
    creativeDescription: string
    channel: string
    objective: string
    modelContext: string
  }

  if (!creativeDescription || !modelContext) {
    return json({ error: 'Creative description and model context required' }, 400)
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Com base no histórico de aprendizado desta conta, preveja a performance deste novo criativo:

HISTÓRICO E PADRÕES DA CONTA:
${modelContext}

NOVO CRIATIVO PARA PREVER:
Canal: ${channel || 'não especificado'}
Objetivo: ${objective || 'não especificado'}
Descrição: ${creativeDescription}

Retorne APENAS o JSON válido sem markdown ou texto extra.`,
        },
      ],
    })

    const text = response.choices[0].message.content ?? ''
    let jsonText = text.trim()
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return json({ error: 'Could not parse AI response', raw: jsonText.slice(0, 500) }, 422)
    }

    return json(JSON.parse(jsonMatch[0]))
  } catch (err) {
    console.error('AI Core predict error:', err)
    return json({ error: 'Failed to generate prediction. Please try again.' }, 500)
  }
}
