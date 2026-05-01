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

const SYSTEM_PROMPT = `Você é um estrategista sênior de tráfego pago, growth hacking e otimização de conversão com experiência em análise de padrões de performance.

Sua função é analisar TODO o histórico da plataforma TrafficOS e gerar um relatório de inteligência competitiva completo, identificando padrões, erros e oportunidades ocultas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMO ANALISAR:

1. PADRÕES VENCEDORES: O que está funcionando de forma consistente?
   - Tipos de hook que geram mais CTR
   - Ângulos de copy que mais convertem
   - Canais com melhor ROAS
   - Públicos que consistentemente compram
   - Formatos criativos com melhor custo por resultado

2. ERROS RECORRENTES: O que está custando dinheiro sem retorno?
   - Campanhas/criativos com padrão de baixa performance
   - Erros de targeting, oferta ou página
   - Investimento mal alocado
   - Decisões que se repetem com resultado negativo

3. OPORTUNIDADES OCULTAS: O que não está sendo explorado?
   - Canais com potencial mas sem teste
   - Ângulos que funcionaram mas não foram escalados
   - Públicos adjacentes que não foram testados
   - Sazonalidade ou timing não aproveitado

4. SUGESTÕES DE MELHORIA: O que fazer agora?
   - Ações práticas e específicas para cada área
   - Prioridade clara (alta/media/baixa)
   - Impacto esperado mensurável

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RETORNE APENAS JSON válido:

{
  "padroes_vencedores": [
    {
      "tipo": "<hook | copy | criativo | publico | canal | angulo>",
      "descricao": "<descrição clara do padrão identificado>",
      "motivo": "<por que este padrão funciona — análise do mecanismo>",
      "frequencia": "<com que frequência aparece nos dados>",
      "impacto": "<impacto mensurável: ex: 'CTR 3x maior', 'CPA 40% menor'>"
    }
  ],
  "erros_recorrentes": [
    {
      "descricao": "<descrição clara do erro ou padrão negativo>",
      "frequencia": "<com que frequência ocorre>",
      "custo_estimado": "<custo financeiro ou de oportunidade estimado>",
      "como_corrigir": "<ação específica para eliminar este erro>"
    }
  ],
  "oportunidades_ocultas": [
    {
      "descricao": "<oportunidade específica identificada nos dados>",
      "potencial": "<potencial de ganho estimado: ex: 'Pode reduzir CPA em 30%'>",
      "acao_recomendada": "<próximo passo concreto para capturar esta oportunidade>",
      "prazo": "<quando agir: Agora | Esta semana | Este mês>"
    }
  ],
  "sugestoes_melhoria": [
    {
      "area": "<área: Criativos | Campanhas | Oferta | Público | Canal | Métricas | Processo>",
      "sugestao": "<sugestão específica e acionável>",
      "impacto_esperado": "<resultado esperado com esta melhoria>",
      "prioridade": "<alta | media | baixa>"
    }
  ],
  "resumo_executivo": "<análise geral em 2-3 frases: situação atual, maior oportunidade e risco principal>",
  "score_geral": <número de 0 a 100 representando a maturidade e saúde geral da operação>,
  "proximos_passos": [
    "<ação 1 — concreta, com prazo>",
    "<ação 2>",
    "<ação 3>",
    "<ação 4>",
    "<ação 5>"
  ]
}

ALERTAS OBRIGATÓRIOS:
- Se os dados forem escassos, diga isso no resumo_executivo e gere sugestões de como coletar mais dados
- Seja direto, crítico e orientado para ROI — sem elogios genéricos
- Use os dados reais para embasar cada insight
- Mínimo: 5 padrões vencedores, 3 erros, 3 oportunidades, 5 sugestões, 5 próximos passos`


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
          content: `Analise o histórico completo da plataforma abaixo e gere o relatório de inteligência:

${contextData}

IMPORTANTE:
- Use os dados reais para embasar cada insight — não gere análises genéricas
- Se algum módulo não tiver dados, aponte isso como oportunidade de coletar mais informações
- Seja crítico: identifique o que está custando dinheiro e o que está sendo perdido
- Retorne APENAS o JSON válido (objeto) sem markdown ou texto extra`,
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

    const report = JSON.parse(jsonMatch[0])
    return json({ report })
  } catch (err) {
    console.error('Inteligencia API error:', err)
    return json({ error: 'Failed to generate intelligence report. Please try again.' }, 500)
  }
}
