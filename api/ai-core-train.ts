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

const SYSTEM_PROMPT = `Você é um motor de inteligência artificial especializado em tráfego pago. Sua função é analisar o histórico completo de uma conta de anúncios e gerar um modelo de aprendizado que melhora decisões futuras.

Analise os dados fornecidos e gere:
1. PADRÕES: O que consistentemente funciona nesta conta (criativos, públicos, canais, ofertas, timing, copy)
2. MELHORIAS: Ações específicas para melhorar performance
3. META_INSIGHTS: Os melhores performers em cada categoria
4. RESUMO: Avaliação geral da maturidade da conta

RETORNE APENAS JSON válido:

{
  "overall_score": <0–100, score de maturidade e inteligência da conta>,
  "training_summary": "<avaliação geral em 2–3 frases diretas: situação atual, padrão mais importante identificado e risco principal>",
  "next_training_suggested": "<quando retreinar: ex: 'Após 10 novos criativos' ou 'Em 7 dias'>",
  "patterns": [
    {
      "category": "<criativo | publico | canal | oferta | timing | copy>",
      "title": "<título claro e específico do padrão identificado>",
      "insight": "<explicação detalhada com dados que embasam o padrão — seja específico>",
      "confidence": <0–100, baseado em quantos dados suportam o padrão>,
      "data_points": <número estimado de pontos de dados que embasam>,
      "impact": "<alto | medio | baixo>"
    }
  ],
  "improvements": [
    {
      "area": "<copy | criativo | publico | funil | campanha | oferta>",
      "title": "<título específico da melhoria>",
      "current_state": "<o que está acontecendo atualmente — seja concreto>",
      "suggested_improvement": "<mudança específica e acionável>",
      "expected_impact": "<resultado esperado mensurável: ex: '+20% CTR', 'CPA -30%'>",
      "priority": "<alta | media | baixa>"
    }
  ],
  "meta_insights": {
    "best_creative_type": "<tipo de criativo com melhor performance>",
    "best_channel": "<canal mais lucrativo>",
    "best_audience_type": "<tipo de público que mais converte>",
    "best_offer_angle": "<ângulo de oferta que mais vende>",
    "avg_winning_ctr": <CTR médio dos vencedores como número decimal>,
    "avg_winning_cpa": <CPA médio dos vencedores como número>,
    "avg_winning_roas": <ROAS médio dos vencedores como número decimal>
  }
}

REGRAS:
- Mínimo 5 padrões, máximo 12
- Mínimo 5 melhorias, máximo 10
- Overall score: 0–25 = dados escassos, 26–50 = dados suficientes, 51–75 = boa base, 76–100 = conta madura
- Se dados forem escassos: score baixo, padrões com baixa confiança, melhorias focadas em coletar mais dados
- Seja crítico e direto — sem elogios genéricos
- Baseie cada insight nos dados reais fornecidos`


const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const { contextData } = (await req.json()) as { contextData: string }

  if (!contextData) {
    return json({ error: 'Context data is required' }, 400)
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4000,
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analise o histórico completo desta conta e gere o modelo de inteligência:\n\n${contextData}\n\nRetorne APENAS o JSON válido (objeto) sem markdown ou texto extra.${langLine}`,
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
    console.error('AI Core train error:', err)
    return json({ error: 'Failed to train model. Please try again.' }, 500)
  }
}
