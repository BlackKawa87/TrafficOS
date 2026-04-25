import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n'
import { tosDb } from '../store/storage'
import { formatCurrency, getStatusColor, DECISION_TYPE_LABELS } from '../utils/helpers'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className={`bg-gray-900 border rounded-xl p-5 ${accent ? 'border-violet-700/50' : 'border-gray-800'}`}>
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-2xl font-bold ${accent ? 'text-violet-400' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { t } = useLanguage()
  const navigate = useNavigate()

  const products = tosDb.products.getAll()
  const campaigns = tosDb.campaigns.getAll()
  const creatives = tosDb.creatives.getAll()
  const metrics = tosDb.metrics.getAll()
  const decisions = tosDb.decisions.getAll()

  const totalSpend = metrics.reduce((s, m) => s + m.spend, 0)
  const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0)
  const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0)
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0

  const pendingDecisions = decisions
    .filter(d => d.status === 'pending' || d.status === 'in_progress')
    .sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 }
      return pOrder[a.priority] - pOrder[b.priority]
    })
    .slice(0, 5)

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t('dash.title')}</h1>
        <p className="text-gray-400 text-sm mt-1 capitalize">{today}</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          label={t('dash.total_products')}
          value={products.length}
          sub={`${products.filter(p => p.status === 'validado').length} validados`}
        />
        <StatCard
          label={t('dash.in_testing')}
          value={products.filter(p => p.status === 'em_teste').length}
          sub={`de ${products.length} produtos`}
        />
        <StatCard
          label={t('dash.active_campaigns')}
          value={campaigns.filter(c => c.status === 'ativa').length}
          sub={`${campaigns.length} total`}
        />
        <StatCard
          label={t('dash.creatives_testing')}
          value={creatives.filter(c => c.status === 'testing').length}
        />
        <StatCard
          label={t('dash.winner_creatives')}
          value={creatives.filter(c => c.status === 'winner').length}
          accent
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={t('dash.total_spend')}
          value={formatCurrency(totalSpend)}
          sub="acumulado"
        />
        <StatCard
          label={t('dash.total_revenue')}
          value={formatCurrency(totalRevenue)}
          accent={totalRevenue > totalSpend}
          sub={totalRevenue > totalSpend ? '✓ Lucrativo' : totalRevenue > 0 ? '⚠ Prejuízo' : '—'}
        />
        <StatCard
          label={t('dash.avg_roas')}
          value={avgRoas > 0 ? `${avgRoas.toFixed(2)}x` : '—'}
          accent={avgRoas >= 2}
          sub={avgRoas >= 3 ? '✓ Excelente' : avgRoas >= 2 ? 'Bom' : avgRoas > 0 ? '⚠ Abaixo' : ''}
        />
        <StatCard
          label={t('dash.avg_cpa')}
          value={avgCpa > 0 ? formatCurrency(avgCpa) : '—'}
          sub="por conversão"
        />
      </div>

      {/* AI Suggested Actions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <h2 className="text-sm font-semibold text-white">{t('dash.suggested_actions')}</h2>
          </div>
          <button
            onClick={() => navigate('/decisoes')}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            {t('dash.view_all')} →
          </button>
        </div>

        {pendingDecisions.length === 0 ? (
          <p className="text-gray-500 text-sm">{t('dash.no_actions')}</p>
        ) : (
          <div className="space-y-3">
            {pendingDecisions.map(d => {
              const product = tosDb.products.getById(d.product_id)
              return (
                <div
                  key={d.id}
                  className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
                  onClick={() => navigate('/decisoes')}
                >
                  <div className="mt-0.5">
                    {d.decision_type === 'pause' && <span className="text-red-400">⏸</span>}
                    {d.decision_type === 'scale' && <span className="text-emerald-400">📈</span>}
                    {d.decision_type === 'maintain' && <span className="text-blue-400">✓</span>}
                    {d.decision_type === 'improve' && <span className="text-violet-400">⚡</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-white">
                        {DECISION_TYPE_LABELS[d.decision_type]}
                      </span>
                      {product && (
                        <span className="text-xs text-gray-400">· {product.name}</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusColor(d.priority)}`}>
                        {d.priority}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{d.reasoning}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <button
          onClick={() => navigate('/produtos/novo')}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-3 px-4 rounded-lg transition-colors"
        >
          + Novo Produto
        </button>
        <button
          onClick={() => navigate('/campanhas')}
          className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium py-3 px-4 rounded-lg transition-colors"
        >
          📢 Campanhas
        </button>
        <button
          onClick={() => navigate('/metricas')}
          className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium py-3 px-4 rounded-lg transition-colors"
        >
          📈 Inserir Métricas
        </button>
        <button
          onClick={() => navigate('/plano-diario')}
          className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium py-3 px-4 rounded-lg transition-colors"
        >
          📅 Plano Diário
        </button>
      </div>
    </div>
  )
}
