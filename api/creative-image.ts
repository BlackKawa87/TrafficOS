import OpenAI from 'openai'
import type { IncomingMessage, ServerResponse } from 'http'

// Serverless Function (Node.js) — maxDuration respected; Edge would cap at 25s
export const maxDuration = 60

const client = new OpenAI()

type DalleSize = '1024x1024' | '1024x1792' | '1792x1024'

function getSize(type: string): DalleSize {
  if (type === 'story')                                          return '1024x1792'
  if (type === 'video_curto' || type === 'video_longo')         return '1792x1024'
  return '1024x1024'
}

// ─── Prompt builder ───────────────────────────────────────────────────────────
// DALL-E 3 cannot render legible text. All prompts generate a CLEAN VISUAL
// BACKGROUND that the user finishes in Canva / Meta Creative Hub / Figma.
// The "NO TEXT" instruction must be emphatic and repeated to override DALL-E's
// tendency to hallucinate garbled letters when it sees words in the input.

const NO_TEXT = 'CRITICAL RULE: absolutely ZERO text, ZERO letters, ZERO words, ZERO numbers, ZERO captions, ZERO logos anywhere in the image — this is a pure photographic background for text overlay.'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPrompt(type: string, _productName: string, niche: string, strategy: any, slideIdx?: number): string {
  // Pull visual descriptors only — never product name / copy (causes DALL-E to render text)
  const scenery  = strategy?.direcao_criativa?.cenario      ?? ''
  const subject  = strategy?.direcao_criativa?.tipo_pessoa  ?? ''
  const aesthetic= strategy?.direcao_criativa?.estilo       ?? ''
  const bg       = strategy?.imagem_layout?.fundo           ?? strategy?.imagem_estilo?.fundo ?? ''
  const estiloV  = strategy?.imagem_estilo?.estilo          ?? ''
  const palette  = strategy?.imagem_referencia?.cores_hex?.join(', ') ?? strategy?.imagem_estilo?.contraste ?? ''
  const emotion  = strategy?.hooks?.[0]?.tipo ?? ''  // e.g. "Fear of Loss" → dramatic mood

  // Mood/emotion mapping
  const moodMap: Record<string, string> = {
    'fear_of_loss': 'dramatic, high-contrast, tense atmosphere',
    'curiosity':    'intriguing, mysterious, soft cinematic light',
    'urgency':      'bold, energetic, action-oriented composition',
    'social_proof': 'warm, aspirational, lifestyle photography',
    'authority':    'clean, professional, corporate elegance',
  }
  const mood = Object.entries(moodMap).find(([k]) => emotion.toLowerCase().includes(k))?.[1]
    ?? 'dramatic professional advertising mood'

  const nicheHint = niche ? `related to the ${niche} industry` : ''

  // ── Shared visual description ──────────────────────────────────────────────
  const visual = [
    subject    && `Main subject: ${subject}`,
    scenery    && `Environment: ${scenery}`,
    estiloV    && `Visual style: ${estiloV}`,
    bg         && `Background: ${bg}`,
    palette    && `Color palette: ${palette}`,
    `Mood: ${mood}`,
  ].filter(Boolean).join('. ')

  // ── Type-specific prompts ──────────────────────────────────────────────────
  if (type === 'carrossel') {
    const slides: unknown[] = strategy?.imagem_variacoes ?? []
    const slide = slides[slideIdx ?? 0] as Record<string, string> | undefined
    // Use visual mood/emotion from slide, not copy text
    const slideEmotion = slide?.emocao ?? slide?.angulo ?? mood
    return [
      `Square 1:1 advertising background image ${nicheHint}.`,
      `Mood for this slide: ${slideEmotion}.`,
      visual,
      'Plenty of empty negative space in the upper third for headline overlay.',
      'Professional commercial photography, ultra-sharp focus, vibrant colors.',
      NO_TEXT,
    ].join(' ')
  }

  if (type === 'story') {
    return [
      `Vertical 9:16 portrait social media story background ${nicheHint}.`,
      visual,
      'Strong visual composition with open areas at top and bottom for text overlay.',
      'Eye-catching, scroll-stopping imagery. Dramatic studio or golden-hour lighting.',
      NO_TEXT,
    ].join(' ')
  }

  if (type === 'video_curto' || type === 'video_longo' || type === 'ugc') {
    const hookScene = (strategy?.cenas ?? [])[0] as Record<string, string> | undefined
    const sceneDesc = hookScene?.enquadramento ?? hookScene?.descricao ?? scenery
    return [
      `Landscape 16:9 cinematic video thumbnail background ${nicheHint}.`,
      `Opening scene: ${sceneDesc || 'dynamic action shot'}.`,
      visual,
      'Cinematic composition, dramatic lighting, shallow depth-of-field.',
      'Clean area on the left side for title overlay.',
      NO_TEXT,
    ].join(' ')
  }

  // Default: square feed image (imagem)
  return [
    `Square 1:1 professional advertising background image ${nicheHint}.`,
    visual,
    'Clean composition with generous negative space at the top for headline.',
    'High-end commercial photography aesthetic. Perfect lighting, sharp focus.',
    NO_TEXT,
  ].join(' ')
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
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
    sendJson(res, { error: 'Method not allowed' }, 405)
    return
  }

  let creative_type = '', product_name = '', niche = ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let strategy: any = null
  let slide_count: number | undefined

  try {
    const body = await readBody(req)
    const parsed = JSON.parse(body) as {
      creative_type: string
      product_name: string
      niche?: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      strategy?: any
      slide_count?: number
    }
    creative_type = parsed.creative_type ?? ''
    product_name  = parsed.product_name  ?? ''
    niche         = parsed.niche         ?? ''
    strategy      = parsed.strategy
    slide_count   = parsed.slide_count
  } catch {
    sendJson(res, { error: 'Invalid request body' }, 400)
    return
  }

  if (!creative_type || !product_name) {
    sendJson(res, { error: 'Missing required fields: creative_type, product_name' }, 400)
    return
  }

  const size = getSize(creative_type)

  try {
    const isCarousel = creative_type === 'carrossel'
    const count = isCarousel ? Math.min(slide_count ?? 3, 5) : 1

    type JobResult = { url: string; label: string; revised_prompt?: string; error?: string }
    const jobs: Promise<JobResult>[] = []

    for (let i = 0; i < count; i++) {
      const prompt = buildPrompt(creative_type, product_name, niche, strategy, isCarousel ? i : undefined)
      const label  = isCarousel
        ? `Slide ${i + 1}`
        : creative_type === 'story'
          ? 'Story'
          : creative_type.startsWith('video')
            ? 'Frame-Chave (Thumbnail)'
            : 'Anúncio'

      jobs.push(
        client.images.generate({
          model:   'dall-e-3',
          prompt,
          n:       1,
          size,
          quality: 'standard',
          style:   'natural',
        }).then(r => ({
          url:            r.data[0].url ?? '',
          label,
          revised_prompt: r.data[0].revised_prompt,
        })).catch((err: unknown) => ({
          url:   '',
          label,
          error: err instanceof Error ? err.message : 'Falha na geração',
        }))
      )
    }

    const results = await Promise.all(jobs)
    const assets  = results.filter(r => r.url !== '')

    if (assets.length === 0) {
      sendJson(res, { error: results[0]?.error ?? 'Falha ao gerar imagem' }, 500)
      return
    }

    sendJson(res, { assets })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    sendJson(res, { error: msg }, 500)
  }
}
