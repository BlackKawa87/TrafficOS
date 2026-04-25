import { useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '../i18n'
import { tosDb } from '../store/storage'
import { formatCurrency, formatDate, getStatusColor, CATEGORY_LABELS, BILLING_LABELS, PLATFORM_LABELS, FORMAT_LABELS, DECISION_TYPE_LABELS } from '../utils/helpers'

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="py-2 border-b border-gray-800/50 last:border-0">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm text-gray-200">{value}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  )
}

export default function ProdutoDetalhe() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  if (!id) return null
  const product = tosDb.products.getById(id)

  if (!product) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">Produto não encontrado.</p>
        <button onClick={() => navigate('/produtos')} className="mt-3 text-violet-400 hover:text-violet-300 text-sm">
          ← Voltar para Produtos
        </button>
      </div>
    )
  }

  const campaigns = tosDb.campaigns.getByProduct(id)
  const creatives = tosDb.creatives.getByProduct(id)
  const metrics = tosDb.metrics.getByProduct(id)
  const decisions = tosDb.decisions.getByProduct(id)
  const diagnoses = tosDb.diagnoses.getByProduct(id)
  const latestDiag = diagnoses[0] ?? null

  const totalSpend = metrics.reduce((s, m) => s + m.spend, 0)
  const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <button onClick={() => navigate('/produtos')} className="hover:text-white transition-colors">
              {t('prod.title')}
            </button>
            <span>/</span>
            <span className="text-gray-300">{product.name}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{product.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full ${getStatusColor(product.status)}`}>
              {t(`status.${product.status}` as Parameters<typeof t>[0])}
            </span>
            {product.offer_score !== null && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                product.offer_score >= 70 ? 'bg-emerald-900/50 text-emerald-300' :
                product.offer_score >= 45 ? 'bg-amber-900/50 text-amber-300' :
                'bg-red-900/50 text-red-300'
              }`}>
                Score: {product.offer_score}/100
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">
            {CATEGORY_LABELS[product.category]} · {product.market} · {product.language}
          </p>
        </div>
        <button
          onClick={() => navigate(`/produtos/${id}/editar`)}
          className="text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
        >
          {t('prod.edit')}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <button
          onClick={() => navigate(`/oferta/${id}`)}
          className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium py-3 px-3 rounded-lg transition-colors text-center"
        >
          🔬 {t('prod.diagnose')}
        </button>
        <button
          onClick={() => navigate(`/campanhas?produto=${id}`)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium py-3 px-3 rounded-lg transition-colors text-center"
        >
          📢 {t('prod.gen_campaign')}
        </button>
        <button
          onClick={() => navigate(`/criativos?produto=${id}`)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium py-3 px-3 rounded-lg transition-colors text-center"
        >
          🎨 {t('prod.gen_creative')}
        </button>
        <button
          onClick={() => navigate(`/metricas?produto=${id}`)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium py-3 px-3 rounded-lg transition-colors text-center"
        >
          📈 {t('prod.add_metrics')}
        </button>
        <button
          onClick={() => navigate(`/decisoes?produto=${id}`)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium py-3 px-3 rounded-lg transition-colors text-center"
        >
          🤖 {t('prod.ai_decision')}
        </button>
      </div>

      {/* Metrics Summary */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Gasto Total</div>
            <div className="text-lg font-bold text-white">{formatCurrency(totalSpend)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Receita Total</div>
            <div className={`text-lg font-bold ${totalRevenue > totalSpend ? 'text-emerald-400' : 'text-white'}`}>
              {formatCurrency(totalRevenue)}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">ROAS Médio</div>
            <div className="text-lg font-bold text-white">
              {totalSpend > 0 ? `${(totalRevenue / totalSpend).toFixed(2)}x` : '—'}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Diagnóstico</div>
            <div className={`text-lg font-bold ${
              latestDiag
                ? latestDiag.total_score >= 70 ? 'text-emerald-400'
                : latestDiag.total_score >= 45 ? 'text-amber-400'
                : 'text-red-400'
                : 'text-gray-600'
            }`}>
              {latestDiag ? `${latestDiag.total_score}/100` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Offer Details */}
        <div className="lg:col-span-2 space-y-5">
          <Section title={t('prod.section_offer')}>
            <InfoRow label={t('prod.target_audience')} value={product.target_audience} />
            <InfoRow label={t('prod.main_pain')} value={product.main_pain} />
            <InfoRow label={t('prod.main_desire')} value={product.main_desire} />
            <InfoRow label={t('prod.main_benefit')} value={product.main_benefit} />
            <InfoRow label={t('prod.main_promise')} value={product.main_promise} />
            <InfoRow label={t('prod.unique_mechanism')} value={product.unique_mechanism} />
          </Section>

          <Section title={t('prod.section_market')}>
            <InfoRow label={t('prod.main_objections')} value={product.main_objections} />
            <InfoRow label={t('prod.competitors')} value={product.competitors} />
            {product.sales_page_url && (
              <div className="py-2 border-b border-gray-800/50">
                <div className="text-xs text-gray-500 mb-0.5">{t('prod.sales_page')}</div>
                <a href={product.sales_page_url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-violet-400 hover:text-violet-300 truncate block">
                  {product.sales_page_url}
                </a>
              </div>
            )}
            {product.checkout_url && (
              <div className="py-2">
                <div className="text-xs text-gray-500 mb-0.5">{t('prod.checkout')}</div>
                <a href={product.checkout_url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-violet-400 hover:text-violet-300 truncate block">
                  {product.checkout_url}
                </a>
              </div>
            )}
          </Section>

          {product.notes && (
            <Section title={t('prod.section_notes')}>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{product.notes}</p>
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Section title={t('prod.section_basics')}>
            <InfoRow label={t('prod.category')} value={CATEGORY_LABELS[product.category]} />
            <InfoRow label={t('prod.niche')} value={product.niche} />
            <InfoRow label={t('prod.market')} value={product.market} />
            <InfoRow label={t('prod.language')} value={product.language} />
            <InfoRow
              label={t('prod.price')}
              value={product.price > 0 ? formatCurrency(product.price, product.currency) : null}
            />
            <InfoRow label={t('prod.billing')} value={BILLING_LABELS[product.billing_model]} />
            <InfoRow label="Atualizado em" value={formatDate(product.updated_at)} />
          </Section>

          {/* Linked data summary */}
          <Section title={t('prod.linked_data')}>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Campanhas</span>
                <span className="text-white font-medium">{campaigns.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Criativos</span>
                <span className="text-white font-medium">{creatives.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Registros de Métricas</span>
                <span className="text-white font-medium">{metrics.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Decisões IA</span>
                <span className="text-white font-medium">{decisions.length}</span>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* Campaigns */}
      <div className="mb-5">
        <Section title="Campanhas">
          {campaigns.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('prod.no_campaigns')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">Nome</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">Plataforma</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">Budget/dia</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => (
                    <tr key={c.id} className="border-b border-gray-800/30">
                      <td className="py-2 px-3 text-gray-200">{c.name}</td>
                      <td className="py-2 px-3 text-gray-400">{PLATFORM_LABELS[c.platform]}</td>
                      <td className="py-2 px-3 text-gray-400">
                        {c.daily_budget > 0 ? formatCurrency(c.daily_budget, c.currency) : '—'}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(c.status)}`}>
                          {t(`status.${c.status}` as Parameters<typeof t>[0])}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {/* Creatives */}
      <div className="mb-5">
        <Section title="Criativos">
          {creatives.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('prod.no_creatives')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {creatives.map(c => (
                <div key={c.id} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white truncate">{c.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0 ${getStatusColor(c.status)}`}>
                      {t(`status.${c.status}` as Parameters<typeof t>[0])}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">{FORMAT_LABELS[c.format]}</div>
                  {c.hook && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{c.hook}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Decisions */}
      <div>
        <Section title="Decisões IA">
          {decisions.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('prod.no_decisions')}</p>
          ) : (
            <div className="space-y-3">
              {decisions.slice(0, 5).map(d => (
                <div key={d.id} className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg">
                  <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${getStatusColor(d.decision_type)}`}>
                    {DECISION_TYPE_LABELS[d.decision_type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 line-clamp-2">{d.reasoning}</p>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getStatusColor(d.priority)}`}>{d.priority}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getStatusColor(d.status)}`}>
                        {t(`status.${d.status}` as Parameters<typeof t>[0])}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
