import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

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
  }
}`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { productData } = req.body as { productData: string }

  if (!productData) {
    return res.status(400).json({ error: 'Product data is required' })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analise este produto e gere o diagnóstico estratégico completo com todas as 14 seções:

${productData}

Lembre-se: seja ESPECÍFICO para este produto. Use os dados reais fornecidos em cada seção. Não seja genérico.
Retorne APENAS o JSON válido conforme o schema.`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return res.status(500).json({ error: 'Unexpected response type from AI' })
    }

    let jsonText = content.text.trim()
    // Strip markdown code blocks if present
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    // Extract JSON object if there's extra text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(422).json({ error: 'Could not parse AI response as JSON', raw: jsonText.slice(0, 500) })
    }

    const analysis = JSON.parse(jsonMatch[0])
    return res.status(200).json({ analysis })
  } catch (err) {
    console.error('Diagnosis API error:', err)
    return res.status(500).json({ error: 'Failed to generate diagnosis. Please try again.' })
  }
}
