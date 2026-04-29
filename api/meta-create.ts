import type { VercelRequest, VercelResponse } from '@vercel/node'

export const maxDuration = 30

const GRAPH = 'https://graph.facebook.com/v19.0'

// Maps TrafficOS campaign objectives to Meta Ads objectives
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action } = req.query as { action?: string }

  if (action === 'adset') {
    return createAdSet(req, res)
  }
  return createCampaign(req, res)
}

async function createCampaign(req: VercelRequest, res: VercelResponse) {
  const { access_token, ad_account_id, name, objective, daily_budget_cents, status = 'PAUSED' } =
    req.body as CreateCampaignBody

  if (!access_token || !ad_account_id || !name || !objective) {
    return res.status(400).json({ error: 'access_token, ad_account_id, name e objective são obrigatórios' })
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
      return res.status(400).json({ error: `Meta API: ${data.error.message}` })
    }

    return res.status(200).json({ campaign_id: data.id, platform: 'meta' })
  } catch (err) {
    console.error('Meta create campaign error:', err)
    return res.status(500).json({ error: 'Falha ao criar campanha no Meta Ads.' })
  }
}

async function createAdSet(req: VercelRequest, res: VercelResponse) {
  const { access_token, ad_account_id, campaign_id, name, daily_budget_cents,
    optimization_goal = 'LINK_CLICKS', billing_event = 'IMPRESSIONS' } =
    req.body as CreateAdSetBody

  if (!access_token || !ad_account_id || !campaign_id || !name) {
    return res.status(400).json({ error: 'access_token, ad_account_id, campaign_id e name são obrigatórios' })
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
      return res.status(400).json({ error: `Meta API: ${data.error.message}` })
    }

    return res.status(200).json({ adset_id: data.id, platform: 'meta' })
  } catch (err) {
    console.error('Meta create adset error:', err)
    return res.status(500).json({ error: 'Falha ao criar conjunto no Meta Ads.' })
  }
}
