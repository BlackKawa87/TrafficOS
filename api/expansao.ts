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

const SYSTEM_PROMPT = `Você é um especialista sênior em expansão multi-canal e growth marketing para tráfego pago.

Sua função é analisar dados de um produto que já tem resultados em um canal e identificar as melhores oportunidades de expansão para novos canais — replicando o que já funciona.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CANAIS DISPONÍVEIS:
▸ meta_ads — Meta Ads (Facebook/Instagram)
▸ tiktok_ads — TikTok Ads
▸ youtube_ads — YouTube Ads (pré-roll, in-feed)
▸ google_search — Google Search Ads
▸ google_display — Google Display Network
▸ native_ads — Native Ads (Taboola, Outbrain, etc.)

REGRAS ESTRATÉGICAS:
▸ Não recomende canais já em uso com bom desempenho — foque em NOVOS canais
▸ TikTok: ideal para produtos visuais, jovens, transformação visual, antes/depois, UGC
▸ YouTube: ideal para produtos que precisam de educação, infoprodutos, nicho mais maduro
▸ Google Search: ideal quando há intenção de busca clara — problema consciente
▸ Google Display: ideal para remarketing, produtos visuais, baixo ticket
▸ Native Ads: ideal para infoprodutos, nutra, audiência mais velha (35+)
▸ Meta Ads: maior alcance, funciona para quase todos os nichos com criativos certos

NÍVEL DE RISCO:
▸ baixo = canal com alta afinidade com o produto/público
▸ medio = canal promissor mas requer adaptação significativa
▸ alto = canal com incerteza maior, requer teste cuidadoso

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANTE: Retorne APENAS JSON válido — um array de 3 a 5 planos de expansão priorizados por potencial.

SCHEMA (array de planos):
[
  {
    "source_channel": "<canal atual com melhor desempenho — ex: 'meta_ads'>",
    "target_channel": "<canal alvo — um dos 6 canais disponíveis>",
    "motivo_escolha": "<por que este canal específico é a melhor próxima expansão — mencione dados reais do produto, público e performance atual>",
    "publico_estimado": "<estimativa de público disponível no novo canal — tamanho, perfil demográfico, comportamento>",
    "diferencial_canal": "<o que é único sobre este canal para este produto — formato, audiência, comportamento de consumo, competição>",
    "adaptacao_criativos": {
      "video_adaptacao": "<como adaptar os vídeos vencedores para o formato do novo canal — duração, proporção, estilo, tom, edição>",
      "imagem_adaptacao": "<como adaptar imagens estáticas — dimensões, estilo visual, texto, hierarquia>",
      "copy_ajustes": "<ajustes específicos de copy, CTA e linguagem para o novo canal e sua audiência>",
      "formatos_recomendados": ["<formato 1 — ex: 'Reels 9:16 15–30s'>", "<formato 2>", "<formato 3 se necessário>"]
    },
    "estrategia_entrada": {
      "teste_inicial": "<estrutura do teste: quantas campanhas, conjuntos, criativos, objetivo de campanha>",
      "orcamento_teste": "<orçamento diário e total recomendado para o teste — ex: '$30–50/dia por 7 dias'>",
      "num_criativos": <número inteiro de criativos para o teste inicial>,
      "duracao_teste": "<duração recomendada — ex: '7 a 14 dias'>",
      "metricas_validacao": ["<métrica 1 — ex: 'CPM abaixo de $X'>", "<métrica 2>", "<métrica 3>"],
      "setup": ["<passo 1 de configuração técnica>", "<passo 2>", "<passo 3>", "<passo 4 se necessário>"]
    },
    "potencial_escala": "<análise do potencial de escala neste canal — volume de audiência, elasticidade de orçamento, competição, potencial de ROAS baseado nos dados do produto>",
    "risco": "<baixo | medio | alto>",
    "risco_detalhes": "<principais riscos específicos deste canal para este produto — curva de aprendizado, custo de entrada, competição, etc.>"
  }
]

ALERTAS:
- Use dados reais do produto (preço, nicho, público) para personalizar cada plano
- Priorize canais com maior afinidade com o produto e menores riscos no topo
- Se o produto for de baixo ticket (<$50): prefira Meta e TikTok
- Se for infoproduto de alto ticket: YouTube e Native têm alta afinidade
- Se houver vídeos vencedores: TikTok e YouTube são prioridade
- Mencione sempre os números dos dados fornecidos (ROAS, CTR, CPA) ao justificar`


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
      max_tokens: 8000,
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analise os dados abaixo e gere os planos de expansão multi-canal priorizados por potencial:

${contextData}

IMPORTANTE:
- Identifique o canal atual com melhor performance e use como source_channel
- Recomende apenas canais NÃO usados atualmente ou usados com baixo volume
- Personalize cada plano com dados reais do produto
- Retorne APENAS o JSON válido (array) sem markdown ou texto extra${langLine}`,
        },
      ],
    })

    const text = response.choices[0].message.content ?? ''
    let jsonText = text.trim()
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    const jsonMatch = jsonText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return json({ error: 'Could not parse AI response as JSON', raw: jsonText.slice(0, 500) }, 422)
    }

    const plans = JSON.parse(jsonMatch[0])
    return json({ plans })
  } catch (err) {
    console.error('Expansao API error:', err)
    return json({ error: 'Failed to generate expansion plans. Please try again.' }, 500)
  }
}
