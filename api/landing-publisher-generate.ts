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

const SYSTEM_PROMPT = `Você é um especialista em copywriting de resposta direta e criação de landing pages de alta conversão para tráfego pago. Escreva copy específica, baseada nos dados do produto, sem generalidades.

RETORNE APENAS JSON válido com a estrutura abaixo:

{
  "meta_title": "<título da página para SEO — inclui produto e benefício principal>",
  "meta_description": "<descrição de 155 caracteres para SEO>",

  "hero_headline": "<manchete principal — promessa específica e irresistível, máx 10 palavras>",
  "hero_subheadline": "<subheadline complementar — mecanismo + público + resultado, 1-2 frases>",
  "hero_cta_text": "<texto do botão CTA — ação + benefício, ex: 'Quero Acesso Agora'>",
  "hero_secondary_text": "<texto abaixo do CTA — reduz fricção, ex: 'Sem riscos. Garantia de 30 dias.'>",

  "problem_headline": "<manchete da seção problema — uma pergunta ou afirmação sobre a dor>",
  "problem_items": ["<problema 1 específico>", "<problema 2>", "<problema 3>"],

  "solution_headline": "<manchete da solução — apresenta o produto como a resposta>",
  "solution_description": "<descrição da solução em 2-3 frases, foca no mecanismo único>",
  "solution_mechanism": "<o mecanismo único que diferencia — 1 frase>",

  "benefits_headline": "<manchete da seção de benefícios>",
  "benefits": [
    { "icon": "✅", "title": "<benefício 1>", "description": "<descrição curta do benefício>" },
    { "icon": "🚀", "title": "<benefício 2>", "description": "<descrição>" },
    { "icon": "💰", "title": "<benefício 3>", "description": "<descrição>" },
    { "icon": "⚡", "title": "<benefício 4>", "description": "<descrição>" },
    { "icon": "🎯", "title": "<benefício 5>", "description": "<descrição>" },
    { "icon": "🔥", "title": "<benefício 6>", "description": "<descrição>" }
  ],

  "proof_headline": "<manchete de prova social>",
  "testimonials": [
    { "name": "<nome realista>", "role": "<cargo/perfil>", "text": "<depoimento específico com resultado>", "result": "<resultado concreto em destaque, ex: +47% de conversão>" },
    { "name": "<nome>", "role": "<perfil>", "text": "<depoimento>", "result": "<resultado>" },
    { "name": "<nome>", "role": "<perfil>", "text": "<depoimento>", "result": "<resultado>" }
  ],
  "results_stat": "<estatística de resultado geral, ex: '+2.847 clientes em 90 dias'>",

  "offer_headline": "<manchete da oferta — cria urgência e valor>",
  "offer_price": "<preço atual formatado, ex: 'R$ 297'>",
  "offer_original_price": "<preço riscado, ex: 'R$ 997'>",
  "offer_items": ["<item incluído 1>", "<item 2>", "<item 3>", "<item 4>", "<item 5>"],
  "offer_cta_text": "<texto do CTA da oferta>",
  "offer_urgency": "<texto de urgência, ex: 'Oferta válida até hoje' ou 'Últimas 12 vagas'>",

  "guarantee_headline": "<manchete da garantia>",
  "guarantee_text": "<texto completo da garantia — remove risco e objeção>",
  "guarantee_days": 30,

  "faq_headline": "<manchete do FAQ>",
  "faq": [
    { "question": "<pergunta frequente real 1>", "answer": "<resposta direta e convincente>" },
    { "question": "<pergunta 2>", "answer": "<resposta>" },
    { "question": "<pergunta 3>", "answer": "<resposta>" },
    { "question": "<pergunta 4>", "answer": "<resposta>" },
    { "question": "<pergunta 5>", "answer": "<resposta>" }
  ],

  "final_headline": "<manchete final de CTA — resumo da transformação>",
  "final_subheadline": "<subheadline final — última chance, urgência>",
  "final_cta_text": "<texto do botão CTA final>",

  "primary_color": "<cor hex primary baseada no design style pedido>",
  "accent_color": "<cor hex de acento/destaque>"
}

REGRAS:
- Use os dados REAIS do produto. Nenhum texto genérico.
- O hero_headline deve ser a promessa mais forte e específica possível
- Os testimonials devem ser realistas para o nicho — com resultados plausíveis e específicos
- A offer deve mostrar valor stackeado — o que está incluído, não apenas o preço
- O FAQ deve responder as objeções reais do público deste produto
- primary_color para dark_modern: #7c3aed; clean_white: #2563eb; bold_energy: #f59e0b
- accent_color para dark_modern: #10b981; clean_white: #059669; bold_energy: #ef4444`


const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const { context } = (await req.json()) as { context: string }

  if (!context) {
    return json({ error: 'Context required' }, 400)
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4000,
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Gere toda a copy da landing page com base nos dados abaixo:

${context}

Retorne APENAS o JSON válido sem markdown, sem texto extra, sem comentários.`,
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
    console.error('Landing publisher generate error:', err)
    return json({ error: 'Failed to generate landing page. Please try again.' }, 500)
  }
}
