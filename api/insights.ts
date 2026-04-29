import OpenAI from 'openai'

export const config = { runtime: 'edge' }

export const maxDuration = 60

const client = new OpenAI()

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


const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const { insightsData } = (await req.json()) as { insightsData: string }
  if (!insightsData) return json({ error: 'Missing insightsData' }, 400)

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4000,
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        { role: 'user', content: insightsData },
      ],
    })

    const raw = response.choices[0].message.content ?? ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return json({ error: 'Invalid AI response' }, 500)

    const insights = JSON.parse(match[0])
    return json({ insights })
  } catch (err) {
    console.error(err)
    return json({ error: 'AI generation failed' }, 500)
  }
}
