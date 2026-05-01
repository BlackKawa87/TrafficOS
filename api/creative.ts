import OpenAI from 'openai'
import type { IncomingMessage, ServerResponse } from 'http'

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

const SYSTEM_PROMPT = `Você é um especialista sênior em criação de criativos para tráfego pago, com foco em Meta Ads, TikTok Ads e YouTube Ads.

Sua função é gerar um briefing criativo COMPLETO e EXECUTÁVEL — pronto para gravar/produzir e subir sem precisar interpretar.

REGRAS GERAIS:
- Seja absolutamente específico. Nada genérico.
- Use os dados reais do produto em todas as seções.
- Adapte o tom e estrutura ao canal e tipo de criativo indicados.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LÓGICA DE PREENCHIMENTO POR TIPO DE CRIATIVO:

▸ Se o Tipo for "Vídeo Curto", "Vídeo Longo", "UGC" ou "Story":
  → Preencha obrigatoriamente: "cenas" (mínimo 6 cenas detalhadas), "direcao_gravacao", "direcao_edicao"
  → NÃO inclua campos "imagem_*" no JSON de saída
  → Roteiro = roteiro de vídeo falado cena a cena

▸ Se o Tipo for "Imagem" ou "Carrossel":
  → Preencha obrigatoriamente: "imagem_tipo", "imagem_layout", "imagem_texto", "imagem_variacoes" (3 variações), "imagem_estilo", "imagem_referencia"
  → NÃO inclua "cenas", "direcao_gravacao", "direcao_edicao" no JSON de saída
  → No campo "roteiro", use como estrutura narrativa da imagem: hook=headline, problema=contexto/dor, agitacao=urgência, solucao=benefício, cta=chamada visual
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANTE: Retorne APENAS JSON válido. Sem markdown, sem texto fora do JSON. Siga o schema abaixo (campos condicionais marcados com [VIDEO] ou [IMAGEM]).

SCHEMA JSON:
{
  "nome": "<nome curto: [Produto] | [tipo] | [ângulo] | [canal]>",
  "ideia_central": "<resumo do conceito em 2-3 frases — o que comunica e por que deve converter>",
  "hooks": [
    {"tipo": "Pergunta", "texto": "<hook em pergunta que para o scroll — máx 2 frases>"},
    {"tipo": "Alerta", "texto": "<hook em alerta urgente — máx 2 frases>"},
    {"tipo": "Curiosidade", "texto": "<hook com curiosidade irresistível — máx 2 frases>"}
  ],
  "roteiro": {
    "hook": "<para vídeo: frase EXATA dita 0-3s | para imagem: headline da imagem>",
    "problema": "<para vídeo: problema 3-8s | para imagem: contexto/dor do público>",
    "agitacao": "<para vídeo: agitação 8-15s | para imagem: urgência/consequência>",
    "solucao": "<para vídeo: solução 15-22s | para imagem: benefício principal>",
    "cta": "<para vídeo: CTA 22-30s | para imagem: CTA visual>",
    "duracao": "<para vídeo: duração total | para imagem: '—'>"
  },

  "[VIDEO] cenas": [
    {
      "numero": 1,
      "texto_falado": "<texto EXATO dito em voz alta — palavra por palavra>",
      "texto_tela": "<texto/legenda exibido na tela — ou 'nenhum'>",
      "enquadramento": "<close-up rosto | plano médio | detalhe produto | tela celular | etc>",
      "duracao": "<ex: 0s-3s>",
      "notas": "<instrução visual: 'aponta para câmera', 'mostra tela do app', 'corte rápido'>"
    }
  ],

  "variacoes_roteiro": [
    {"nome": "Variação 1 — <ângulo>", "roteiro": "<roteiro completo alternativo>"},
    {"nome": "Variação 2 — <ângulo>", "roteiro": "<roteiro completo alternativo>"},
    {"nome": "Variação 3 — <ângulo>", "roteiro": "<roteiro completo alternativo>"}
  ],

  "texto_anuncio": {
    "textos_principais": ["<copy 1: hook + desenvolvimento + CTA>", "<copy 2>", "<copy 3>"],
    "headlines": ["<headline 1 — máx 7 palavras>", "<headline 2>", "<headline 3>"],
    "descricoes": ["<descrição 1 — 1-2 frases>", "<descrição 2>", "<descrição 3>"],
    "ctas": ["<CTA 1 — verbo + resultado>", "<CTA 2>", "<CTA 3>"]
  },

  "direcao_criativa": {
    "como_gravar": "<para vídeo: instruções de gravação | para imagem: diretrizes de design>",
    "cenario": "<para vídeo: ambiente | para imagem: background/fundo>",
    "tipo_pessoa": "<para vídeo: quem aparece | para imagem: foto de produto/pessoa/ícone>",
    "estilo": "<estilo geral do criativo>",
    "tom_voz": "<tom e energia>",
    "edicao": "<para vídeo: resumo de edição | para imagem: ajustes finais no design>"
  },

  "[VIDEO] direcao_gravacao": {
    "quem": "<fundador | UGC creator | especialista | narrador em off | ninguém (tela)>",
    "onde": "<local exato: fundo branco | mesa de trabalho | celular selfie | etc>",
    "tom_voz": "<calmo e confiante | urgente e direto | empático | entusiasta | técnico>",
    "expressao": "<séria e focada | sorrindo | olhando para câmera | gesticulando>",
    "equipamento": "<celular em tripé | câmera profissional | screengrab | misto>",
    "observacoes": "<instruções especiais de gravação>"
  },

  "[VIDEO] direcao_edicao": {
    "cortes": "<ritmo: corte a cada 2-3s | jump cut | cenas longas para autoridade>",
    "legendas": "<grande negrito centro | colorida nas palavras-chave | estilo TikTok | sem legenda>",
    "zoom": "<zoom in rápido no hook | zoom out na solução | sem zoom | zoom suave>",
    "musica": "<sem música | instrumental leve 15% vol | motivacional crescente | beat rítmico>",
    "ritmo": "<rápido e urgente | médio e fluido | lento e reflexivo | acelera no CTA>",
    "transicoes": "<corte seco | fade simples | sem transição | whip pan>"
  },

  "[IMAGEM] imagem_tipo": "<print_alerta | antes_depois | prova_social | erro_comum | comparacao>",

  "[IMAGEM] imagem_layout": {
    "posicao_titulo": "<onde o título fica: ex: topo centralizado, 20% do topo>",
    "posicao_subtitulo": "<onde o subtítulo fica: ex: logo abaixo do título>",
    "posicao_imagem": "<onde fica a imagem/foto: ex: centro-direita, fundo desfocado>",
    "posicao_cta": "<onde fica o botão/CTA: ex: rodapé centralizado, 80% inferior>",
    "hierarquia_visual": "<o que o olho vê primeiro → segundo → terceiro>",
    "dimensoes": "<ex: 1080x1080px (feed) + 1080x1920px (stories)>",
    "notas_layout": "<instruções especiais de composição>"
  },

  "[IMAGEM] imagem_texto": {
    "headline": "<headline principal — máx 7 palavras, impacto imediato, pronto para a imagem>",
    "subheadline": "<subheadline — 1 frase que reforça a promessa>",
    "cta": "<CTA curto — 2-4 palavras: verbo + benefício>"
  },

  "[IMAGEM] imagem_variacoes": [
    {
      "nome": "Variação 1 — <nome do ângulo>",
      "headline": "<headline alternativo>",
      "angulo": "<ângulo emocional ou racional>",
      "emocao": "<medo | esperança | curiosidade | ganância | urgência>"
    },
    {
      "nome": "Variação 2 — <nome>",
      "headline": "<headline alternativo>",
      "angulo": "<ângulo>",
      "emocao": "<emoção>"
    },
    {
      "nome": "Variação 3 — <nome>",
      "headline": "<headline alternativo>",
      "angulo": "<ângulo>",
      "emocao": "<emoção>"
    }
  ],

  "[IMAGEM] imagem_estilo": {
    "fundo": "<cor sólida | degradê | foto desfocada | padrão geométrico | cor HEX>",
    "estilo": "<minimalista clean | urgência (vermelho/laranja) | profissional dark | colorido vibrante>",
    "fonte": "<sans-serif bold | serifada elegante | display impactante | handwritten>",
    "contraste": "<título branco em fundo escuro | texto escuro em fundo claro | etc>",
    "elementos_visuais": "<ícones, setas, badge desconto, foto produto, pessoa, moldura destaque>"
  },

  "[IMAGEM] imagem_referencia": {
    "descricao": "<descrição visual completa do que o designer deve recriar>",
    "instrucoes_canva": "<passo a passo no Canva: qual template base + onde mudar cada elemento>",
    "cores_hex": ["#hex1", "#hex2", "#hex3"],
    "exemplos_visuais": "<descreva 2-3 marcas ou criativos que usam este estilo como referência>"
  },

  "referencia_visual": "<descrição detalhada do visual — estilo, paleta, referências que funcionam>",
  "variacoes_teste": [
    {"tipo": "Troca de Hook", "descricao": "<hook/headline alternativo específico>"},
    {"tipo": "Troca de CTA", "descricao": "<CTA diferente>"},
    {"tipo": "Troca de Abordagem", "descricao": "<ângulo completamente diferente>"},
    {"tipo": "Troca de Público", "descricao": "<mesmo criativo para segmento diferente>"}
  ],
  "hipotese": "<hipótese de performance com CTR/CPA esperado e motivo>",
  "metricas_esperadas": {
    "ctr_esperado": "<CTR com intervalo — ex: 1.5% a 2.5%>",
    "cpc_esperado": "<CPC com moeda — ex: R$0,80 a R$1,50>",
    "cpa_esperado": "<CPA baseado no preço do produto>"
  },
  "recomendacoes": {
    "quando_usar": "<contexto ideal — fase, objetivo, público frio vs quente>",
    "quando_pausar": "<critério numérico — ex: CTR abaixo de X% após 1000 impressões>",
    "quando_escalar": "<critério numérico — ex: CPA abaixo de X por 3 dias consecutivos>"
  }
}

LEMBRE: remova os marcadores [VIDEO] e [IMAGEM] das chaves no JSON de saída. Inclua apenas os campos relevantes para o tipo detectado.`


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

  const { creativeData, language } = JSON.parse(rawBody) as { creativeData: string; language?: string }

  const langLine = language && language !== 'pt-BR'
    ? `\n\nIDIOMA DE RESPOSTA: ${LANG_MAP[language] ?? LANG_MAP['pt-BR']}`
    : ''

  if (!creativeData) {
    sendJson(res, { error: 'Creative data is required' }, 400); return
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 8000,
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Crie o briefing criativo COMPLETO e EXECUTÁVEL para o tipo indicado:

${creativeData}

IMPORTANTE:
- Detecte o "Tipo" no campo acima e aplique a lógica correta (vídeo vs imagem)
- Para VÍDEO: gere cenas cena a cena, direção de gravação e direção de edição detalhadas
- Para IMAGEM: gere layout exato, texto pronto para imagem, 3 variações, estilo visual e referência Canva
- Seja 100% específico para este produto. Nada genérico.
- Retorne APENAS o JSON válido conforme o schema, sem os marcadores [VIDEO] ou [IMAGEM] nas chaves.${langLine}`,
        },
      ],
    })

    const text = response.choices[0].message.content ?? ''
    let jsonText = text.trim()
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      sendJson(res, { error: 'Could not parse AI response as JSON', raw: jsonText.slice(0, 500) }, 422); return
    }

    const strategy = JSON.parse(jsonMatch[0])
    sendJson(res, { strategy }); return
  } catch (err) {
    console.error('Creative API error:', err)
    sendJson(res, { error: 'Failed to generate creative. Please try again.' }, 500); return
  }
}
