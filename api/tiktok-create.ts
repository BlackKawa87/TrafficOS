export const runtime = 'edge'


export const maxDuration = 30

const TT = 'https://business-api.tiktok.com/open_api/v1.3'

const OBJECTIVE_MAP: Record<string, string> = {
  awareness: 'REACH',
  trafego_pagina: 'TRAFFIC',
  captacao_leads: 'LEAD_GENERATION',
  vendas_conversao: 'CONVERSIONS',
  remarketing: 'CONVERSIONS',
  escala: 'CONVERSIONS',
  teste_criativo: 'VIDEO_VIEWS',
  validacao_oferta: 'CONVERSIONS',
}

interface CreateCampaignBody {
  access_token: string
  advertiser_id: string
  name: string
  objective: string
  budget: number
  budget_mode?: 'BUDGET_MODE_DAY' | 'BUDGET_MODE_TOTAL'
}

interface CreateAdGroupBody {
  access_token: string
  advertiser_id: string
  campaign_id: string
  name: string
  budget: number
  budget_mode?: 'BUDGET_MODE_DAY' | 'BUDGET_MODE_TOTAL'
  placement_type?: string
}

interface TikTokApiResponse {
  code: number
  message: string
  data?: { campaign_id?: string; adgroup_id?: string }
}


const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const { action } = req.query as { action?: string }

  if (action === 'adgroup') {
    return createAdGroup(req, res)
  }
  return createCampaign(req, res)
}

async function createCampaign(req: VercelRequest, res: VercelResponse) {
  const { access_token, advertiser_id, name, objective, budget, budget_mode = 'BUDGET_MODE_DAY' } =
    (await req.json()) as CreateCampaignBody

  if (!access_token || !advertiser_id || !name || !objective) {
    return json({ error: 'access_token, advertiser_id, name e objective são obrigatórios' }, 400)
  }

  const ttObjective = OBJECTIVE_MAP[objective] ?? 'TRAFFIC'

  try {
    const ttRes = await fetch(`${TT}/campaign/create/`, {
      method: 'POST',
      headers: { 'Access-Token': access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        advertiser_id,
        campaign_name: name,
        objective_type: ttObjective,
        budget_mode,
        budget: budget ?? 50,
        operation_status: 'DISABLE',
      }),
    })
    const data = await ttRes.json() as TikTokApiResponse

    if (data.code !== 0) {
      return json({ error: `TikTok API: ${data.message}` })
    }

    return json({ campaign_id: data.data?.campaign_id, platform: 'tiktok' })
  } catch (err) {
    console.error('TikTok create campaign error:', err)
    return json({ error: 'Falha ao criar campanha no TikTok Ads.' }, 500)
  }
}

async function createAdGroup(req: VercelRequest, res: VercelResponse) {
  const { access_token, advertiser_id, campaign_id, name, budget,
    budget_mode = 'BUDGET_MODE_DAY', placement_type = 'PLACEMENT_TYPE_AUTOMATIC' } =
    (await req.json()) as CreateAdGroupBody

  if (!access_token || !advertiser_id || !campaign_id || !name) {
    return json({ error: 'access_token, advertiser_id, campaign_id e name são obrigatórios' }, 400)
  }

  try {
    const ttRes = await fetch(`${TT}/adgroup/create/`, {
      method: 'POST',
      headers: { 'Access-Token': access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        advertiser_id,
        campaign_id,
        adgroup_name: name,
        budget_mode,
        budget: budget ?? 20,
        placement_type,
        operation_status: 'DISABLE',
        optimization_goal: 'CLICK',
        billing_event: 'CPC',
      }),
    })
    const data = await ttRes.json() as TikTokApiResponse

    if (data.code !== 0) {
      return json({ error: `TikTok API: ${data.message}` })
    }

    return json({ adgroup_id: data.data?.adgroup_id, platform: 'tiktok' })
  } catch (err) {
    console.error('TikTok create adgroup error:', err)
    return json({ error: 'Falha ao criar grupo de anúncios no TikTok Ads.' }, 500)
  }
}
