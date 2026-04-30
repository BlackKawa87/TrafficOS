import Anthropic from '@anthropic-ai/sdk'
import type { IncomingMessage, ServerResponse } from 'http'

// Serverless Function — 60s for 5 Claude calls + 5 parallel Ideogram calls
export const maxDuration = 60

// ─── Clients ──────────────────────────────────────────────────────────────────
const anthropic    = new Anthropic()
const IDEOGRAM_KEY = process.env.IDEOGRAM_API_KEY ?? ''
const IDEOGRAM_URL = 'https://api.ideogram.ai/generate'

type IdeogramAspect = 'ASPECT_1_1' | 'ASPECT_9_16' | 'ASPECT_16_9'

function getAspect(type: string): IdeogramAspect {
  if (type === 'story')                                  return 'ASPECT_9_16'
  if (type === 'video_curto' || type === 'video_longo') return 'ASPECT_16_9'
  return 'ASPECT_1_1'
}

// ─── Variable substitution ────────────────────────────────────────────────────
// Replaces {{variable}} in a template string with values from the vars map.
function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const k = key.trim()
    return vars[k] ?? `[${k} não disponível]`
  })
}

// ─── Claude call ──────────────────────────────────────────────────────────────
async function claude(prompt: string, systemMsg?: string): Promise<string> {
  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 4096,
    ...(systemMsg ? { system: systemMsg } : {}),
    messages: [{ role: 'user', content: prompt }],
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text.trim() : ''
}

// ─── Ideogram image generation ────────────────────────────────────────────────
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
  const url = data?.data?.[0]?.url
  if (!url) throw new Error('Ideogram returned no URL')
  return url
}

// ─── Fallback prompts (used when Prompt Center templates are missing) ─────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFallbackVars(productName: string, niche: string, strategy: any, product: any): Record<string, string> {
  return {
    produto:             productName,
    descricao_produto:   product?.market ?? product?.notes ?? niche,
    publico_alvo:        product?.target_audience ?? strategy?.direcao_criativa?.tipo_pessoa ?? '',
    descricao_cliente:   product?.target_audience ?? '',
    dor_principal:       product?.main_pain ?? strategy?.roteiro?.problema ?? '',
    desejo_principal:    product?.main_desire ?? strategy?.roteiro?.solucao ?? '',
    promessa:            product?.main_promise ?? strategy?.ideia_central ?? '',
    beneficio_principal: product?.main_benefit ?? strategy?.ideia_central ?? '',
    oferta:              product ? `${product.name} — R$${product.price ?? ''}` : productName,
    nicho:               niche,
    tom:                 strategy?.direcao_criativa?.tom_voz ?? 'profissional e direto',
    objetivo_campanha:   'conversão',
  }
}

const FALLBACK_PROMPT_01 = `Analise o cliente ideal para o produto "{{produto}}" (nicho: {{nicho}}).
Público-alvo: {{publico_alvo}}. Dor: {{dor_principal}}. Desejo: {{desejo_principal}}.
Mapeie: situação de vida, emoções antes/depois da compra, tentativas anteriores, objeções e linguagem de identificação.`

const FALLBACK_PROMPT_02 = `Com base na análise: {{analise_comportamental}}
Liste 5 sinais de identificação do público, 5 emoções para o criativo, 5 elementos visuais, 5 frases curtas e 5 hooks de scroll-stop.`

const FALLBACK_PROMPT_03 = `Produto: {{produto}}. Público: {{publico_alvo}}. Promessa: {{promessa}}.
Análise: {{analise_comportamental}}. Sinais: {{sinais_conversao}}.
Crie 5 criativos com ângulos: Dor Direta, Desejo Aspiracional, Quebra de Objeção, Identificação Cotidiana, Oportunidade/Urgência.
Para cada: nome, ângulo, headline (máx 6 palavras), subtexto (máx 12 palavras), CTA (máx 3 palavras), ideia visual, estilo.`

const FALLBACK_PROMPT_04 = `Transforme os 5 criativos abaixo em prompts para Ideogram (em inglês):
{{criativos_gerados}}
Produto: {{produto}}. Público: {{publico_alvo}}.
Para cada: descreva composição, texto exato, CTA, estilo, emoção, layout limpo.`

const FALLBACK_PROMPT_05 = `Revise os 5 criativos e prompts abaixo:
{{criativos_gerados}}
Melhore clareza, força emocional e naturalidade. Retorne a versão final dos 5 prompts Ideogram.`

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function extractJsonArray(text: string): string[] {
  // Try to find a JSON array anywhere in the text (strips markdown fences etc.)
  const cleaned = text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch { /* fall through */ }
  // Fallback: split by numbered patterns like "1." or "Criativo 1:"
  const lines = text.split(/\n(?=\d+\.|Criativo \d)/i).map(s => s.trim()).filter(Boolean)
  if (lines.length >= 3) return lines
  return [text] // last resort
}

// ─── 5-STEP CREATIVE PIPELINE ─────────────────────────────────────────────────
interface PromptTemplate { name: string; template: string }

async function runCreativePipeline(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  productName: string, niche: string, strategy: any, product: any,
  templates: (PromptTemplate | null)[]
): Promise<string[]> {

  const baseVars = buildFallbackVars(productName, niche, strategy, product)

  const t01 = templates[0]?.template ?? FALLBACK_PROMPT_01
  const t02 = templates[1]?.template ?? FALLBACK_PROMPT_02
  const t03 = templates[2]?.template ?? FALLBACK_PROMPT_03
  const t04 = templates[3]?.template ?? FALLBACK_PROMPT_04
  const t05 = templates[4]?.template ?? FALLBACK_PROMPT_05

  // ── Step 1: Behavioral analysis ────────────────────────────────────────────
  const analise_comportamental = await claude(
    fill(t01, baseVars),
    'Você é especialista em comportamento do consumidor e psicologia de compra. Seja claro, objetivo e estratégico.'
  )

  // ── Step 2: Conversion signals ─────────────────────────────────────────────
  const sinais_conversao = await claude(
    fill(t02, { ...baseVars, analise_comportamental }),
    'Você é estrategista de criativos para Facebook Ads. Seja prático e direto ao ponto.'
  )

  // ── Step 3: 5 creative angles (request JSON output) ────────────────────────
  const prompt03 = fill(t03, { ...baseVars, analise_comportamental, sinais_conversao })
  const criativos_texto = await claude(
    `${prompt03}

---
Retorne a resposta em formato estruturado e claro, com os 5 criativos numerados de 1 a 5.`,
    'Você é copywriter de resposta direta e estrategista de Facebook Ads. Seja criativo, direto e orientado para conversão.'
  )

  // ── Step 4: Ideogram prompts for all 5 creatives ──────────────────────────
  const prompt04 = fill(t04, { ...baseVars, criativos_gerados: criativos_texto })
  const ideogram_prompts_texto = await claude(
    `${prompt04}

---
IMPORTANTE: Retorne EXATAMENTE um JSON array com 5 strings. Cada string é o prompt completo em inglês para o Ideogram do respectivo criativo (1=Dor Direta, 2=Desejo Aspiracional, 3=Quebra de Objeção, 4=Identificação Cotidiana, 5=Oportunidade/Urgência).

Formato exato:
["prompt do criativo 1 aqui", "prompt do criativo 2 aqui", "prompt do criativo 3 aqui", "prompt do criativo 4 aqui", "prompt do criativo 5 aqui"]

Sem texto adicional. Apenas o JSON array.`,
    'Você é especialista em prompts para Ideogram e geração de criativos publicitários.'
  )

  // ── Step 5: Strategic revision + final prompts ─────────────────────────────
  const prompt05 = fill(t05, { criativos_gerados: ideogram_prompts_texto })
  const final_texto = await claude(
    `${prompt05}

---
IMPORTANTE: Retorne EXATAMENTE um JSON array com 5 strings — os prompts finais revisados e melhorados para o Ideogram.

Regras dos prompts finais:
- Em inglês
- Cada prompt com no máximo 400 tokens
- Incluir: composição, headline exata (máx 6 palavras), CTA (máx 3 palavras), estilo visual, emoção, layout limpo
- Sem texto distorcido, sem claims exagerados, sem visual poluído

Formato exato:
["prompt final 1", "prompt final 2", "prompt final 3", "prompt final 4", "prompt final 5"]

Sem texto adicional. Apenas o JSON array.`,
    'Você é diretor de criação especializado em Facebook Ads.'
  )

  return extractJsonArray(final_texto)
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
  let strategy: any = null, product: any = null
  let prompt_templates: (PromptTemplate | null)[] = [null, null, null, null, null]

  try {
    const body   = await readBody(req)
    const parsed = JSON.parse(body) as {
      creative_type: string; product_name: string; niche?: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      strategy?: any; product?: any
      prompt_templates?: (PromptTemplate | null)[]
    }
    creative_type     = parsed.creative_type     ?? ''
    product_name      = parsed.product_name      ?? ''
    niche             = parsed.niche             ?? ''
    strategy          = parsed.strategy
    product           = parsed.product
    prompt_templates  = parsed.prompt_templates  ?? [null, null, null, null, null]
  } catch {
    sendJson(res, { error: 'Invalid request body' }, 400); return
  }

  if (!creative_type || !product_name) {
    sendJson(res, { error: 'Missing required fields' }, 400); return
  }

  const aspect = getAspect(creative_type)
  const ANGLE_LABELS = [
    '1. Dor Direta',
    '2. Desejo Aspiracional',
    '3. Quebra de Objeção',
    '4. Identificação Cotidiana',
    '5. Oportunidade/Urgência',
  ]

  try {
    // ── Run the 5-step pipeline ───────────────────────────────────────────────
    const finalPrompts = await runCreativePipeline(
      product_name, niche, strategy, product, prompt_templates
    )

    // ── Generate 5 images in parallel with Ideogram ───────────────────────────
    type AssetResult = { url: string; label: string; error?: string }

    const imageJobs: Promise<AssetResult>[] = finalPrompts
      .slice(0, 5)
      .map((prompt, i) =>
        generateImage(prompt, aspect)
          .then(url => ({ url, label: ANGLE_LABELS[i] ?? `Criativo ${i + 1}` }))
          .catch((err: unknown) => ({
            url:   '',
            label: ANGLE_LABELS[i] ?? `Criativo ${i + 1}`,
            error: err instanceof Error ? err.message : 'Falha na geração',
          }))
      )

    const results = await Promise.all(imageJobs)
    const assets  = results.filter(r => r.url !== '')

    if (assets.length === 0) {
      sendJson(res, { error: results[0]?.error ?? 'Nenhuma imagem gerada pelo Ideogram' }, 500); return
    }

    sendJson(res, { assets })

  } catch (err) {
    sendJson(res, { error: err instanceof Error ? err.message : 'Erro desconhecido' }, 500)
  }
}
