import { useNavigate } from 'react-router-dom'
import { tosDb } from '../store/storage'
import {
  formatDate,
  getStatusColor,
  CREATIVE_CHANNEL_LABELS,
  CREATIVE_TYPE_LABELS,
  AI_CREATIVE_STATUS_LABELS,
} from '../utils/helpers'

function fmt(n: number, suffix = ''): string {
  if (!n) return '—'
  return `${n.toFixed(2)}${suffix}`
}

export default function Criativos() {
  const navigate = useNavigate()
  const creatives = tosDb.aiCreatives.getAll().sort((a, b) => b.created_at.localeCompare(a.created_at))
  const products = tosDb.products.getAll()
  const campaigns = tosDb.aiCampaigns.getAll()

  function getProduct(id: string) {
    return products.find(p => p.id === id)
  }
  function getCampaign(id: string) {
    return id ? campaigns.find(c => c.id === id) : undefined
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Criativos</h1>
          <p className="text-gray-400 text-sm mt-1">
            {creatives.length} {creatives.length === 1 ? 'criativo gerado' : 'criativos gerados'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/criativos/mix')}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center gap-2 border border-gray-700"
          >
            <span>⚡</span>
            Gerar Mix (6 Criativos)
          </button>
          <button
            onClick={() => navigate('/criativos/novo')}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2"
          >
            <span>✦</span>
            Gerar Criativo
          </button>
        </div>
      </div>

      {/* Empty state */}
      {creatives.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center">
          <div className="text-5xl mb-4">🎨</div>
          <p className="text-white font-medium text-lg mb-2">Nenhum criativo ainda</p>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Gere criativos com roteiro, hooks, copies e direção criativa completa em menos de 60 segundos.
          </p>
          <button
            onClick={() => navigate('/criativos/novo')}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-6 rounded-lg transition-colors"
          >
            Gerar Primeiro Criativo
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Nome</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Produto</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Campanha</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Canal</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Formato</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Ângulo</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">CTR</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">CPC</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">CPA</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">ROAS</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Data</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {creatives.map(c => {
                  const product = getProduct(c.product_id)
                  const campaign = getCampaign(c.campaign_id)
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/criativos/${c.id}`)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-white max-w-[180px] truncate">
                          {c.strategy.nome || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {product ? (
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/produtos/${product.id}`) }}
                            className="text-violet-400 hover:text-violet-300 text-xs"
                          >
                            {product.name}
                          </button>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        {campaign ? (
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/campanhas/${campaign.id}`) }}
                            className="text-violet-400 hover:text-violet-300 text-xs max-w-[120px] truncate block"
                          >
                            {campaign.strategy.nome_estrategico}
                          </button>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-xs whitespace-nowrap">
                        {CREATIVE_CHANNEL_LABELS[c.channel] ?? c.channel}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                        {CREATIVE_TYPE_LABELS[c.creative_type] ?? c.creative_type}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs max-w-[120px] truncate">
                        {c.angle || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(c.status)}`}>
                          {AI_CREATIVE_STATUS_LABELS[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-300 text-xs">{fmt(c.ctr, '%')}</td>
                      <td className="py-3 px-4 text-right text-gray-300 text-xs">{fmt(c.cpc)}</td>
                      <td className="py-3 px-4 text-right text-gray-300 text-xs">{fmt(c.cpa)}</td>
                      <td className="py-3 px-4 text-right text-xs">
                        {c.roas > 0
                          ? <span className="text-emerald-400 font-medium">{c.roas.toFixed(2)}x</span>
                          : <span className="text-gray-600">—</span>
                        }
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(c.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/criativos/${c.id}`) }}
                          className="text-xs text-violet-400 hover:text-violet-300 whitespace-nowrap font-medium"
                        >
                          Ver →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
