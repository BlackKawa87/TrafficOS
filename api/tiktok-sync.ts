export const runtime = 'edge'


export const maxDuration = 60

const TT = 'https://business-api.tiktok.com/open_api/v1.3'

interface TikTokCampaign {
  campaign_id: string
  campaign_name: string
  status: string
  objective_type: string
  budget: number
  budget_mode: string
}

interface TikTokApiResponse<T> {
  code: number
  message: string
  data?: { list?: T[]; page_info?: { total_number: number } }
}

interface ReportRow {
  dimensions: { campaign_id: string }
  metrics: {
    spend?: string
    impressions?: string
    clicks?: string
    ctr?: string
    cpc?: string
    conversion?: string
    cost_per_conversion?: string
  }
}


const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const { access_token, advertiser_id } = (await req.json()) as { access_token?: string; advertiser_id?: string }
  if (!access_token || !advertiser_id) {
    return json({ error: 'access_token e advertiser_id são obrigatórios' }, 400)
  }

  const headers = { 'Access-Token': access_token, 'Content-Type': 'application/json' }

  try {
    const campaignsRes = await fetch(
      `${TT}/campaign/get/?advertiser_id=${advertiser_id}&page_size=100`,
      { headers }
    )
    const campaignsData = await campaignsRes.json() as TikTokApiResponse<TikTokCampaign>
    if (campaignsData.code !== 0) {
      return json({ error: `TikTok API: ${campaignsData.message}` })
    }
    const campaigns = campaignsData.data?.list ?? []

    const today = new Date()
    const since = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const until = today.toISOString().split('T')[0]

    const reportUrl = new URL(`${TT}/report/integrated/get/`)
    reportUrl.searchParams.set('advertiser_id', advertiser_id)
    reportUrl.searchParams.set('report_type', 'BASIC')
    reportUrl.searchParams.set('dimensions', JSON.stringify(['campaign_id']))
    reportUrl.searchParams.set('start_date', since)
    reportUrl.searchParams.set('end_date', until)
    reportUrl.searchParams.set('metrics', JSON.stringify(['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'conversion', 'cost_per_conversion']))
    reportUrl.searchParams.set('page_size', '100')

    const reportRes = await fetch(reportUrl.toString(), { headers })
    const reportData = await reportRes.json() as TikTokApiResponse<ReportRow>

    const byId = new Map<string, { spend: number; impressions: number; clicks: number; ctr: number; cpc: number; cpa: number }>()
    for (const row of (reportData.data?.list ?? [])) {
      const cid = row.dimensions.campaign_id
      const prev = byId.get(cid) ?? { spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpa: 0 }
      byId.set(cid, {
        spend: prev.spend + parseFloat(row.metrics.spend ?? '0'),
        impressions: prev.impressions + parseInt(row.metrics.impressions ?? '0', 10),
        clicks: prev.clicks + parseInt(row.metrics.clicks ?? '0', 10),
        ctr: parseFloat(row.metrics.ctr ?? '0'),
        cpc: parseFloat(row.metrics.cpc ?? '0'),
        cpa: parseFloat(row.metrics.cost_per_conversion ?? '0'),
      })
    }

    const syncedCampaigns = campaigns.map(c => {
      const m = byId.get(c.campaign_id)
      return {
        id: c.campaign_id,
        name: c.campaign_name,
        status: c.status,
        objective: c.objective_type,
        platform: 'tiktok' as const,
        daily_budget: c.budget_mode === 'BUDGET_MODE_DAY' ? c.budget : undefined,
        spend: m?.spend,
        impressions: m?.impressions,
        clicks: m?.clicks,
        ctr: m?.ctr,
        cpc: m?.cpc,
        cpa: m?.cpa,
      }
    })

    const totalSpend = syncedCampaigns.reduce((s, c) => s + (c.spend ?? 0), 0)
    const totalImpressions = syncedCampaigns.reduce((s, c) => s + (c.impressions ?? 0), 0)
    const totalClicks = syncedCampaigns.reduce((s, c) => s + (c.clicks ?? 0), 0)
    const enableStatuses = ['CAMPAIGN_STATUS_ENABLE', 'enable']

    return json({
      sync: {
        platform: 'tiktok',
        synced_at: new Date().toISOString(),
        total_spend: totalSpend,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        avg_ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        avg_cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
        campaign_count: campaigns.length,
        active_count: campaigns.filter(c => enableStatuses.includes(c.status)).length,
        campaigns: syncedCampaigns,
      },
    })
  } catch (err) {
    console.error('TikTok sync error:', err)
    return json({ error: 'Falha ao sincronizar TikTok Ads. Verifique suas credenciais.' }, 500)
  }
}
