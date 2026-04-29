export const runtime = 'edge'

export const maxDuration = 30

const GRAPH = 'https://graph.facebook.com/v19.0'

const OBJECTIVE_MAP: Record<string, string> = {
  teste_criativo: 'OUTCOME_ENGAGEMENT',
  validacao_oferta: 'OUTCOME_SALES',
  captacao_leads: 'OUTCOME_LEADS',
  vendas_conversao: 'OUTCOME_SALES',
  remarketing: 'OUTCOME_SALES',
  escala: 'OUTCOME_SALES',
  awareness: 'OUTCOME_AWARENESS',
  trafego_pagina: 'OUTCOME_TRAFFIC',
}

interface CreateCampaignBody {
  access_token: string
  ad_account_id: string
  name: string
  objective: string
  daily_budget_cents: number
  status?: 'ACTIVE' | 'PAUSED'
}

interface CreateAdSetBody {
  access_token: string
  ad_account_id: string
  campaign_id: string
  name: string
  daily_budget_cents: number
  optimization_goal?: string
  billing_event?: string
}

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  if (action === 'adset') {
    return createAdSet(req)
  }
  return createCampaign(req)
}

async function createCampaign(req: Request): Promise<Response> {
  const { access_token, ad_account_id, name, objective, daily_budget_cents, status = 'PAUSED' } =
    (await req.json()) as CreateCampaignBody

  if (!access_token || !ad_account_id || !name || !objective) {
    return json({ error: 'access_token, ad_account_id, name e objective são obrigatórios' }, 400)
  }

  const accountId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`
  const metaObjective = OBJECTIVE_MAP[objective] ?? 'OUTCOME_TRAFFIC'

  try {
    const body = new URLSearchParams({
      name,
      objective: metaObjective,
      status,
      special_ad_categories: '[]',
      access_token,
    })
    if (daily_budget_cents) {
      body.append('daily_budget', String(daily_budget_cents))
    }

    const metaRes = await fetch(`${GRAPH}/${accountId}/campaigns`, {
      method: 'POST',
      body,
    })
    const data = await metaRes.json() as { id?: string; error?: { message: string } }

    if (data.error) {
      return json({ error: `Meta API: ${data.error.message}` })
    }

    return json({ campaign_id: data.id, platform: 'meta' })
  } catch (err) {
    console.error('Meta create campaign error:', err)
    return json({ error: 'Falha ao criar campanha no Meta Ads.' }, 500)
  }
}

async function createAdSet(req: Request): Promise<Response> {
  const { access_token, ad_account_id, campaign_id, name, daily_budget_cents,
    optimization_goal = 'LINK_CLICKS', billing_event = 'IMPRESSIONS' } =
    (await req.json()) as CreateAdSetBody

  if (!access_token || !ad_account_id || !campaign_id || !name) {
    return json({ error: 'access_token, ad_account_id, campaign_id e name são obrigatórios' }, 400)
  }

  const accountId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`

  try {
    const body = new URLSearchParams({
      name,
      campaign_id,
      optimization_goal,
      billing_event,
      daily_budget: String(daily_budget_cents ?? 1000),
      status: 'PAUSED',
      access_token,
    })

    const metaRes = await fetch(`${GRAPH}/${accountId}/adsets`, {
      method: 'POST',
      body,
    })
    const data = await metaRes.json() as { id?: string; error?: { message: string } }

    if (data.error) {
      return json({ error: `Meta API: ${data.error.message}` })
    }

    return json({ adset_id: data.id, platform: 'meta' })
  } catch (err) {
    console.error('Meta create adset error:', err)
    return json({ error: 'Falha ao criar conjunto no Meta Ads.' }, 500)
  }
}
