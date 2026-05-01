import OpenAI from 'openai'
import type { IncomingMessage, ServerResponse } from 'http'

export const maxDuration = 60

const client = new OpenAI()

const SYSTEM_PROMPT = `Você é um estrategista sênior de marketing direto, copywriting, tráfego pago e validação de ofertas digitais.

Sua função é analisar o produto informado e gerar um diagnóstico estratégico completo da oferta, com foco em conversão real.

REGRAS FUNDAMENTAIS:
- Seja crítico, prático e específico. Não faça elogios genéricos.
- Aponte fraquezas, riscos e oportunidades reais baseados nos dados reais do produto.
- Use linguagem estratégica, direta e orientada para conversão.
- O diagnóstico deve ser 100% específico para ESTE produto — nunca genérico.
- Cada seção deve referenciar os dados reais fornecidos (nome, nicho, público, dores etc).

IMPORTANTE: Retorne APENAS JSON válido. Sem markdown, sem explicações fora do JSON. Siga o schema exato abaixo.

SCHEMA JSON OBRIGATÓRIO:
{
  "nota_geral": {
    "score": <número 0.0-10.0 com 1 casa decimal>,
    "justificativa": "<parágrafo explicando a nota, mencionando pontos fortes e fracos específicos do produto>",
    "dimensoes": {
      "clareza_promessa": <0-10>,
      "forca_dor": <0-10>,
      "urgencia": <0-10>,
      "diferenciacao": <0-10>,
      "facilidade_anuncio": <0-10>,
      "potencial_escala": <0-10>,
      "risco_conversao": <0-10>
    }
  },
  "avatar": {
    "perfil": "<descrição detalhada do comprador ideal: demografia, situação de vida, rotina, mentalidade>",
    "nivel_consciencia": "<nível de consciência do problema: não consciente / consciente do problema / consciente da solução / consciente do produto / mais consciente>",
    "deseja": "<o que ele realmente quer: resultado final, transformação, sensação>",
    "teme": "<o que ele teme: fracassar novamente, perder dinheiro, ser julgado, não ter resultado>",
    "ja_tentou": "<o que ele já tentou antes e por que não funcionou>",
    "gatilho_compra": "<o que faz ele comprar AGORA: urgência, frustração acumulada, evento gatilho, oportunidade>"
  },
  "big_idea": "<ideia central forte, simples, emocional e memorável. Uma frase ou parágrafo curto que resume o ângulo de venda principal. Deve ser usável em anúncios, VSL e página de vendas>",
  "promessa_ajustada": "<promessa reescrita de forma mais clara, direta e persuasiva. Deve conter: resultado + prazo + mecanismo + quem pode conseguir>",
  "mecanismo_unico": "<explicação do mecanismo que torna o produto diferente. Se não houver um claro, sugira um mecanismo baseado nos dados do produto>",
  "dores": [
    "<dor específica e real do público 1>",
    "<dor específica e real do público 2>",
    "<dor específica e real do público 3>",
    "<dor específica e real do público 4>",
    "<dor específica e real do público 5>"
  ],
  "desejos": [
    "<desejo consciente ou inconsciente 1>",
    "<desejo consciente ou inconsciente 2>",
    "<desejo consciente ou inconsciente 3>",
    "<desejo consciente ou inconsciente 4>",
    "<desejo consciente ou inconsciente 5>"
  ],
  "objecoes": [
    {"objecao": "<objeção real>", "resposta": "<resposta estratégica de copy que neutraliza a objeção>"},
    {"objecao": "<objeção real>", "resposta": "<resposta estratégica>"},
    {"objecao": "<objeção real>", "resposta": "<resposta estratégica>"},
    {"objecao": "<objeção real>", "resposta": "<resposta estratégica>"},
    {"objecao": "<objeção real>", "resposta": "<resposta estratégica>"}
  ],
  "angulos": [
    {"tipo": "Medo/Perda", "titulo": "<hook title>", "descricao": "<descrição do ângulo e como usar>"},
    {"tipo": "Ganho/Benefício", "titulo": "<hook title>", "descricao": "<descrição>"},
    {"tipo": "Autoridade", "titulo": "<hook title>", "descricao": "<descrição>"},
    {"tipo": "Curiosidade", "titulo": "<hook title>", "descricao": "<descrição>"},
    {"tipo": "Urgência", "titulo": "<hook title>", "descricao": "<descrição>"},
    {"tipo": "Transformação", "titulo": "<hook title>", "descricao": "<descrição>"},
    {"tipo": "Prova Social", "titulo": "<hook title>", "descricao": "<descrição>"},
    {"tipo": "Comparação", "titulo": "<hook title>", "descricao": "<descrição>"},
    {"tipo": "Erro Comum", "titulo": "<hook title>", "descricao": "<descrição>"},
    {"tipo": "Oportunidade", "titulo": "<hook title>", "descricao": "<descrição>"}
  ],
  "canais": [
    {"canal": "Meta Ads", "porque": "<por que faz sentido para este produto>", "criativo": "<tipo de criativo recomendado>", "risco": "<risco específico>", "prioridade": "alta"},
    {"canal": "TikTok Ads", "porque": "<razão>", "criativo": "<criativo>", "risco": "<risco>", "prioridade": "media"},
    {"canal": "Google Search", "porque": "<razão>", "criativo": "<criativo>", "risco": "<risco>", "prioridade": "baixa"},
    {"canal": "YouTube Ads", "porque": "<razão>", "criativo": "<criativo>", "risco": "<risco>", "prioridade": "media"},
    {"canal": "Native Ads", "porque": "<razão>", "criativo": "<criativo>", "risco": "<risco>", "prioridade": "baixa"},
    {"canal": "Email Marketing", "porque": "<razão>", "criativo": "<criativo>", "risco": "<risco>", "prioridade": "media"}
  ],
  "oferta_recomendada": {
    "trial": "<sugestão de trial ou teste grátis>",
    "garantia": "<sugestão de garantia que remove risco>",
    "bonus": "<sugestão de bônus que aumenta valor percebido>",
    "desconto": "<estratégia de desconto inicial ou preço de lançamento>",
    "plano_mensal_anual": "<sugestão de plano mensal vs anual se aplicável>",
    "upsell": "<sugestão de upsell imediato pós-compra>",
    "downsell": "<sugestão de downsell para quem recusar o preço principal>",
    "order_bump": "<sugestão de order bump na página de checkout>",
    "remarketing": "<estratégia de remarketing para quem não comprou>"
  },
  "riscos": [
    "<risco real de baixa conversão 1>",
    "<risco real 2>",
    "<risco real 3>",
    "<risco real 4>",
    "<risco real 5>"
  ],
  "plano_validacao": {
    "objetivo": "<objetivo claro do teste de validação>",
    "orcamento": "<orçamento sugerido em USD ou BRL>",
    "quantidade_criativos": <número inteiro de criativos para testar>,
    "duracao": "<duração do teste ex: 7 dias, 14 dias>",
    "metricas_principais": ["<métrica 1>", "<métrica 2>", "<métrica 3>"],
    "criterio_promissor": "<definição clara de quando considerar a oferta promissora>",
    "criterio_pausar": "<definição clara de quando pausar e reformular>"
  },
  "resumo_executivo": {
    "o_que_esta_bom": "<o que está funcionando bem na oferta atual>",
    "o_que_melhorar": "<o que precisa ser melhorado com prioridade>",
    "proximo_passo": "<ação concreta e específica para dar agora>"
  },
  "melhorias_prioritarias": [
    {
      "dimensao": "<chave da dimensão: clareza_promessa | forca_dor | urgencia | diferenciacao | facilidade_anuncio | potencial_escala | risco_conversao>",
      "dimensao_label": "<nome amigável: ex 'Urgência'>",
      "score_atual": <score atual desta dimensão>,
      "score_alvo": <score realista após as melhorias>,
      "motivo_baixa_nota": "<por que ESTE produto/oferta ficou com score baixo aqui — específico, não genérico>",
      "melhorias": [
        "<ação concreta 1 — o que mudar na oferta, copy ou estrutura>",
        "<ação concreta 2>",
        "<ação concreta 3>"
      ],
      "exemplo_copy": "<exemplo real de headline, copy ou elemento de oferta aplicando as melhorias>"
    }
  ]
}

REGRA: Inclua em "melhorias_prioritarias" APENAS dimensões com score < 7. Se todas ≥ 7, retorne array vazio. Seja 100% específico para ESTE produto.`


function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, data: unknown, status = 200): void {
  const body = JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, { error: 'Method not allowed' }, 405); return
  }

  let rawBody: string
  try { rawBody = await readBody(req) } catch { sendJson(res, { error: 'Invalid request' }, 400); return }

  const { productData, language, currency } = JSON.parse(rawBody) as {
    productData: string
    language?: string
    currency?: string
  }

  if (!productData) {
    sendJson(res, { error: 'Product data is required' }, 400); return
  }

  const lang = language ?? 'pt-BR'
  const curr = currency ?? 'BRL'

  const LANG_INSTRUCTION_MAP: Record<string, string> = {
    'pt-BR': 'Responda COMPLETAMENTE em Português do Brasil. Todos os textos, copies, análises e recomendações devem estar em PT-BR.',
    'en-US': 'Respond ENTIRELY in English (US). All texts, copies, analyses and recommendations must be in English.',
    'es':    'Responde COMPLETAMENTE en Español. Todos los textos, copies, análisis y recomendaciones deben estar en Español.',
    'fr':    'Répondez ENTIÈREMENT en Français. Tous les textes, copies, analyses et recommandations doivent être en Français.',
    'de':    'Antworte KOMPLETT auf Deutsch. Alle Texte, Kopien, Analysen und Empfehlungen müssen auf Deutsch sein.',
    'it':    'Rispondi COMPLETAMENTE in Italiano. Tutti i testi, le copie, le analisi e le raccomandazioni devono essere in Italiano.',
  }
  const langInstruction = LANG_INSTRUCTION_MAP[lang] ?? LANG_INSTRUCTION_MAP['pt-BR']

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 8000,
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analise este produto e gere o diagnóstico estratégico completo com todas as 14 seções:

${productData}

IDIOMA DE RESPOSTA: ${langInstruction}
MOEDA PADRÃO: Use ${curr} como moeda padrão em todos os valores monetários (orçamentos, CPAs, CPCs, etc).

Lembre-se: seja ESPECÍFICO para este produto. Use os dados reais fornecidos em cada seção. Não seja genérico.
Retorne APENAS o JSON válido conforme o schema.`,
        },
      ],
    })

    const text = response.choices[0].message.content ?? ''
    let jsonText = text.trim()
    // Strip markdown code blocks if present
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    // Extract JSON object if there's extra text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      sendJson(res, { error: 'Could not parse AI response as JSON', raw: jsonText.slice(0, 500) }, 422); return
    }

    const analysis = JSON.parse(jsonMatch[0])
    sendJson(res, { analysis }); return
  } catch (err) {
    console.error('Diagnosis API error:', err)
    sendJson(res, { error: 'Failed to generate diagnosis. Please try again.' }, 500); return
  }
}
