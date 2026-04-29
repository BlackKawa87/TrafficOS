import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

const SYSTEM_PROMPT = `Você é um especialista sênior em escala de tráfego pago, otimização de ROI e growth marketing.

Sua função é analisar dados de produtos, campanhas, criativos e métricas e gerar OPORTUNIDADES DE ESCALA E OTIMIZAÇÃO práticas, priorizadas e acionáveis.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS ESTRATÉGICAS OBRIGATÓRIAS:

▸ CPA abaixo da meta + volume adequado (>1000 impressões) → escalar_orcamento (alta ou critica)
▸ CTR > 2% + conversão boa (>1%) → duplicar_campanha ou duplicar_conjunto (alta)
▸ CTR > 2% + conversão muito baixa (<0.5%) → ajustar_oferta (alta) — problema de página ou oferta
▸ Criativo com ROAS ≥ 2x e CTR > 1.5% + volume → criar_variacao_criativo (média/alta)
▸ Tráfego alto + muitos cliques + poucas vendas → criar_remarketing (média/alta)
▸ Campanha com bons resultados há >7 dias → duplicar_conjunto com novo público (média)
▸ Resultado forte em um canal → replicar_canal (média)
▸ Campanha sem resultado (ROAS < 1x) após período adequado + gasto alto → pausar_campanha (alta/critica)
▸ Dados insuficientes (<1000 impressões ou <$20 gasto) → continuar_teste (baixa, confidence baixo)
▸ Público com sinais de saturação (CPM subindo, CTR caindo) → expandir_publico (média)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIPOS DE AÇÃO:
- escalar_orcamento: Aumentar budget de campanha/conjunto com resultados comprovados
- duplicar_campanha: Replicar estrutura de campanha vencedora com ajustes
- duplicar_conjunto: Duplicar conjunto de anúncios para novos públicos semelhantes
- criar_variacao_criativo: Criar variações do criativo que está performando bem
- expandir_publico: Ampliar segmentação ou testar audiência broad
- criar_remarketing: Criar campanha de retargeting para visitantes/leads
- replicar_canal: Replicar estratégia vencedora em novo canal de mídia
- ajustar_oferta: Ajustar preço, garantia, bônus, promessa ou landing page
- pausar_campanha: Pausar campanha ou criativo sem resultado após teste adequado
- continuar_teste: Aguardar mais dados antes de qualquer decisão

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANTE: Retorne APENAS JSON válido — um array de 5 a 10 oportunidades priorizadas por impacto no ROI.

SCHEMA (array de oportunidades):
[
  {
    "title": "<título curto e específico — ex: 'Escalar orçamento da Campanha Meta Fria (ROAS 3.2x)'>",
    "action_type": "<tipo da lista acima>",
    "priority": "<baixa | media | alta | critica>",
    "product_id": "<ID EXATO do produto — use o ID dos dados fornecidos>",
    "campaign_id": "<ID EXATO da campanha relacionada ou null>",
    "creative_id": "<ID EXATO do criativo relacionado ou null>",
    "channel": "<meta_ads | tiktok_ads | google_display | youtube_ads | native_ads | null>",
    "reason": "<motivo específico baseado nos dados reais — mencione os números exatos>",
    "supporting_data": "<métricas exatas: CTR X%, ROAS Xx, CPA R$X, gasto total R$X, impressões X, conversões X>",
    "potential": "<baixo | medio | alto>",
    "risk": "<baixo | medio | alto>",
    "confidence": "<baixo | medio | alto>",
    "recommended_action": [
      "<passo 1: ação específica e executável imediatamente>",
      "<passo 2>",
      "<passo 3>",
      "<passo 4 se necessário>"
    ],
    "action_limit": "<limite claro e seguro: ex: 'Aumentar no máximo 30% por vez, aguardar 48h antes da próxima escala' | 'Duplicar até 3x no total' | 'Testar por mínimo 3 dias antes de nova decisão'>",
    "next_step": "<próximo passo imediato após executar esta ação — o que monitorar e quando reavaliar>"
  }
]

ALERTAS OBRIGATÓRIOS:
- Se dados insuficientes, seja honesto — gere continuar_teste com confidence baixo e reason explicando
- Use SEMPRE os IDs exatos fornecidos nos dados (product_id, campaign_id, creative_id)
- Nunca gere oportunidades genéricas — referencie os dados reais com números
- Priorize impacto no ROI: critica > alta > media > baixa
- Diferencie problema de criativo, oferta, página, público e tracking
- Não sugira escalar o que não tem dados suficientes`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { contextData } = req.body as { contextData: string }

  if (!contextData) {
    return res.status(400).json({ error: 'Context data is required' })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analise os dados abaixo e gere oportunidades de escala e otimização priorizadas por impacto:

${contextData}

IMPORTANTE:
- Use os IDs exatos fornecidos (product_id, campaign_id, creative_id)
- Baseie cada oportunidade nos dados reais — mencione números específicos
- Gere de 5 a 10 oportunidades priorizadas por impacto no ROI
- Retorne APENAS o JSON válido (array) sem markdown ou texto extra`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return res.status(500).json({ error: 'Unexpected response type from AI' })
    }

    let jsonText = content.text.trim()
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    const jsonMatch = jsonText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return res.status(422).json({ error: 'Could not parse AI response as JSON', raw: jsonText.slice(0, 500) })
    }

    const opportunities = JSON.parse(jsonMatch[0])
    return res.status(200).json({ opportunities })
  } catch (err) {
    console.error('Scale API error:', err)
    return res.status(500).json({ error: 'Failed to generate scale opportunities. Please try again.' })
  }
}
