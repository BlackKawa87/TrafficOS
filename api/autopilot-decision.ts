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


const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const { sessionData } = (await req.json()) as { sessionData: string }

  if (!sessionData) {
    return json({ error: 'Session data is required' }, 400)
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3000,
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analise esta sessão de auto-pilot e gere o diagnóstico estratégico:\n\n${sessionData}\n\nRetorne APENAS o JSON válido (objeto) sem markdown ou texto extra.${langLine}`,
        },
      ],
    })

    const text = response.choices[0].message.content ?? ''
    let jsonText = text.trim()
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return json({ error: 'Could not parse AI response as JSON', raw: jsonText.slice(0, 500) }, 422)
    }

    const analysis = JSON.parse(jsonMatch[0])
    return json({ analysis })
  } catch (err) {
    console.error('Autopilot decision API error:', err)
    return json({ error: 'Failed to generate analysis. Please try again.' }, 500)
  }
}
