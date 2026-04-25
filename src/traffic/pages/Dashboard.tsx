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
} from '../utils/helpers'

function StatCard({
  label, value, sub, accent, color,
}: {
  label: string; value: string | number; sub?: string; accent?: boolean; color?: string
}) {
  return (
    <div className={`bg-gray-900 border rounded-xl p-5 ${accent ? 'border-violet-700/50' : 'border-gray-800'}`}>
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-2xl font-bold ${color ?? (accent ? 'text-violet-400' : 'text-white')}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()

  const products = tosDb.products.getAll()
  const aiCampaigns = tosDb.aiCampaigns.getAll()
  const aiCreatives = tosDb.aiCreatives.getAll()
  const metrics = tosDb.metrics.getAll()
  const decisions = tosDb.decisions.getAll()
  const latestInsight = tosDb.insights.getLatest()

  const totalSpend = metrics.reduce((s, m) => s + m.spend, 0)
  const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0)
  const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0)
  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0)
  const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0)
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  const winnersCount = aiCreatives.filter(c => c.status === 'vencedor' || c.status === 'escalar').length
  const testingCount = aiCreatives.filter(c => c.status === 'em_teste').length
  const activeCampaigns = aiCampaigns.filter(c => c.status === 'ativa').length

  const pendingDecisions = decisions
    .filter(d => d.status === 'pending' || d.status === 'in_progress')
    .sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 }
      return pOrder[a.priority] - pOrder[b.priority]
    })
    .slice(0, 4)

  const topCreatives = aiCreatives
    .filter(c => c.roas > 0)
    .sort((a, b) => b.roas - a.roas)
    .slice(0, 5)

  const recentCampaigns = aiCampaigns
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 4)

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1 capitalize">{today}</p>
      </div>

      {/* KPI Grid — Performance */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <StatCard label="Gasto Total" value={formatCurrency(totalSpend)} />
        <StatCard
          label="Receita Total"
          value={formatCurrency(totalRevenue)}
          color={totalRevenue > totalSpend ? 'text-emerald-400' : totalRevenue > 0 ? 'text-amber-400' : 'text-white'}
          sub={totalRevenue > totalSpend ? '✓ Lucrativo' : totalRevenue > 0 ? '⚠ Prejuízo' : '—'}
        />
        <StatCard
          label="ROAS Médio"
          value={avgRoas > 0 ? `${avgRoas.toFixed(2)}x` : '—'}
          accent={avgRoas >= 2}
          color={avgRoas >= 3 ? 'text-emerald-400' : avgRoas >= 2 ? 'text-violet-400' : avgRoas >= 1 ? 'text-amber-400' : 'text-red-400'}
          sub={avgRoas >= 3 ? 'Excelente' : avgRoas >= 2 ? 'Bom' : avgRoas > 0 ? 'Abaixo do ideal' : ''}
        />
        <StatCard label="CPA Médio" value={avgCpa > 0 ? formatCurrency(avgCpa) : '—'} sub="por conversão" />
        <StatCard label="CTR Médio" value={avgCtr > 0 ? `${avgCtr.toFixed(2)}%` : '—'} />
        <StatCard label="Conversões" value={totalConversions > 0 ? totalConversions : '—'} />
      </div>

      {/* KPI Grid — Inventory */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Produtos"
          value={products.length}
          sub={`${products.filter(p => p.status === 'validado').length} validados`}
        />
        <StatCard
          label="Campanhas Ativas"
          value={activeCampaigns}
          sub={`${aiCampaigns.length} total`}
          accent={activeCampaigns > 0}
        />
        <StatCard
          label="Criativos Vencedores"
          value={winnersCount}
          sub="vencedor + escalar"
          color={winnersCount > 0 ? 'text-emerald-400' : 'text-white'}
        />
        <StatCard
          label="Em Teste"
          value={testingCount}
          sub={`de ${aiCreatives.length} criativos`}
          color={testingCount > 0 ? 'text-amber-400' : 'text-white'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column: decisions + insight */}
        <div className="lg:col-span-2 space-y-5">
          {/* Pending Decisions */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span>🤖</span>
                <h2 className="text-sm font-semibold text-white">Decisões Pendentes</h2>
                {pendingDecisions.length > 0 && (
                  <span className="text-xs bg-red-600/20 text-red-400 border border-red-600/30 rounded-full px-2 py-0.5 font-medium">
                    {decisions.filter(d => d.status === 'pending' || d.status === 'in_progress').length}
                  </span>
                )}
              </div>
              <button
                onClick={() => navigate('/decisoes')}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Ver tudo →
              </button>
            </div>

            {pendingDecisions.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-gray-500 text-sm">Nenhuma decisão pendente.</p>
                <button
                  onClick={() => navigate('/decisoes')}
                  className="text-xs text-violet-400 hover:text-violet-300 mt-2"
                >
                  Gerar decisões com IA →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingDecisions.map(d => {
                  const product = tosDb.products.getById(d.product_id)
                  return (
                    <div
                      key={d.id}
                      className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
                      onClick={() => navigate('/decisoes')}
                    >
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {d.decision_type === 'pause' ? '⏸' : d.decision_type === 'scale' ? '📈' : d.decision_type === 'maintain' ? '✓' : '⚡'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-xs font-medium text-white">{DECISION_TYPE_LABELS[d.decision_type]}</span>
                          {product && <span className="text-xs text-gray-400">· {product.name}</span>}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusColor(d.priority)}`}>
                            {PRIORITY_LABELS[d.priority]}
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

          {/* Latest Insight */}
          {latestInsight && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span>✦</span>
                  <h2 className="text-sm font-semibold text-white">Último Insight de IA</h2>
                </div>
                <button onClick={() => navigate('/metricas')} className="text-xs text-violet-400 hover:text-violet-300">
                  Ver Métricas →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <div className="text-[10px] text-violet-400 uppercase tracking-wide mb-2">Próximos testes</div>
                  <div className="flex flex-wrap gap-2">
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

          {/* Recent Campaigns */}
          {recentCampaigns.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span>📢</span>
                  <h2 className="text-sm font-semibold text-white">Campanhas Recentes</h2>
                </div>
                <button onClick={() => navigate('/campanhas')} className="text-xs text-violet-400 hover:text-violet-300">
                  Ver todas →
                </button>
              </div>
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
        </div>

        {/* Right column: top creatives + quick actions */}
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
                <div className="text-[10px] text-gray-500 mt-0.5">Cadastrar produto na plataforma</div>
              </button>
              <button
                onClick={() => navigate('/campanhas/nova')}
                className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg p-3 transition-colors"
              >
                <div className="text-xs font-medium text-white">📢 Gerar Campanha com IA</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Estratégia completa em 60s</div>
              </button>
              <button
                onClick={() => navigate('/criativos/novo')}
                className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg p-3 transition-colors"
              >
                <div className="text-xs font-medium text-white">🎨 Gerar Criativo com IA</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Briefing + roteiro + copies</div>
              </button>
              <button
                onClick={() => navigate('/metricas/novo')}
                className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg p-3 transition-colors"
              >
                <div className="text-xs font-medium text-white">📈 Inserir Métricas</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Registrar dados de performance</div>
              </button>
              <button
                onClick={() => navigate('/decisoes')}
                className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg p-3 transition-colors"
              >
                <div className="text-xs font-medium text-white">🤖 Gerar Decisões IA</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Analisar dados e decidir</div>
              </button>
            </div>
          </div>

          {/* Top Creatives by ROAS */}
          {topCreatives.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span>🏆</span>
                  <h2 className="text-sm font-semibold text-white">Top Criativos</h2>
                </div>
                <button onClick={() => navigate('/criativos')} className="text-xs text-violet-400 hover:text-violet-300">
                  Ver todos →
                </button>
              </div>
              <div className="space-y-2">
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
                    <span className="text-xs font-bold text-emerald-400 flex-shrink-0">{c.roas.toFixed(2)}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products summary */}
          {products.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span>📦</span>
                  <h2 className="text-sm font-semibold text-white">Produtos</h2>
                </div>
                <button onClick={() => navigate('/produtos')} className="text-xs text-violet-400 hover:text-violet-300">
                  Ver todos →
                </button>
              </div>
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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty state when no data */}
      {products.length === 0 && (
        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
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
      )}
    </div>
  )
}
