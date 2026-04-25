import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

const SYSTEM_PROMPT = `Você é um especialista sênior em criação de criativos para tráfego pago, com foco em Meta Ads, TikTok Ads e YouTube Ads.

Sua função é gerar um briefing criativo completo e pronto para execução, com base nos dados do produto, campanha e configurações escolhidas.

REGRAS:
- Seja específico, prático e orientado a performance real.
- Use os dados reais do produto em todas as seções — nunca gere exemplos genéricos.
- Os roteiros devem ser curtos, diretos e prontos para gravar.
- Os hooks devem parar o scroll nos primeiros 3 segundos.
- Os copies devem ser baseados em dor, desejo ou curiosidade real do público.
- Adapte o tom e a estrutura ao canal e tipo de criativo indicados.

IMPORTANTE: Retorne APENAS JSON válido. Sem markdown, sem texto fora do JSON. Siga o schema exato abaixo.

SCHEMA JSON OBRIGATÓRIO:
{
  "nome": "<nome curto e descritivo — ex: [Produto] | Hook Medo | UGC | Meta>",
  "ideia_central": "<resumo do conceito central do criativo em 2-3 frases. O que o criativo comunica e por que deve funcionar>",
  "hooks": [
    {"tipo": "Pergunta", "texto": "<hook em formato de pergunta provocativa que para o scroll — máx 2 frases>"},
    {"tipo": "Alerta", "texto": "<hook em formato de alerta ou aviso urgente — máx 2 frases>"},
    {"tipo": "Curiosidade", "texto": "<hook que gera curiosidade irresistível — máx 2 frases>"}
  ],
  "roteiro": {
    "hook": "<primeiros 3 segundos — frase exata que será dita ou exibida>",
    "problema": "<5-8 segundos — apresentação direta do problema que o público tem>",
    "agitacao": "<8-15 segundos — agitação da dor: consequências reais de não resolver>",
    "solucao": "<15-22 segundos — apresentação clara da solução e benefício principal>",
    "cta": "<22-30 segundos — chamada para ação específica e urgente>",
    "duracao": "<duração total estimada — ex: 25 segundos>"
  },
  "variacoes_roteiro": [
    {"nome": "Variação 1 — <nome descritivo do ângulo>", "roteiro": "<roteiro completo alternativo com estrutura hook/problema/agitação/solução/CTA condensada>"},
    {"nome": "Variação 2 — <nome descritivo do ângulo>", "roteiro": "<roteiro completo alternativo>"},
    {"nome": "Variação 3 — <nome descritivo do ângulo>", "roteiro": "<roteiro completo alternativo>"}
  ],
  "texto_anuncio": {
    "textos_principais": [
      "<texto principal 1 — copy completo com hook + desenvolvimento + CTA>",
      "<texto principal 2>",
      "<texto principal 3>"
    ],
    "headlines": [
      "<headline 1 — curta e impactante, máx 7 palavras>",
      "<headline 2>",
      "<headline 3>"
    ],
    "descricoes": [
      "<descrição 1 — 1-2 frases que reforçam a promessa>",
      "<descrição 2>",
      "<descrição 3>"
    ],
    "ctas": [
      "<CTA 1 — específico com verbo de ação>",
      "<CTA 2>",
      "<CTA 3>"
    ]
  },
  "direcao_criativa": {
    "como_gravar": "<instruções práticas de gravação — enquadramento, iluminação, posição>",
    "cenario": "<ambiente ideal — ex: mesa de trabalho, fundo neutro, ao ar livre, tela do celular>",
    "tipo_pessoa": "<quem aparece — ex: especialista/fundador falando à câmera, pessoa comum UGC, narrador em off>",
    "estilo": "<estilo de produção — ex: UGC autêntico, autoridade direta, storytelling emocional, demonstração>",
    "tom_voz": "<tom e energia — ex: urgente e sério, empático e casual, confiante e direto>",
    "edicao": "<instruções de edição — ex: cortes rápidos a cada 2s, legendas destacadas, zoom no rosto, música de fundo>"
  },
  "referencia_visual": "<descrição detalhada de como o criativo deve parecer — estilo visual, paleta, referências de marcas ou criativos similares que funcionam>",
  "variacoes_teste": [
    {"tipo": "Troca de Hook", "descricao": "<ideia específica de hook alternativo para testar>"},
    {"tipo": "Troca de CTA", "descricao": "<ideia de CTA diferente que pode melhorar conversão>"},
    {"tipo": "Troca de Abordagem", "descricao": "<abordagem completamente diferente para o mesmo produto>"},
    {"tipo": "Troca de Público", "descricao": "<mesmo criativo adaptado para segmento diferente>"}
  ],
  "hipotese": "<hipótese clara de performance — ex: este criativo deve gerar CTR acima de X% porque o hook de [tipo] tende a parar o scroll do público [descrição] que está no nível de consciência [nível]>",
  "metricas_esperadas": {
    "ctr_esperado": "<CTR esperado com intervalo numérico — ex: 1.5% a 2.5%>",
    "cpc_esperado": "<CPC esperado com valor e moeda — ex: R$0,80 a R$1,50>",
    "cpa_esperado": "<CPA esperado com valor e moeda baseado no preço do produto>"
  },
  "recomendacoes": {
    "quando_usar": "<contexto ideal de uso — fase de teste, objetivo, público frio vs quente>",
    "quando_pausar": "<critério numérico específico para pausar — ex: CTR abaixo de X% após 1000 impressões>",
    "quando_escalar": "<critério numérico para escalar — ex: CPA abaixo de X por 3 dias consecutivos>"
  }
}`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { creativeData } = req.body as { creativeData: string }

  if (!creativeData) {
    return res.status(400).json({ error: 'Creative data is required' })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Crie o briefing criativo completo com todas as 12 seções:

${creativeData}

IMPORTANTE: seja completamente específico para este produto, canal e tipo de criativo. Use os dados reais. Gere roteiros e copies prontos para executar imediatamente.
Retorne APENAS o JSON válido conforme o schema.`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return res.status(500).json({ error: 'Unexpected response type from AI' })
    }

    let jsonText = content.text.trim()
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(422).json({ error: 'Could not parse AI response as JSON', raw: jsonText.slice(0, 500) })
    }

    const strategy = JSON.parse(jsonMatch[0])
    return res.status(200).json({ strategy })
  } catch (err) {
    console.error('Creative API error:', err)
    return res.status(500).json({ error: 'Failed to generate creative. Please try again.' })
  }
}
