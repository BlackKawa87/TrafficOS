export const runtime = 'edge'


export const maxDuration = 60

const GRAPH = 'https://graph.facebook.com/v19.0'

interface MetaCampaign {
  id: string
  name: string
  status: string
  effective_status: string
  objective: string
  daily_budget?: string
  lifetime_budget?: string
}

interface MetaInsight {
  campaign_id: string
  spend: string
  impressions: string
  clicks: string
  ctr: string
  cpc: string
  actions?: Array<{ action_type: string; value: string }>
  action_values?: Array<{ action_type: string; value: string }>
}

interface MetaApiResponse<T> {
  data?: T[]
  error?: { message: string; code: number }
}


const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const { access_token, ad_account_id } = (await req.json()) as { access_token?: string; ad_account_id?: string }
  if (!access_token || !ad_account_id) {
    return json({ error: 'access_token e ad_account_id são obrigatórios' }, 400)
  }

  const accountId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`
  const token = encodeURIComponent(access_token)

  try {
    const campaignsRes = await fetch(
      `${GRAPH}/${accountId}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget&limit=100&access_token=${token}`
    )
    const campaignsData = await campaignsRes.json() as MetaApiResponse<MetaCampaign>
    if (campaignsData.error) {
      return json({ error: `Meta API: ${campaignsData.error.message}` })
    }
    const campaigns = campaignsData.data ?? []

    const today = new Date()
    const since = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const until = today.toISOString().split('T')[0]

    const insightsRes = await fetch(
      `${GRAPH}/${accountId}/insights?fields=campaign_id,spend,impressions,clicks,ctr,cpc,actions,action_values&time_range={"since":"${since}","until":"${until}"}&level=campaign&limit=100&access_token=${token}`
    )
    const insightsData = await insightsRes.json() as MetaApiResponse<MetaInsight>
    if (insightsData.error) {
      return json({ error: `Meta Insights: ${insightsData.error.message}` })
    }

    const byId = new Map((insightsData.data ?? []).map(i => [i.campaign_id, i]))

    const syncedCampaigns = campaigns.map(c => {
      const ins = byId.get(c.id)
      const spend = parseFloat(ins?.spend ?? '0')
      const impressions = parseInt(ins?.impressions ?? '0', 10)
      const clicks = parseInt(ins?.clicks ?? '0', 10)
      const purchases = ins?.actions?.find(a => a.action_type === 'purchase')
      const revenue = ins?.action_values?.find(a => a.action_type === 'purchase')
      const purchaseCount = parseInt(purchases?.value ?? '0', 10)
      const revenueVal = parseFloat(revenue?.value ?? '0')
      return {
        id: c.id,
        name: c.name,
        status: c.effective_status ?? c.status,
        objective: c.objective,
        platform: 'meta' as const,
        daily_budget: c.daily_budget ? parseInt(c.daily_budget, 10) / 100 : undefined,
        spend,
        impressions,
        clicks,
        ctr: parseFloat(ins?.ctr ?? '0'),
        cpc: parseFloat(ins?.cpc ?? '0'),
        cpa: purchaseCount > 0 ? spend / purchaseCount : undefined,
        roas: spend > 0 && revenueVal > 0 ? revenueVal / spend : undefined,
      }
    })

    const totalSpend = syncedCampaigns.reduce((s, c) => s + (c.spend ?? 0), 0)
    const totalImpressions = syncedCampaigns.reduce((s, c) => s + (c.impressions ?? 0), 0)
    const totalClicks = syncedCampaigns.reduce((s, c) => s + (c.clicks ?? 0), 0)

    return json({
      sync: {
        platform: 'meta',
        synced_at: new Date().toISOString(),
        total_spend: totalSpend,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        avg_ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        avg_cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
        campaign_count: campaigns.length,
        active_count: campaigns.filter(c => c.effective_status === 'ACTIVE').length,
        campaigns: syncedCampaigns,
      },
    })
  } catch (err) {
    console.error('Meta sync error:', err)
    return json({ error: 'Falha ao sincronizar Meta Ads. Verifique suas credenciais.' }, 500)
  }
}
