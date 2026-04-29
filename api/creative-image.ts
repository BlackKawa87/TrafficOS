import OpenAI from 'openai'

// Serverless Function (NOT Edge) — needs up to 60s for DALL-E 3 image generation
export const maxDuration = 60

const client = new OpenAI()

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

type DalleSize = '1024x1024' | '1024x1792' | '1792x1024'

function getSize(type: string): DalleSize {
  if (type === 'story')                       return '1024x1792'  // vertical 9:16
  if (type === 'video_curto' || type === 'video_longo') return '1792x1024' // landscape
  return '1024x1024'  // square for imagem, carrossel, ugc
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPrompt(type: string, productName: string, niche: string, strategy: any, slideIdx?: number): string {
  const idea   = strategy?.ideia_central ?? ''
  const style  = strategy?.imagem_estilo
    ? `Style: ${strategy.imagem_estilo.visual ?? ''}. Palette: ${strategy.imagem_estilo.paleta_cores ?? ''}.`
    : ''
  const layout = strategy?.imagem_layout
    ? `Composition: ${strategy.imagem_layout.composicao ?? ''}. Background: ${strategy.imagem_layout.fundo ?? ''}.`
    : ''
  const dir    = strategy?.direcao_criativa
    ? `Setting: ${strategy.direcao_criativa.cenario ?? ''}. Subject: ${strategy.direcao_criativa.tipo_pessoa ?? ''}. Aesthetic: ${strategy.direcao_criativa.estilo ?? ''}.`
    : ''

  const base = `product: "${productName}", niche: ${niche}`

  if (type === 'carrossel') {
    const slides: unknown[] = strategy?.imagem_variacoes ?? []
    const slide = slides[slideIdx ?? 0] as Record<string, string> | undefined
    const slideDesc = slide?.descricao ?? slide?.titulo ?? idea
    return `Professional advertising slide image for ${base}. Concept: ${slideDesc}. ${layout} ${style} ${dir} Clean commercial photography. Ultra-sharp, vibrant colors. No visible text or watermarks.`
  }

  if (type === 'story') {
    return `Vertical social media story ad (9:16) for ${base}. Concept: ${idea}. ${style} ${dir} Eye-catching, scroll-stopping creative. Dramatic lighting, professional quality. No text overlays.`
  }

  if (type === 'video_curto' || type === 'video_longo' || type === 'ugc') {
    const hookScene = (strategy?.cenas ?? [])[0] as Record<string, string> | undefined
    const hookDesc  = hookScene?.descricao ?? hookScene?.visual ?? idea
    return `Video ad thumbnail / key frame for ${base}. Opening hook scene: ${hookDesc}. ${dir} ${style} Cinematic quality, dramatic composition, professional production value. Golden-hour or studio lighting. No text.`
  }

  // Default: single image ad
  return `Professional advertising image for ${base}. Creative concept: ${idea}. ${layout} ${style} ${dir} High-quality commercial photography, strong visual hierarchy, visually striking. No text overlays. No watermarks.`
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const {
    creative_type,
    product_name,
    niche,
    strategy,
    slide_count,
  } = (await req.json()) as {
    creative_type: string
    product_name: string
    niche: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strategy: any
    slide_count?: number
  }

  if (!creative_type || !product_name) return json({ error: 'Missing required fields' }, 400)

  const size = getSize(creative_type)

  try {
    const isCarousel = creative_type === 'carrossel'
    const count = isCarousel ? Math.min(slide_count ?? 3, 5) : 1

    type JobResult = { url: string; label: string; revised_prompt?: string; error?: string }
    const generationJobs: Promise<JobResult>[] = []

    for (let i = 0; i < count; i++) {
      const prompt = buildPrompt(creative_type, product_name, niche ?? '', strategy, isCarousel ? i : undefined)
      const label  = isCarousel
        ? `Slide ${i + 1}`
        : creative_type === 'story'
        ? 'Story'
        : creative_type.startsWith('video')
        ? 'Frame-Chave (Thumbnail)'
        : 'Anúncio'

      generationJobs.push(
        client.images.generate({
          model:   'dall-e-3',
          prompt,
          n:       1,
          size,
          quality: 'standard',
          style:   'natural',
        }).then(res => ({
          url:            res.data[0].url ?? '',
          label,
          revised_prompt: res.data[0].revised_prompt,
        })).catch((err: unknown) => ({
          url:   '',
          label,
          error: err instanceof Error ? err.message : 'Falha na geração',
        }))
      )
    }

    const results = await Promise.all(generationJobs)
    // Filter out failed slides but keep successful ones
    const assets = results.filter(r => r.url !== '')
    if (assets.length === 0) {
      const firstErr = results[0]?.error ?? 'Erro desconhecido'
      return json({ error: firstErr }, 500)
    }
    return json({ assets })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return json({ error: msg }, 500)
  }
}
