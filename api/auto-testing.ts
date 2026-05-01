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

const SYSTEM_PROMPT = `Você é um especialista em criação de criativos de alta conversão para tráfego pago (Meta Ads, TikTok Ads).

Sua função é analisar um criativo base e gerar variações estratégicas diferenciadas para um teste A/B automatizado.

Cada variação deve ser substantivamente diferente do original e das demais — não apenas palavras trocadas, mas abordagens genuinamente distintas.

RETORNE APENAS JSON válido com esta estrutura exata:

{
  "hooks": [
    {
      "texto": "<hook completo e específico, 5–15 palavras, pronto para usar no anúncio>",
      "tipo": "<pergunta | alerta | curiosidade | identificacao | transformacao | choque | controversia>",
      "emocao": "<emoção primária: curiosidade | medo | esperança | ganância | raiva | surpresa | inveja>",
      "estrategia": "<em 1 frase: por que este hook deve parar o scroll>"
    }
  ],
  "abordagens": [
    {
      "nome": "<nome do ângulo de venda, ex: Transformação, Autoridade, Problema-Agitação-Solução>",
      "descricao": "<descrição do ângulo em 1-2 frases>",
      "roteiro": "<roteiro completo da abordagem — Hook → Problema → Solução → CTA, 60–120 palavras>",
      "diferencial": "<o que diferencia substantivamente do criativo original>"
    }
  ],
  "ctas": [
    {
      "texto": "<texto exato do botão/CTA, máximo 8 palavras>",
      "estilo": "<urgencia | beneficio | curiosidade | social_proof | comando | exclusividade>",
      "contexto": "<em 1 frase: quando e por que usar este CTA>"
    }
  ],
  "estilos_visuais": [
    {
      "nome": "<nome do estilo, ex: Minimalista Clean, UGC Autêntico, Apresentação de Dados>",
      "descricao": "<descrição visual detalhada — o que o espectador vê nos primeiros 3 segundos>",
      "cores_predominantes": "<paleta descrita: ex: branco + azul escuro + acento vermelho>",
      "elementos_chave": "<elementos visuais principais: pessoas, gráficos, produto, texto na tela, etc.>",
      "mood": "<clean | energético | emocional | profissional | urgente | confiável | jovem>"
    }
  ]
}

REGRAS OBRIGATÓRIAS:
- Gere EXATAMENTE 5 hooks, 3 abordagens, 3 CTAs, 2 estilos visuais
- Os hooks devem cobrir tipos diferentes: não gere dois do mesmo tipo
- Os roteiros das abordagens devem ser completos e prontos para gravar
- Baseie todas as variações nos dados reais do produto fornecidos
- Pense em: o que um gestor de tráfego sênior testaria primeiro para encontrar o vencedor mais rápido?`


const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const { creativeData, productData } = (await req.json()) as { creativeData: string; productData: string }

  if (!creativeData || !productData) {
    return json({ error: 'Creative and product data required' }, 400)
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 6000,
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analise o criativo base e gere variações estratégicas para teste A/B:

PRODUTO:
${productData}

CRIATIVO BASE:
${creativeData}

Retorne APENAS o JSON válido (objeto) sem markdown ou texto extra.`,
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

    return json(JSON.parse(jsonMatch[0]))
  } catch (err) {
    console.error('Auto-testing API error:', err)
    return json({ error: 'Failed to generate variations. Please try again.' }, 500)
  }
}
