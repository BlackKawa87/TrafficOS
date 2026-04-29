import Anthropic from '@anthropic-ai/sdk'

export const config = { runtime: 'edge' }

export const maxDuration = 60

const client = new Anthropic()

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
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [
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

    const content = message.content[0]
    if (content.type !== 'text') {
      return json({ error: 'Unexpected response type from AI' }, 500)
    }

    let jsonText = content.text.trim()
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
