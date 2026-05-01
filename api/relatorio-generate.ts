import OpenAI from 'openai'

export const config = { runtime: 'edge' }

export const maxDuration = 60

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const {
    type,
    period_label,
    kpis,
    winners,
    losers,
    decisions,
    product_name,
    campaign_name,
    channel,
  } = await req.json() as {
    type: string
    period_label: string
    kpis: {
      total_spend: number
      total_revenue: number
      profit: number
      avg_roas: number
      avg_cpa: number
      avg_ctr: number
      avg_cpc: number
      total_conversions: number
      total_impressions: number
      total_clicks: number
      total_leads: number
    }
    winners: Array<{ creative_name: string; spend: number; revenue: number; roas: number; ctr: number; cpa: number }>
    losers: Array<{ creative_name: string; spend: number; revenue: number; roas: number; ctr: number; cpa: number }>
    decisions: Array<{ title: string; decision_type: string; priority: string; status: string }>
    product_name?: string
    campaign_name?: string
    channel?: string
  }

  const client = new OpenAI()

  const systemPrompt = `Você é um analista sênior de tráfego pago e growth marketing. Sua função é gerar relatórios executivos claros, honestos e acionáveis sobre a performance de campanhas de tráfego pago.

Você escreve para gestores de tráfego e empreendedores que precisam entender rapidamente:
- O que está funcionando
- O que está queimando dinheiro
- O que fazer agora

Seu tom é direto, crítico quando necessário e sempre orientado para ROI e ação imediata.

Retorne APENAS um objeto JSON válido com esta estrutura exata:

{
  "resumo_executivo": "<parágrafo de 3-5 frases resumindo a performance do período, incluindo diagnóstico honesto e tom assertivo>",
  "principais_aprendizados": [
    "<aprendizado específico baseado nos dados>"
  ],
  "acoes_tomadas": [
    "<ação executada no período baseada nas decisões>"
  ],
  "riscos_identificados": [
    "<risco específico identificado nos dados>"
  ],
  "oportunidades": [
    "<oportunidade concreta baseada nos dados>"
  ],
  "proximos_passos": [
    "<próximo passo específico e acionável>"
  ],
  "recomendacoes": [
    "<recomendação estratégica prática>"
  ]
}

Regras:
- Seja específico: use os números reais fornecidos
- Se ROAS < 1: diga claramente que está queimando dinheiro
- Se ROAS ≥ 3: destaque como oportunidade de escala
- Se não houver dados: indique isso claramente no resumo
- Cada array deve ter 3-5 itens
- Use português brasileiro`

  const contextLabel = product_name ? ` · Produto: ${product_name}` :
    campaign_name ? ` · Campanha: ${campaign_name}` :
    channel ? ` · Canal: ${channel}` : ''

  const winnersText = winners.length > 0
    ? winners.map(w => `  • ${w.creative_name}: ROAS ${w.roas.toFixed(2)}x, gasto R$${w.spend.toFixed(0)}, receita R$${w.revenue.toFixed(0)}, CTR ${w.ctr.toFixed(2)}%`).join('\n')
    : '  Nenhum criativo vencedor neste período'

  const losersText = losers.length > 0
    ? losers.map(l => `  • ${l.creative_name}: ROAS ${l.roas.toFixed(2)}x, gasto R$${l.spend.toFixed(0)}, CTR ${l.ctr.toFixed(2)}%`).join('\n')
    : '  Nenhum criativo perdedor identificado'

  const decisionsText = decisions.length > 0
    ? decisions.map(d => `  • [${d.priority.toUpperCase()}] ${d.title || d.decision_type} (${d.status})`).join('\n')
    : '  Nenhuma decisão registrada no período'

  const userPrompt = `Gere um relatório executivo completo para o seguinte período.

TIPO: ${type}${contextLabel}
PERÍODO: ${period_label}

KPIs FINANCEIROS:
• Gasto Total:      R$${kpis.total_spend.toFixed(2)}
• Receita Total:    R$${kpis.total_revenue.toFixed(2)}
• Lucro/Prejuízo:   R$${kpis.profit.toFixed(2)} (${kpis.profit >= 0 ? 'LUCRO' : 'PREJUÍZO'})
• ROAS Médio:       ${kpis.avg_roas.toFixed(2)}x ${kpis.avg_roas >= 2 ? '✅' : kpis.avg_roas >= 1 ? '⚠️' : '🔴'}
• CPA Médio:        ${kpis.avg_cpa > 0 ? 'R$' + kpis.avg_cpa.toFixed(2) : 'sem conversões'}
• CTR Médio:        ${kpis.avg_ctr.toFixed(2)}%
• CPC Médio:        ${kpis.avg_cpc > 0 ? 'R$' + kpis.avg_cpc.toFixed(2) : 'sem cliques'}
• Conversões:       ${kpis.total_conversions}
• Impressões:       ${kpis.total_impressions.toLocaleString('pt-BR')}
• Cliques:          ${kpis.total_clicks.toLocaleString('pt-BR')}
• Leads:            ${kpis.total_leads}

CRIATIVOS VENCEDORES:
${winnersText}

CRIATIVOS PERDEDORES:
${losersText}

DECISÕES TOMADAS:
${decisionsText}

Analise esses dados e gere o relatório executivo completo no formato JSON especificado.`

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2500,
      messages: [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const raw = response.choices[0].message.content ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      return new Response(
        JSON.stringify({ error: 'Resposta inválida do modelo.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response(match[0], {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
