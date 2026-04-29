import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const {
    copy_text,
    headline,
    offer_description,
    landing_url,
    claims,
    niche,
    platforms,
    product_name,
  } = await req.json() as {
    copy_text: string
    headline: string
    offer_description: string
    landing_url: string
    claims: string[]
    niche: string
    platforms: string[]
    product_name?: string
  }

  const client = new Anthropic()

  const systemPrompt = `Você é um especialista sênior em políticas de publicidade das principais plataformas digitais: Meta Ads (Facebook/Instagram), TikTok Ads, Google Ads, YouTube Ads e Native Ads (Taboola/Outbrain).

Sua função é analisar copies de anúncios, headlines, ofertas e claims em busca de violações de políticas e riscos reais de reprovação, suspensão ou banimento de conta publicitária.

Você conhece profundamente as políticas de:
- Meta: política de conteúdo enganoso, afirmações de saúde/beleza, linguagem de "antes e depois", segmentação por características pessoais, garantias absolutas
- TikTok: conteúdo sensível, afirmações médicas ou financeiras, linguagem de urgência extrema, público jovem
- Google: frases não verificáveis, superlativos sem comprovação, afirmações de saúde, produtos regulados
- YouTube: claims de resultados garantidos, conteúdo de saúde não regulamentado, autoridade médica indevida
- Native Ads: clickbait, afirmações exageradas, linguagem sensacionalista, imagens enganosas implícitas

Retorne SOMENTE um objeto JSON válido, sem texto extra antes ou depois, com esta estrutura exata:

{
  "risk_score": <inteiro de 0 a 10>,
  "status": <"seguro" | "atencao" | "alto_risco" | "nao_recomendado">,
  "summary": "<resumo executivo em 2-3 frases diretas>",
  "issues": [
    {
      "type": <"promessa_exagerada" | "claim_sensivel" | "antes_depois" | "linguagem_agressiva" | "segmentacao_sensivel" | "conteudo_saude" | "conteudo_financeiro" | "conteudo_juridico" | "autoridade_indevida" | "garantia_absoluta" | "risco_reprovacao" | "outro">,
      "severity": <"baixo" | "medio" | "alto" | "critico">,
      "description": "<descrição clara e específica do problema>",
      "excerpt": "<trecho exato do texto problemático ou 'Oferta geral' se não houver trecho>",
      "suggestion": "<versão alternativa segura e eficaz para este trecho específico>"
    }
  ],
  "platform_recs": [
    {
      "platform": "meta_ads",
      "allowed": <true | false>,
      "risk_level": <"baixo" | "medio" | "alto" | "reprovado">,
      "specific_issues": ["<issue específico desta plataforma>"],
      "recommendations": ["<ação específica recomendada para esta plataforma>"]
    },
    {
      "platform": "tiktok_ads",
      "allowed": <true | false>,
      "risk_level": <"baixo" | "medio" | "alto" | "reprovado">,
      "specific_issues": ["<issue específico>"],
      "recommendations": ["<recomendação>"]
    },
    {
      "platform": "google_ads",
      "allowed": <true | false>,
      "risk_level": <"baixo" | "medio" | "alto" | "reprovado">,
      "specific_issues": ["<issue específico>"],
      "recommendations": ["<recomendação>"]
    },
    {
      "platform": "youtube_ads",
      "allowed": <true | false>,
      "risk_level": <"baixo" | "medio" | "alto" | "reprovado">,
      "specific_issues": ["<issue específico>"],
      "recommendations": ["<recomendação>"]
    },
    {
      "platform": "native_ads",
      "allowed": <true | false>,
      "risk_level": <"baixo" | "medio" | "alto" | "reprovado">,
      "specific_issues": ["<issue específico>"],
      "recommendations": ["<recomendação>"]
    }
  ],
  "safe_copy_version": "<versão completa e segura da copy do anúncio, mantendo o poder de conversão>",
  "safe_headline_version": "<versão segura da headline, persuasiva mas dentro das políticas>",
  "safe_offer_version": "<versão segura da descrição da oferta, sem claims problemáticos>",
  "general_recommendations": [
    "<recomendação prática e específica>"
  ],
  "what_to_remove": [
    "<elemento específico a remover e por quê>"
  ],
  "what_to_keep": [
    "<elemento forte que deve ser mantido e por quê>"
  ]
}

Critérios de pontuação de risco (risk_score):
- 0-2: Seguro — aprovado em todas as plataformas sem ajustes → status: "seguro"
- 3-4: Atenção — pequenos ajustes recomendados para segurança máxima → status: "atencao"
- 5-6: Risco moderado — reprovação possível em 1-2 plataformas → status: "atencao"
- 7-8: Alto risco — reprovação provável em maioria das plataformas → status: "alto_risco"
- 9-10: Não recomendado — reprovação quase certa + risco de conta → status: "nao_recomendado"

Se não houver problemas identificados, retorne issues como array vazio e platform_recs todas com allowed: true e risk_level: "baixo".`

  const platformsStr = (platforms ?? []).length > 0
    ? (platforms as string[]).join(', ')
    : 'Todas as plataformas'

  const claimsStr = Array.isArray(claims) && claims.length > 0
    ? `\nClaims e promessas específicas:\n${(claims as string[]).map((c: string) => `• ${c}`).join('\n')}`
    : ''

  const userPrompt = `Analise este anúncio para compliance com políticas de publicidade.

Nicho: ${niche || 'Não informado'}${product_name ? `\nProduto: ${product_name}` : ''}
Plataformas alvo: ${platformsStr}

HEADLINE:
${headline || '(não informada)'}

COPY DO ANÚNCIO:
${copy_text || '(não informada)'}

DESCRIÇÃO DA OFERTA:
${offer_description || '(não informada)'}

${landing_url ? `LANDING PAGE: ${landing_url}` : ''}${claimsStr}

Analise todos os elementos acima e retorne o JSON de compliance completo. Seja específico, direto e prático nas sugestões.`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
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
