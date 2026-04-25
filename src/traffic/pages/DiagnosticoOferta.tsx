import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '../i18n'
import { tosDb, generateId, now } from '../store/storage'
import { formatDate } from '../utils/helpers'
import type { OfferDiagnosis } from '../types'

interface DimScore {
  key: keyof Omit<OfferDiagnosis, 'id' | 'product_id' | 'total_score' | 'notes' | 'created_at'>
  labelKey: string
  description: string
}

const DIMENSIONS: DimScore[] = [
  { key: 'headline_score', labelKey: 'diag.headline', description: 'O título chama atenção e comunica o benefício?' },
  { key: 'promise_score', labelKey: 'diag.promise', description: 'A promessa é clara, crível e desejável?' },
  { key: 'mechanism_score', labelKey: 'diag.mechanism', description: 'Existe um mecanismo único e diferenciador?' },
  { key: 'proof_score', labelKey: 'diag.proof', description: 'Há provas sociais convincentes (depoimentos, resultados)?' },
  { key: 'value_stack_score', labelKey: 'diag.value_stack', description: 'O valor percebido supera o preço pedido?' },
  { key: 'guarantee_score', labelKey: 'diag.guarantee', description: 'Existe garantia que remove o risco do comprador?' },
  { key: 'urgency_score', labelKey: 'diag.urgency', description: 'Há urgência ou escassez que motiva ação imediata?' },
  { key: 'price_score', labelKey: 'diag.price', description: 'O preço está bem posicionado vs. valor e concorrência?' },
]

function ScoreSlider({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className={`text-lg font-bold w-8 text-center ${
          value >= 7 ? 'text-emerald-400' : value >= 5 ? 'text-amber-400' : 'text-red-400'
        }`}>
          {value}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      <input
        type="range"
        min="0"
        max="10"
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-violet-500"
      />
      <div className="flex justify-between text-[10px] text-gray-600 mt-1">
        <span>0 Fraco</span>
        <span>5 Médio</span>
        <span>10 Excelente</span>
      </div>
    </div>
  )
}

export default function DiagnosticoOferta() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { produtoId } = useParams<{ produtoId: string }>()

  const product = produtoId ? tosDb.products.getById(produtoId) : null
  const history = produtoId ? tosDb.diagnoses.getByProduct(produtoId) : []

  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(DIMENSIONS.map(d => [d.key, 5]))
  )
  const [notes, setNotes] = useState('')

  function setScore(key: string, val: number) {
    setScores(prev => ({ ...prev, [key]: val }))
  }

  const totalScore = Math.round(
    DIMENSIONS.reduce((sum, d) => sum + (scores[d.key] ?? 5), 0) / DIMENSIONS.length * 10
  )

  function handleSave() {
    if (!produtoId) return
    const diagnosis: OfferDiagnosis = {
      id: generateId(),
      product_id: produtoId,
      headline_score: scores['headline_score'] ?? 5,
      promise_score: scores['promise_score'] ?? 5,
      mechanism_score: scores['mechanism_score'] ?? 5,
      proof_score: scores['proof_score'] ?? 5,
      value_stack_score: scores['value_stack_score'] ?? 5,
      guarantee_score: scores['guarantee_score'] ?? 5,
      urgency_score: scores['urgency_score'] ?? 5,
      price_score: scores['price_score'] ?? 5,
      total_score: totalScore,
      notes,
      created_at: now(),
    }
    tosDb.diagnoses.save(diagnosis)

    // Update product offer_score
    if (product) {
      tosDb.products.save({ ...product, offer_score: totalScore, updated_at: now() })
    }

    navigate(`/produtos/${produtoId}`)
  }

  if (!product) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">Produto não encontrado.</p>
        <button onClick={() => navigate('/produtos')} className="mt-3 text-violet-400 text-sm">← Voltar</button>
      </div>
    )
  }

  const scoreLabel = totalScore >= 70 ? t('diag.strong') : totalScore >= 45 ? t('diag.medium') : t('diag.weak')
  const scoreColor = totalScore >= 70 ? 'text-emerald-400' : totalScore >= 45 ? 'text-amber-400' : 'text-red-400'
  const scoreBg = totalScore >= 70 ? 'bg-emerald-900/30 border-emerald-700/50' : totalScore >= 45 ? 'bg-amber-900/30 border-amber-700/50' : 'bg-red-900/30 border-red-700/50'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(`/produtos/${produtoId}`)} className="text-gray-400 hover:text-white text-sm">
          ← {t('common.back')}
        </button>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t('diag.title')}</h1>
        <p className="text-gray-400 text-sm mt-1">{t('diag.for')}: <span className="text-white">{product.name}</span></p>
      </div>

      {/* Score Summary */}
      <div className={`border rounded-xl p-5 mb-6 flex items-center gap-6 ${scoreBg}`}>
        <div className="text-center">
          <div className={`text-5xl font-bold ${scoreColor}`}>{totalScore}</div>
          <div className="text-xs text-gray-500 mt-1">/ 100</div>
        </div>
        <div>
          <div className={`text-lg font-semibold ${scoreColor}`}>{scoreLabel}</div>
          <div className="w-40 h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                totalScore >= 70 ? 'bg-emerald-500' : totalScore >= 45 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${totalScore}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">{t('diag.score_hint')}</p>
        </div>
      </div>

      {/* Dimension Sliders */}
      <div className="space-y-3 mb-6">
        {DIMENSIONS.map(dim => (
          <ScoreSlider
            key={dim.key}
            label={t(dim.labelKey as Parameters<typeof t>[0])}
            description={dim.description}
            value={scores[dim.key] ?? 5}
            onChange={v => setScore(dim.key, v)}
          />
        ))}
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-gray-400 mb-2">{t('common.notes')}</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Observações sobre a oferta, pontos de melhoria..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end mb-8">
        <button
          onClick={() => navigate(`/produtos/${produtoId}`)}
          className="px-5 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
        >
          {t('diag.save')}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">{t('diag.history')}</h3>
          <div className="space-y-3">
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg">
                <div className="text-center w-12">
                  <div className={`text-xl font-bold ${
                    h.total_score >= 70 ? 'text-emerald-400' :
                    h.total_score >= 45 ? 'text-amber-400' : 'text-red-400'
                  }`}>{h.total_score}</div>
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-4 gap-1">
                    {DIMENSIONS.map(d => (
                      <div key={d.key} className="text-center">
                        <div className="text-[10px] text-gray-500 truncate">{d.key.split('_')[0]}</div>
                        <div className="text-xs font-medium text-gray-300">
                          {h[d.key as keyof OfferDiagnosis] as number}
                        </div>
                      </div>
                    ))}
                  </div>
                  {h.notes && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{h.notes}</p>}
                </div>
                <div className="text-xs text-gray-500">{formatDate(h.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
