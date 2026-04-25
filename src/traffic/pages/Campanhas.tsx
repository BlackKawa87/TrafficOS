import { useNavigate } from 'react-router-dom'
import { tosDb } from '../store/storage'
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  OBJECTIVE_LABELS,
  CHANNEL_LABELS,
  PHASE_LABELS,
  AI_CAMPAIGN_STATUS_LABELS,
} from '../utils/helpers'

export default function Campanhas() {
  const navigate = useNavigate()
  const campaigns = tosDb.aiCampaigns.getAll().sort((a, b) => b.created_at.localeCompare(a.created_at))
  const products = tosDb.products.getAll()

  function getProduct(id: string) {
    return products.find(p => p.id === id)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Campanhas</h1>
          <p className="text-gray-400 text-sm mt-1">
            {campaigns.length} {campaigns.length === 1 ? 'campanha criada' : 'campanhas criadas'}
          </p>
        </div>
        <button
          onClick={() => navigate('/campanhas/nova')}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2"
        >
          <span>✦</span>
          Gerar Nova Campanha com IA
        </button>
      </div>

      {/* Empty state */}
      {campaigns.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center">
          <div className="text-5xl mb-4">📢</div>
          <p className="text-white font-medium text-lg mb-2">Nenhuma campanha ainda</p>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Use o gerador com IA para criar a estrutura estratégica completa de uma campanha em menos de 60 segundos.
          </p>
          <button
            onClick={() => navigate('/campanhas/nova')}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-6 rounded-lg transition-colors"
          >
            Gerar Primeira Campanha
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Nome da Campanha</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Produto</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Canal</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Objetivo</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Orçamento/dia</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Início</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Fase</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Resultado</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => {
                  const product = getProduct(c.product_id)
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/campanhas/${c.id}`)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-white truncate max-w-[200px]">
                          {c.strategy.nome_estrategico || '—'}
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
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-xs whitespace-nowrap">
                        {CHANNEL_LABELS[c.channel] ?? c.channel}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                        {OBJECTIVE_LABELS[c.objective] ?? c.objective}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(c.status)}`}>
                          {AI_CAMPAIGN_STATUS_LABELS[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-xs whitespace-nowrap">
                        {c.daily_budget > 0 ? formatCurrency(c.daily_budget, c.currency) : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                        {c.start_date ? formatDate(c.start_date) : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">
                        {PHASE_LABELS[c.phase] ?? c.phase}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs max-w-[160px] truncate">
                        {c.main_result || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/campanhas/${c.id}`) }}
                          className="text-xs text-violet-400 hover:text-violet-300 whitespace-nowrap transition-colors font-medium"
                        >
                          Ver Campanha →
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
