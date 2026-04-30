import Anthropic from '@anthropic-ai/sdk'
import type { IncomingMessage, ServerResponse } from 'http'

// Serverless Function — needs time for Claude strategy step + 5 Ideogram calls
export const maxDuration = 60

// ─── Clients ──────────────────────────────────────────────────────────────────
const anthropic     = new Anthropic()
const IDEOGRAM_KEY  = process.env.IDEOGRAM_API_KEY ?? ''
const IDEOGRAM_URL  = 'https://api.ideogram.ai/generate'

type IdeogramAspect = 'ASPECT_1_1' | 'ASPECT_9_16' | 'ASPECT_16_9'

function getAspect(type: string): IdeogramAspect {
  if (type === 'story')                                           return 'ASPECT_9_16'
  if (type === 'video_curto' || type === 'video_longo')          return 'ASPECT_16_9'
  return 'ASPECT_1_1'
}

// ─── Creative brief types ─────────────────────────────────────────────────────
interface CreativeBrief {
  id:               number
  nome:             string
  angulo:           string
  headline:         string
  subtexto:         string
  cta:              string
  prompt_ideogram:  string
}

interface StrategyResponse {
  criativos: CreativeBrief[]
}

// ─── Step 1: Claude behavioral mapping + 5 creative briefs ────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateCreativeStrategy(productName: string, niche: string, strategy: any): Promise<CreativeBrief[]> {

  // Pull all available context from the existing creative strategy
  const ideia         = strategy?.ideia_central              ?? ''
  const hipotese      = strategy?.hipotese                   ?? ''
  const hooks         = (strategy?.hooks ?? []).map((h: Record<string, string>) => `${h.tipo}: ${h.texto}`).join('\n')
  const roteiro       = strategy?.roteiro
  const direcao       = strategy?.direcao_criativa
  const texto         = strategy?.texto_anuncio
  const recomendacoes = strategy?.recomendacoes
  const variacoes     = strategy?.variacoes_teste ?? []

  const contextBlock = `
PRODUTO: ${productName}
NICHO: ${niche}

IDEIA CENTRAL DO CRIATIVO: ${ideia}
HIPÓTESE: ${hipotese}

HOOKS GERADOS:
${hooks}

ROTEIRO BASE:
- Hook: ${roteiro?.hook ?? ''}
- Problema: ${roteiro?.problema ?? ''}
- Agitação: ${roteiro?.agitacao ?? ''}
- Solução: ${roteiro?.solucao ?? ''}
- CTA: ${roteiro?.cta ?? ''}

DIREÇÃO CRIATIVA:
- Cenário: ${direcao?.cenario ?? ''}
- Tipo de pessoa: ${direcao?.tipo_pessoa ?? ''}
- Estilo: ${direcao?.estilo ?? ''}
- Tom de voz: ${direcao?.tom_voz ?? ''}

COPIES DISPONÍVEIS:
- Textos principais: ${(texto?.textos_principais ?? []).slice(0, 2).join(' | ')}
- Headlines: ${(texto?.headlines ?? []).slice(0, 3).join(' | ')}
- CTAs: ${(texto?.ctas ?? []).join(' | ')}

VARIAÇÕES DE TESTE:
${variacoes.map((v: Record<string, string>) => `${v.tipo}: ${v.descricao}`).join('\n')}

QUANDO USAR: ${recomendacoes?.quando_usar ?? ''}
`.trim()

  const systemPrompt = `Você é um especialista em comportamento do consumidor, copywriter de resposta direta e estrategista de Facebook Ads com 15 anos de experiência.

Sua tarefa é analisar os dados de um produto e criar 5 criativos estratégicos para Facebook Ads com ângulos psicológicos distintos.

REGRAS ABSOLUTAS:
- Headlines: máximo 6 palavras, impacto imediato
- Subtexto: máximo 12 palavras, complementa sem repetir
- CTA: máximo 3 palavras
- Prompts do Ideogram: em inglês, específicos, prontos para gerar uma imagem de anúncio profissional
- Sem clichês ("transforme sua vida", "mude agora", "oportunidade única")
- Sem claims exagerados ou sensíveis
- O criativo deve parecer conteúdo nativo, não propaganda óbvia

Responda APENAS com JSON válido no formato abaixo, sem texto adicional:
{
  "criativos": [
    {
      "id": 1,
      "nome": "Dor Consciente",
      "angulo": "dor_consciente",
      "headline": "...",
      "subtexto": "...",
      "cta": "...",
      "prompt_ideogram": "..."
    }
  ]
}`

  const userPrompt = `${contextBlock}

---

ETAPA 1 — MAPEAMENTO COMPORTAMENTAL INTERNO:
Antes de gerar os criativos, responda mentalmente:
1. Qual é a situação de vida exata do cliente no momento em que ele está pronto para comprar?
2. Qual palavra, frase ou cena nos primeiros 3 segundos faria esse cliente parar de rolar o feed?
3. Qual emoção predominante ele sente ANTES de comprar?
4. Qual emoção ele quer sentir DEPOIS de comprar?
5. O que ele já tentou antes e não funcionou?
6. Qual crença limitante impede a compra?
7. Qual sinal visual faria esse público se reconhecer no criativo?
8. Qual promessa pode ser comunicada sem parecer exagerada?

ETAPA 2 — GERE 5 CRIATIVOS com ângulos psicológicos distintos:

Criativo 1 — DOR CONSCIENTE: Focado no problema que o cliente já sabe que tem. Aborda a dor de forma direta mas humana.

Criativo 2 — DESEJO ASPIRACIONAL: Focado na transformação desejada. Mostra o "depois" sem parecer exagerado.

Criativo 3 — QUEBRA DE OBJEÇÃO: Focado na dúvida que impede a compra. Responde à objeção principal antes de ela surgir.

Criativo 4 — IDENTIFICAÇÃO COTIDIANA: Focado em uma cena comum do dia a dia do cliente. Deve parecer conteúdo orgânico, não anúncio.

Criativo 5 — MOMENTO CERTO: Focado no timing — por que agir agora faz sentido. Sem urgência artificial ou pressão agressiva.

PARA CADA CRIATIVO, o prompt_ideogram deve ser em inglês e incluir:
- Formato: "Square Facebook Ads creative"
- Composição exata da imagem
- Texto principal exatamente como deve aparecer (headline em destaque)
- CTA visível no criativo
- Estilo fotográfico ou de design
- Paleta de cores sugerida
- Público implícito na cena
- Emoção que a imagem deve transmitir
- Layout limpo com hierarquia visual clara
- Alta legibilidade
- Aparência de conteúdo nativo de rede social, não banner genérico

Exemplo de prompt_ideogram de qualidade:
"Square Facebook Ads creative, clean modern layout. Bold headline text at top: 'Ainda contratando sem garantia?' in dark navy. Center: professional photo of a stressed HR manager at desk surrounded by unreviewed CVs, warm office lighting, authentic candid style. Bottom: teal CTA button 'Ver como funciona'. Minimal white background. High contrast typography. Social media native feel, not a generic banner."

Retorne apenas o JSON com os 5 criativos.`

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 4096,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPrompt }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

  // Extract JSON (strip markdown fences if present)
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  const parsed  = JSON.parse(jsonStr) as StrategyResponse
  return parsed.criativos
}

// ─── Step 2: Ideogram image generation ───────────────────────────────────────
async function generateImage(prompt: string, aspect: IdeogramAspect): Promise<string> {
  const res = await fetch(IDEOGRAM_URL, {
    method:  'POST',
    headers: { 'Api-Key': IDEOGRAM_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_request: {
        prompt,
        model:               'V_3',
        aspect_ratio:        aspect,
        magic_prompt_option: 'OFF',
        num_images:          1,
      },
    }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Ideogram ${res.status}: ${txt.slice(0, 200)}`)
  }

  const data = await res.json() as { data?: Array<{ url?: string }> }
  const url  = data?.data?.[0]?.url
  if (!url) throw new Error('Ideogram returned no URL')
  return url
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end',  () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, data: unknown, status = 200): void {
  const body = JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') { sendJson(res, { error: 'Method not allowed' }, 405); return }

  if (!IDEOGRAM_KEY) {
    sendJson(res, { error: 'IDEOGRAM_API_KEY não configurada nas variáveis de ambiente do Vercel' }, 500)
    return
  }

  // ── Parse request ──────────────────────────────────────────────────────────
  let creative_type = '', product_name = '', niche = ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let strategy: any = null

  try {
    const body   = await readBody(req)
    const parsed = JSON.parse(body) as {
      creative_type: string; product_name: string; niche?: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      strategy?: any
    }
    creative_type = parsed.creative_type ?? ''
    product_name  = parsed.product_name  ?? ''
    niche         = parsed.niche         ?? ''
    strategy      = parsed.strategy
  } catch {
    sendJson(res, { error: 'Invalid request body' }, 400); return
  }

  if (!creative_type || !product_name) {
    sendJson(res, { error: 'Missing required fields: creative_type, product_name' }, 400); return
  }

  const aspect = getAspect(creative_type)

  try {
    // ── Step 1: Claude generates 5 strategic creative briefs ─────────────────
    const briefs = await generateCreativeStrategy(product_name, niche, strategy)

    if (!briefs || briefs.length === 0) {
      sendJson(res, { error: 'Nenhum brief gerado pela IA estratégica' }, 500); return
    }

    // ── Step 2: Ideogram generates all 5 images in parallel ──────────────────
    type AssetResult = { url: string; label: string; error?: string }

    const imageJobs: Promise<AssetResult>[] = briefs.map(brief =>
      generateImage(brief.prompt_ideogram, aspect)
        .then(url => ({
          url,
          label: `${brief.id}. ${brief.nome}`,
        }))
        .catch((err: unknown) => ({
          url:   '',
          label: `${brief.id}. ${brief.nome}`,
          error: err instanceof Error ? err.message : 'Falha na geração',
        }))
    )

    const results = await Promise.all(imageJobs)
    const assets  = results.filter(r => r.url !== '')

    if (assets.length === 0) {
      sendJson(res, { error: results[0]?.error ?? 'Nenhuma imagem gerada' }, 500); return
    }

    sendJson(res, { assets })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    sendJson(res, { error: msg }, 500)
  }
}
