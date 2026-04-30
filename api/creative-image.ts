import type { IncomingMessage, ServerResponse } from 'http'

// Serverless Function — 60s for Ideogram generation
export const maxDuration = 60

// ─── Ideogram v3 API ──────────────────────────────────────────────────────────
const IDEOGRAM_KEY = process.env.IDEOGRAM_API_KEY ?? ''
const IDEOGRAM_URL = 'https://api.ideogram.ai/generate'

type IdeogramAspect = 'ASPECT_1_1' | 'ASPECT_9_16' | 'ASPECT_16_9' | 'ASPECT_4_5'

function getAspect(type: string): IdeogramAspect {
  if (type === 'story')                               return 'ASPECT_9_16'
  if (type === 'video_curto' || type === 'video_longo') return 'ASPECT_16_9'
  return 'ASPECT_1_1'  // feed, carrossel, imagem, ugc
}

// ─── Prompt builder ───────────────────────────────────────────────────────────
// Ideogram v3 renders TEXT reliably — unlike DALL-E.
// We include the actual headline / CTA from the creative strategy.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPrompt(type: string, productName: string, niche: string, strategy: any, slideIdx?: number): string {
  // ── Text elements from the creative briefing ────────────────────────────
  const headline    = strategy?.imagem_texto?.headline    ?? strategy?.roteiro?.hook        ?? ''
  const subheadline = strategy?.imagem_texto?.subheadline ?? strategy?.roteiro?.solucao     ?? ''
  const cta         = strategy?.imagem_texto?.cta         ?? strategy?.texto_anuncio?.ctas?.[0] ?? 'Saiba mais'
  const idea        = strategy?.ideia_central             ?? ''

  // ── Visual style ────────────────────────────────────────────────────────
  const scenery   = strategy?.direcao_criativa?.cenario     ?? ''
  const subject   = strategy?.direcao_criativa?.tipo_pessoa ?? ''
  const estilo    = strategy?.direcao_criativa?.estilo      ?? ''
  const bg        = strategy?.imagem_estilo?.fundo          ?? ''
  const palette   = strategy?.imagem_referencia?.cores_hex?.slice(0, 3).join(', ')
    ?? strategy?.imagem_estilo?.contraste ?? ''

  const nicheCtx  = niche ? `(${niche} industry)` : ''
  const paletteTxt = palette ? `Color palette: ${palette}.` : ''

  // ── Type-specific prompts ────────────────────────────────────────────────
  if (type === 'carrossel') {
    const slides: unknown[] = strategy?.imagem_variacoes ?? []
    const slide = slides[slideIdx ?? 0] as Record<string, string> | undefined
    const slideHeadline = slide?.headline ?? headline
    const slideAngle    = slide?.angulo   ?? idea
    const slideEmotion  = slide?.emocao   ?? ''

    return [
      `Professional square social media ad creative for ${productName} ${nicheCtx}.`,
      `BOLD HEADLINE TEXT: "${slideHeadline}"`,
      slideAngle    && `Concept: ${slideAngle}.`,
      slideEmotion  && `Emotional tone: ${slideEmotion}.`,
      subject       && `Photography subject: ${subject}.`,
      scenery       && `Background scene: ${scenery}.`,
      estilo        && `Visual style: ${estilo}.`,
      bg            && `Background: ${bg}.`,
      paletteTxt,
      `CTA button in the lower section with text "${cta}".`,
      `Clean modern advertising layout. High-contrast typography. Professional graphic design quality.`,
      `Meta Ads feed format. No extra decorations. Photorealistic product shot with overlay text.`,
    ].filter(Boolean).join(' ')
  }

  if (type === 'story') {
    return [
      `Professional vertical 9:16 social media story ad for ${productName} ${nicheCtx}.`,
      headline      && `LARGE BOLD HEADLINE: "${headline}"`,
      subheadline   && `Subtitle text: "${subheadline}"`,
      idea          && `Concept: ${idea}.`,
      subject       && `Subject: ${subject}.`,
      scenery       && `Scene: ${scenery}.`,
      estilo        && `Style: ${estilo}.`,
      bg            && `Background: ${bg}.`,
      paletteTxt,
      `CTA button near the bottom: "${cta}".`,
      `Full-bleed vertical composition. Bold typographic hierarchy. Eye-catching scroll-stopping creative.`,
      `Instagram/Facebook Stories format. Clean professional ad design.`,
    ].filter(Boolean).join(' ')
  }

  if (type === 'video_curto' || type === 'video_longo' || type === 'ugc') {
    const hookScene = (strategy?.cenas ?? [])[0] as Record<string, string> | undefined
    const hookVisual = hookScene?.enquadramento ?? hookScene?.descricao ?? scenery
    const hookText  = strategy?.roteiro?.hook ?? idea

    return [
      `Cinematic video ad thumbnail / key frame for ${productName} ${nicheCtx}.`,
      hookText   && `Hook text overlay: "${hookText}"`,
      hookVisual && `Scene: ${hookVisual}.`,
      subject    && `Subject: ${subject}.`,
      estilo     && `Aesthetic: ${estilo}.`,
      paletteTxt,
      `Dramatic cinematic lighting. Professional production value.`,
      `16:9 YouTube/Meta video thumbnail format. Bold text placement on the left side.`,
    ].filter(Boolean).join(' ')
  }

  // Default: square feed image (imagem)
  return [
    `Professional square Meta Ads creative for ${productName} ${nicheCtx}.`,
    headline      && `BOLD HEADLINE TEXT: "${headline}"`,
    subheadline   && `Subtext: "${subheadline}"`,
    idea          && `Concept: ${idea}.`,
    subject       && `Photography: ${subject}.`,
    scenery       && `Setting: ${scenery}.`,
    estilo        && `Visual style: ${estilo}.`,
    bg            && `Background: ${bg}.`,
    paletteTxt,
    `CTA button: "${cta}".`,
    `Clean modern advertising layout. High-contrast legible typography. Professional graphic design.`,
    `1:1 square format for Meta Ads feed. Balanced composition with strong visual hierarchy.`,
  ].filter(Boolean).join(' ')
}

// ─── Ideogram generate call ───────────────────────────────────────────────────
async function generateImage(prompt: string, aspect: IdeogramAspect): Promise<string> {
  const res = await fetch(IDEOGRAM_URL, {
    method: 'POST',
    headers: {
      'Api-Key':      IDEOGRAM_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_request: {
        prompt,
        model:                'V_3',
        aspect_ratio:         aspect,
        magic_prompt_option:  'OFF',   // keep our prompt as-is
        num_images:           1,
      },
    }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Ideogram API error ${res.status}: ${txt.slice(0, 300)}`)
  }

  const data = await res.json() as { data?: Array<{ url?: string }> }
  const url  = data?.data?.[0]?.url
  if (!url) throw new Error('Ideogram returned no image URL')
  return url
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') { sendJson(res, { error: 'Method not allowed' }, 405); return }

  if (!IDEOGRAM_KEY) {
    sendJson(res, { error: 'IDEOGRAM_API_KEY not configured in Vercel environment variables' }, 500)
    return
  }

  let creative_type = '', product_name = '', niche = ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let strategy: any = null
  let slide_count: number | undefined

  try {
    const body = await readBody(req)
    const parsed = JSON.parse(body) as {
      creative_type: string; product_name: string; niche?: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      strategy?: any; slide_count?: number
    }
    creative_type = parsed.creative_type ?? ''
    product_name  = parsed.product_name  ?? ''
    niche         = parsed.niche         ?? ''
    strategy      = parsed.strategy
    slide_count   = parsed.slide_count
  } catch {
    sendJson(res, { error: 'Invalid request body' }, 400); return
  }

  if (!creative_type || !product_name) {
    sendJson(res, { error: 'Missing required fields: creative_type, product_name' }, 400); return
  }

  const aspect     = getAspect(creative_type)
  const isCarousel = creative_type === 'carrossel'
  const count      = isCarousel ? Math.min(slide_count ?? 3, 5) : 1

  try {
    type JobResult = { url: string; label: string; error?: string }
    const jobs: Promise<JobResult>[] = []

    for (let i = 0; i < count; i++) {
      const prompt = buildPrompt(creative_type, product_name, niche, strategy, isCarousel ? i : undefined)
      const label  = isCarousel
        ? `Slide ${i + 1}`
        : creative_type === 'story'          ? 'Story'
        : creative_type.startsWith('video')  ? 'Frame-Chave'
        : 'Anúncio'

      jobs.push(
        generateImage(prompt, aspect)
          .then(url => ({ url, label }))
          .catch((err: unknown) => ({
            url:   '',
            label,
            error: err instanceof Error ? err.message : 'Falha na geração',
          }))
      )
    }

    const results = await Promise.all(jobs)
    const assets  = results.filter(r => r.url !== '')

    if (assets.length === 0) {
      sendJson(res, { error: results[0]?.error ?? 'Nenhuma imagem gerada' }, 500); return
    }

    sendJson(res, { assets })

  } catch (err) {
    sendJson(res, { error: err instanceof Error ? err.message : 'Erro desconhecido' }, 500)
  }
}
