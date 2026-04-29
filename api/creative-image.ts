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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPrompt(type: string, productName: string, niche: string, strategy: any, slideIdx?: number): string {
  const idea   = strategy?.ideia_central ?? ''
  const style  = strategy?.imagem_estilo
    ? `Style: ${strategy.imagem_estilo.visual ?? strategy.imagem_estilo.estilo ?? ''}. Palette: ${strategy.imagem_estilo.paleta_cores ?? strategy.imagem_estilo.contraste ?? ''}.`
    : ''
  const layout = strategy?.imagem_layout
    ? `Composition: ${strategy.imagem_layout.composicao ?? strategy.imagem_layout.hierarquia_visual ?? ''}. Background: ${strategy.imagem_layout.fundo ?? ''}.`
    : ''
  const dir    = strategy?.direcao_criativa
    ? `Setting: ${strategy.direcao_criativa.cenario ?? ''}. Subject: ${strategy.direcao_criativa.tipo_pessoa ?? ''}. Aesthetic: ${strategy.direcao_criativa.estilo ?? ''}.`
    : ''

  const base = `product: "${productName}", niche: ${niche}`

  if (type === 'carrossel') {
    const slides: unknown[] = strategy?.imagem_variacoes ?? []
    const slide = slides[slideIdx ?? 0] as Record<string, string> | undefined
    const slideDesc = slide?.descricao ?? slide?.titulo ?? slide?.headline ?? idea
    return `Professional advertising slide image for ${base}. Concept: ${slideDesc}. ${layout} ${style} ${dir} Clean commercial photography. Ultra-sharp, vibrant colors. No visible text or watermarks.`
  }

  if (type === 'story') {
    return `Vertical social media story ad (9:16) for ${base}. Concept: ${idea}. ${style} ${dir} Eye-catching, scroll-stopping creative. Dramatic lighting, professional quality. No text overlays.`
  }

  if (type === 'video_curto' || type === 'video_longo' || type === 'ugc') {
    const hookScene = (strategy?.cenas ?? [])[0] as Record<string, string> | undefined
    const hookDesc  = hookScene?.descricao ?? hookScene?.visual ?? hookScene?.texto_falado ?? idea
    return `Video ad thumbnail / key frame for ${base}. Opening hook scene: ${hookDesc}. ${dir} ${style} Cinematic quality, dramatic composition. No text.`
  }

  // Default: single image ad (imagem)
  return `Professional advertising image for ${base}. Creative concept: ${idea}. ${layout} ${style} ${dir} High-quality commercial photography, strong visual hierarchy. No text overlays. No watermarks.`
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
