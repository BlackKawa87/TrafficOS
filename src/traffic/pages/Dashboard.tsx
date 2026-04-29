import { useNavigate } from 'react-router-dom'
import { tosDb } from '../store/storage'
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  DECISION_TYPE_LABELS,
  PRIORITY_LABELS,
  AI_CREATIVE_STATUS_LABELS,
  CHANNEL_LABELS,
  COMPLIANCE_STATUS_LABELS,
  COMPLIANCE_STATUS_COLORS,
  COMPLIANCE_RISK_COLORS,
  RELATORIO_TYPE_ICONS,
  RELATORIO_TYPE_LABELS,
} from '../utils/helpers'

// ── sub-components ─────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, accent, color, onClick,
}: {
  label: string; value: string | number; sub?: string
  accent?: boolean; color?: string; onClick?: () => void
}) {
  return (
    <div
      className={`bg-gray-900 border rounded-xl p-4 ${accent ? 'border-violet-700/50' : 'border-gray-800'} ${onClick ? 'cursor-pointer hover:border-gray-700 transition-all' : ''}`}
      onClick={onClick}
    >
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">{label}</div>
      <div className={`text-xl font-bold ${color ?? (accent ? 'text-violet-400' : 'text-white')}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function SectionHeader({ icon, title, link, linkLabel, onClick }: {
  icon: string; title: string; link?: string; linkLabel?: string; onClick?: () => void
}) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {link && (
        <button
          onClick={onClick ?? (() => navigate(link))}
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          {linkLabel ?? 'Ver tudo →'}
        </button>
      )}
    </div>
  )
}

// ── main ───────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()

  // ── data ──────────────────────────────────────────────────────────────────
  const products     = tosDb.products.getAll()
  const aiCampaigns  = tosDb.aiCampaigns.getAll()
  const aiCreatives  = tosDb.aiCreatives.getAll()
  const metrics      = tosDb.metrics.getAll()
  const decisions    = tosDb.decisions.getAll()
  const latestInsight = tosDb.insights.getLatest()

  // ── financial KPIs ────────────────────────────────────────────────────────
  const totalSpend       = metrics.reduce((s, m) => s + m.spend,       0)
  const totalRevenue     = metrics.reduce((s, m) => s + m.revenue,     0)
  const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0)
  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0)
  const totalClicks      = metrics.reduce((s, m) => s + m.clicks,      0)
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const avgCpa  = totalConversions > 0 ? totalSpend / totalConversions : 0
  const avgCtr  = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const profit  = totalRevenue - totalSpend

  // ── 7-day vs prev-7-day trend ─────────────────────────────────────────────
  const today = new Date()
  const d7 = new Date(today); d7.setDate(d7.getDate() - 6)
  const d14 = new Date(today); d14.setDate(d14.getDate() - 13)
  const d7str  = d7.toISOString().split('T')[0]
  const d14str = d14.toISOString().split('T')[0]
  const d6str  = new Date(today.getTime() - 7 * 86400000).toISOString().split('T')[0]

  const recent7  = metrics.filter(m => m.date >= d7str)
  const prev7    = metrics.filter(m => m.date >= d14str && m.date < d6str)
  const rev7     = recent7.reduce((s, m) => s + m.revenue, 0)
  const rev7prev = prev7.reduce((s, m) => s + m.revenue,   0)
  const revTrend = rev7prev > 0 ? ((rev7 - rev7prev) / rev7prev) * 100 : null

  // ── inventory ─────────────────────────────────────────────────────────────
  const activeCampaigns = aiCampaigns.filter(c => c.status === 'ativa').length
  const winnersCount    = aiCreatives.filter(c => c.status === 'vencedor' || c.status === 'escalar').length
  const testingCount    = aiCreatives.filter(c => c.status === 'em_teste').length

  // ── compliance ────────────────────────────────────────────────────────────
  const allCompliance = tosDb.complianceChecks.getAll()
  const latestCompliance = allCompliance.length > 0 ? allCompliance[0] : null
  const highRiskChecks = allCompliance.filter(
    c => c.analysis.status === 'alto_risco' || c.analysis.status === 'nao_recomendado'
  ).length

  // ── reports ───────────────────────────────────────────────────────────────
  const allReports   = tosDb.relatorios.getAll()
  const latestReport = allReports.length > 0 ? allReports[0] : null

  // ── decisions ─────────────────────────────────────────────────────────────
  const pendingDecisions = decisions
    .filter(d => d.status === 'pending' || d.status === 'in_progress')
    .sort((a, b) => {
      const pOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
      return (pOrder[a.priority] ?? 4) - (pOrder[b.priority] ?? 4)
    })
    .slice(0, 4)

  const topCreatives = aiCreatives
    .filter(c => c.roas > 0)
    .sort((a, b) => b.roas - a.roas)
    .slice(0, 5)

  const recentCampaigns = aiCampaigns
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3)

  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const hasData = products.length > 0

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1 capitalize">{todayLabel}</p>
        </div>
        <button
          onClick={() => navigate('/command-center')}
          className="flex items-center gap-2 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-600/30 text-violet-300 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
        >
          <span>🧠</span> Command Center
        </button>
      </div>

      {hasData ? (
        <>
          {/* ── Financial KPIs ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
            <StatCard label="Gasto Total" value={formatCurrency(totalSpend)} />
            <StatCard
              label="Receita Total"
              value={formatCurrency(totalRevenue)}
              color={totalRevenue > totalSpend ? 'text-emerald-400' : totalRevenue > 0 ? 'text-amber-400' : 'text-white'}
              sub={revTrend !== null
                ? `${revTrend >= 0 ? '▲' : '▼'} ${Math.abs(revTrend).toFixed(0)}% vs sem. anterior`
                : undefined}
            />
            <StatCard
              label="Lucro"
              value={formatCurrency(profit)}
              color={profit >= 0 ? 'text-emerald-400' : 'text-red-400'}
              sub={profit >= 0 ? '✓ Positivo' : '⚠ Negativo'}
            />
            <StatCard
              label="ROAS Médio"
              value={avgRoas > 0 ? `${avgRoas.toFixed(2)}x` : '—'}
              accent={avgRoas >= 2}
              color={avgRoas >= 3 ? 'text-emerald-400' : avgRoas >= 2 ? 'text-violet-400' : avgRoas >= 1 ? 'text-amber-400' : 'text-red-400'}
              sub={avgRoas >= 3 ? 'Excelente' : avgRoas >= 2 ? 'Bom' : avgRoas > 0 ? 'Abaixo do ideal' : '—'}
            />
            <StatCard label="CPA Médio" value={avgCpa > 0 ? formatCurrency(avgCpa) : '—'} sub="por conversão" />
            <StatCard label="CTR Médio" value={avgCtr > 0 ? `${avgCtr.toFixed(2)}%` : '—'} />
          </div>

          {/* ── Inventory KPIs ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatCard
              label="Produtos"
              value={products.length}
              sub={`${products.filter(p => p.status === 'validado').length} validados`}
              onClick={() => navigate('/produtos')}
            />
            <StatCard
              label="Campanhas Ativas"
              value={activeCampaigns}
              sub={`${aiCampaigns.length} total`}
              accent={activeCampaigns > 0}
              onClick={() => navigate('/campanhas')}
            />
            <StatCard
              label="Criativos Vencedores"
              value={winnersCount}
              sub="vencedor + escalar"
              color={winnersCount > 0 ? 'text-emerald-400' : 'text-white'}
              onClick={() => navigate('/criativos')}
            />
            <StatCard
              label="Em Teste"
              value={testingCount}
              sub={`de ${aiCreatives.length} criativos`}
              color={testingCount > 0 ? 'text-amber-400' : 'text-white'}
              onClick={() => navigate('/criativos')}
            />
          </div>

          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* ── Left (2/3): decisions + campaigns + insight ── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Pending Decisions */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <SectionHeader
                  icon="🤖" title="Decisões Pendentes"
                  link="/decisoes"
                />
                {pendingDecisions.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="text-2xl mb-2">🎉</div>
                    <p className="text-gray-500 text-sm">Nenhuma decisão pendente.</p>
                    <button onClick={() => navigate('/decisoes')} className="text-xs text-violet-400 hover:text-violet-300 mt-1.5">
                      Gerar decisões com IA →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs bg-red-600/20 text-red-400 border border-red-600/30 rounded-full px-2 py-0.5 font-medium">
                        {decisions.filter(d => d.status === 'pending' || d.status === 'in_progress').length} pendentes
                      </span>
                    </div>
                    {pendingDecisions.map(d => {
                      const product = tosDb.products.getById(d.product_id)
                      return (
                        <div
                          key={d.id}
                          className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
                          onClick={() => navigate('/decisoes')}
                        >
                          <span className="text-lg flex-shrink-0 mt-0.5">
                            {d.decision_type === 'pause' ? '⏸' :
                             d.decision_type === 'scale' ? '📈' :
                             d.decision_type === 'maintain' ? '✓' : '⚡'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="text-xs font-medium text-white">
                                {DECISION_TYPE_LABELS[d.decision_type] ?? d.decision_type}
                              </span>
                              {product && <span className="text-xs text-gray-500">· {product.name}</span>}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusColor(d.priority)}`}>
                                {PRIORITY_LABELS[d.priority] ?? d.priority}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-1">{d.reasoning}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Compliance + Report — side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Compliance summary */}
                <div
                  className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 cursor-pointer transition-all"
                  onClick={() => navigate('/compliance')}
                >
                  <SectionHeader icon="🛡️" title="Compliance" />
                  {latestCompliance ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Última Verificação</div>
                          <div className="text-sm font-medium text-white line-clamp-1">
                            {latestCompliance.product_name || latestCompliance.headline || '—'}
                          </div>
                          <div className="text-xs text-gray-500">{formatDate(latestCompliance.created_at)}</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${COMPLIANCE_RISK_COLORS(latestCompliance.analysis.risk_score)}`}>
                            {latestCompliance.analysis.risk_score}
                          </div>
                          <div className="text-[10px] text-gray-600">/ 10 risco</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${COMPLIANCE_STATUS_COLORS[latestCompliance.analysis.status] ?? ''}`}>
                          {COMPLIANCE_STATUS_LABELS[latestCompliance.analysis.status] ?? latestCompliance.analysis.status}
                        </span>
                        {highRiskChecks > 0 && (
                          <span className="text-xs text-orange-400">
                            ⚠ {highRiskChecks} check{highRiskChecks > 1 ? 's' : ''} de risco
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500">{allCompliance.length} verificações totais</div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-2xl mb-1.5">🛡️</div>
                      <p className="text-xs text-gray-500 mb-2">Nenhuma verificação ainda</p>
                      <span className="text-xs text-violet-400">Analisar copy →</span>
                    </div>
                  )}
                </div>

                {/* Latest Report */}
                <div
                  className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 cursor-pointer transition-all"
                  onClick={() => navigate('/relatorios')}
                >
                  <SectionHeader icon="📊" title="Último Relatório" />
                  {latestReport ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{RELATORIO_TYPE_ICONS[latestReport.type]}</span>
                        <div>
                          <div className="text-xs font-medium text-white line-clamp-1">{latestReport.title}</div>
                          <div className="text-[10px] text-gray-500">
                            {RELATORIO_TYPE_LABELS[latestReport.type]} · {formatDate(latestReport.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-800 rounded-lg p-2.5 text-center">
                          <div className={`text-sm font-bold ${
                            latestReport.kpis.avg_roas >= 2 ? 'text-emerald-400' :
                            latestReport.kpis.avg_roas >= 1 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {latestReport.kpis.avg_roas.toFixed(2)}x
                          </div>
                          <div className="text-[10px] text-gray-500">ROAS</div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-2.5 text-center">
                          <div className={`text-sm font-bold ${latestReport.kpis.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            R${Math.abs(latestReport.kpis.profit).toFixed(0)}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {latestReport.kpis.profit >= 0 ? 'lucro' : 'prejuízo'}
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-500">{allReports.length} relatórios gerados</div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-2xl mb-1.5">📊</div>
                      <p className="text-xs text-gray-500 mb-2">Nenhum relatório ainda</p>
                      <span className="text-xs text-violet-400">Gerar relatório →</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Campaigns */}
              {recentCampaigns.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <SectionHeader icon="📢" title="Campanhas Recentes" link="/campanhas" />
                  <div className="space-y-2">
                    {recentCampaigns.map(c => {
                      const product = tosDb.products.getById(c.product_id)
                      const creativeCount = tosDb.aiCreatives.getByCampaign(c.id).length
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                          onClick={() => navigate(`/campanhas/${c.id}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-white truncate">
                              {c.strategy?.nome_estrategico ?? c.id}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {product?.name ?? '—'} · {CHANNEL_LABELS[c.channel] ?? c.channel} · {creativeCount} criativo{creativeCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${getStatusColor(c.status)}`}>
                            {c.status}
                          </span>
                          <span className="text-xs text-gray-600">{formatDate(c.created_at)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Latest AI Insight */}
              {latestInsight && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <SectionHeader icon="✦" title="Último Insight de IA" link="/metricas" linkLabel="Ver Métricas →" />
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-[10px] text-emerald-400 uppercase tracking-wide mb-1">O que funciona</div>
                      <p className="text-xs text-gray-300 line-clamp-3">{latestInsight.o_que_funciona}</p>
                    </div>
                    <div>
                      <div className="text-[10px] text-red-400 uppercase tracking-wide mb-1">O que falha</div>
                      <p className="text-xs text-gray-300 line-clamp-3">{latestInsight.o_que_falha}</p>
                    </div>
                  </div>
                  {latestInsight.proximos_testes.length > 0 && (
                    <div className="pt-3 border-t border-gray-800">
                      <div className="text-[10px] text-violet-400 uppercase tracking-wide mb-2">Próximos testes</div>
                      <div className="flex flex-wrap gap-1.5">
                        {latestInsight.proximos_testes.slice(0, 3).map((t, i) => (
                          <span key={i} className="text-xs text-gray-300 bg-gray-800 rounded px-2 py-1">→ {t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] text-gray-600 mt-2">
                    Gerado em {new Date(latestInsight.generated_at).toLocaleString('pt-BR')}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right (1/3): quick actions + top criativos + products ── */}
            <div className="space-y-5">

              {/* Quick Actions */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-3">Ações Rápidas</h2>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/produtos/novo')}
                    className="w-full text-left bg-violet-600/10 hover:bg-violet-600/20 border border-violet-600/30 rounded-lg p-3 transition-colors"
                  >
                    <div className="text-xs font-medium text-violet-300">📦 Novo Produto</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Cadastrar produto</div>
                  </button>
                  <button
                    onClick={() => navigate('/campanhas/nova')}
                    className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg p-3 transition-colors"
                  >
                    <div className="text-xs font-medium text-white">📢 Gerar Campanha</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Estratégia completa com IA</div>
                  </button>
                  <button
                    onClick={() => navigate('/criativos/novo')}
                    className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg p-3 transition-colors"
                  >
                    <div className="text-xs font-medium text-white">🎨 Gerar Criativo</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Briefing + roteiro + copies</div>
                  </button>
                  <button
                    onClick={() => navigate('/metricas/novo')}
                    className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg p-3 transition-colors"
                  >
                    <div className="text-xs font-medium text-white">📈 Inserir Métrica</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Registrar performance manual</div>
                  </button>
                  <button
                    onClick={() => navigate('/metricas/importar')}
                    className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg p-3 transition-colors"
                  >
                    <div className="text-xs font-medium text-white">📂 Importar CSV</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Importar do Meta/Google/TikTok</div>
                  </button>
                  <button
                    onClick={() => navigate('/decisoes')}
                    className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg p-3 transition-colors"
                  >
                    <div className="text-xs font-medium text-white">🤖 Decisões IA</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Analisar dados e decidir</div>
                  </button>
                  <button
                    onClick={() => navigate('/compliance')}
                    className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg p-3 transition-colors"
                  >
                    <div className="text-xs font-medium text-white">🛡️ Analisar Compliance</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Verificar risco de anúncios</div>
                  </button>
                  <button
                    onClick={() => navigate('/relatorios')}
                    className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg p-3 transition-colors"
                  >
                    <div className="text-xs font-medium text-white">📊 Gerar Relatório</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Relatório executivo com IA</div>
                  </button>
                </div>
              </div>

              {/* Top Creatives by ROAS */}
              {topCreatives.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <SectionHeader icon="🏆" title="Top Criativos" link="/criativos" />
                  <div className="space-y-2.5">
                    {topCreatives.map((c, i) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => navigate(`/criativos/${c.id}`)}
                      >
                        <span className="text-xs text-gray-600 w-4 flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-white group-hover:text-violet-300 truncate transition-colors">
                            {c.strategy?.nome ?? '—'}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusColor(c.status)}`}>
                              {AI_CREATIVE_STATUS_LABELS[c.status] ?? c.status}
                            </span>
                            <span className="text-[10px] text-gray-500">CTR {c.ctr.toFixed(2)}%</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 flex-shrink-0">
                          {c.roas.toFixed(2)}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Products summary */}
              {products.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <SectionHeader icon="📦" title="Produtos" link="/produtos" />
                  <div className="space-y-1">
                    {products.slice(0, 5).map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between py-1.5 cursor-pointer group"
                        onClick={() => navigate(`/produtos/${p.id}`)}
                      >
                        <span className="text-xs text-gray-300 group-hover:text-white transition-colors truncate max-w-[140px]">
                          {p.name}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(p.status)}`}>
                          {p.status}
                        </span>
                      </div>
                    ))}
                    {products.length > 5 && (
                      <button
                        onClick={() => navigate('/produtos')}
                        className="text-xs text-gray-600 hover:text-gray-400 pt-1 transition-colors"
                      >
                        +{products.length - 5} outros →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Module shortcuts */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-3">Módulos IA</h2>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { path: '/plano-diario',       icon: '📅', label: 'Plano Diário'     },
                    { path: '/escala',             icon: '🚀', label: 'Escala'           },
                    { path: '/remarketing',        icon: '🔁', label: 'Remarketing'      },
                    { path: '/landing-publisher',  icon: '🖥️', label: 'Landings'         },
                    { path: '/video-ai',           icon: '🎥', label: 'Video AI'         },
                    { path: '/autopilot',          icon: '🎯', label: 'Auto-Pilot'       },
                    { path: '/full-auto',          icon: '🤖', label: 'Full Auto'        },
                    { path: '/command-center',     icon: '🧠', label: 'Command Center'   },
                  ].map(m => (
                    <button
                      key={m.path}
                      onClick={() => navigate(m.path)}
                      className="flex items-center gap-2 p-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
                    >
                      <span className="text-sm">{m.icon}</span>
                      <span className="text-xs text-gray-300">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ── Empty state ── */
        <div className="mt-4 space-y-5">
          {/* Hero */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">⚡</div>
            <h2 className="text-lg font-bold text-white mb-2">Bem-vindo ao TrafficOS</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              Sua plataforma de inteligência para tráfego pago. Comece cadastrando um produto para gerar campanhas, criativos e análises com IA.
            </p>
            <button
              onClick={() => navigate('/produtos/novo')}
              className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-6 rounded-lg transition-colors"
            >
              Cadastrar Primeiro Produto
            </button>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: '🧠', title: 'Command Center', desc: 'Visão 360° de toda operação', path: '/command-center' },
              { icon: '📊', title: 'Relatórios IA', desc: 'Análise executiva automática', path: '/relatorios' },
              { icon: '🛡️', title: 'Compliance', desc: 'Segurança de anúncios', path: '/compliance' },
              { icon: '🎯', title: 'Auto-Pilot', desc: 'Otimização automática', path: '/autopilot' },
            ].map(f => (
              <button
                key={f.path}
                onClick={() => navigate(f.path)}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 text-left transition-all"
              >
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="text-xs font-semibold text-white">{f.title}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
