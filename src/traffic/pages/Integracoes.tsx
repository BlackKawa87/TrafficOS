import { useState, useEffect, useRef } from 'react'
import { tosDb } from '../store/storage'
import {
  CONNECTION_STATUS_COLORS,
  CONNECTION_STATUS_LABELS,
  META_OBJECTIVE_LABELS,
  TIKTOK_OBJECTIVE_LABELS,
  META_CAMPAIGN_STATUS_COLORS,
  TIKTOK_CAMPAIGN_STATUS_COLORS,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDateTime,
} from '../utils/helpers'
import type {
  MetaCredentials,
  TikTokCredentials,
  PlatformSync,
  SyncedCampaign,
  IntegrationPlatform,
  ConnectionStatus,
} from '../types'

// ─── Campaign objective options ───────────────────────────────────────────────

const TOS_OBJECTIVES = [
  { value: 'vendas_conversao', label: 'Vendas / Conversão' },
  { value: 'captacao_leads', label: 'Captação de Leads' },
  { value: 'trafego_pagina', label: 'Tráfego para Página' },
  { value: 'awareness', label: 'Awareness' },
  { value: 'remarketing', label: 'Remarketing' },
  { value: 'escala', label: 'Escala' },
  { value: 'teste_criativo', label: 'Teste de Criativo' },
  { value: 'validacao_oferta', label: 'Validação de Oferta' },
]

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, icon, sub }: { label: string; value: string; icon: string; sub?: string }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-bold text-white">{value}</div>
      {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

// ─── Campaign table ───────────────────────────────────────────────────────────

function CampaignTable({ campaigns, platform }: { campaigns: SyncedCampaign[]; platform: IntegrationPlatform }) {
  const statusColors = platform === 'meta' ? META_CAMPAIGN_STATUS_COLORS : TIKTOK_CAMPAIGN_STATUS_COLORS
  const objectiveLabels = platform === 'meta' ? META_OBJECTIVE_LABELS : TIKTOK_OBJECTIVE_LABELS

  if (campaigns.length === 0) {
    return <p className="text-sm text-gray-600 italic py-4">Nenhuma campanha encontrada.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800">
            {['Campanha', 'Status', 'Objetivo', 'Gasto', 'Impressões', 'Cliques', 'CTR', 'CPC'].map(h => (
              <th key={h} className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {campaigns.map(c => (
            <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
              <td className="py-2.5 px-3 text-gray-200 font-medium max-w-[200px] truncate">{c.name}</td>
              <td className="py-2.5 px-3">
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[c.status] ?? 'bg-gray-700 text-gray-400'}`}>
                  {c.status.replace('CAMPAIGN_STATUS_', '').replace('OUTCOME_', '')}
                </span>
              </td>
              <td className="py-2.5 px-3 text-gray-400">{objectiveLabels[c.objective] ?? c.objective}</td>
              <td className="py-2.5 px-3 text-gray-300">{c.spend != null ? formatCurrency(c.spend) : '—'}</td>
              <td className="py-2.5 px-3 text-gray-300">{c.impressions != null ? formatNumber(c.impressions) : '—'}</td>
              <td className="py-2.5 px-3 text-gray-300">{c.clicks != null ? formatNumber(c.clicks) : '—'}</td>
              <td className="py-2.5 px-3 text-gray-300">{c.ctr != null ? formatPercent(c.ctr) : '—'}</td>
              <td className="py-2.5 px-3 text-gray-300">{c.cpc != null ? formatCurrency(c.cpc) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Credentials Modal ────────────────────────────────────────────────────────

interface CredentialsModalProps {
  platform: IntegrationPlatform
  existing: MetaCredentials | TikTokCredentials | null
  onSave: (creds: MetaCredentials | TikTokCredentials) => void
  onClose: () => void
}

function CredentialsModal({ platform, existing, onSave, onClose }: CredentialsModalProps) {
  const isMeta = platform === 'meta'
  const metaExisting = existing as MetaCredentials | null
  const ttExisting = existing as TikTokCredentials | null

  const [accessToken, setAccessToken] = useState(
    isMeta ? (metaExisting?.access_token ?? '') : (ttExisting?.access_token ?? '')
  )
  const [accountId, setAccountId] = useState(isMeta ? (metaExisting?.ad_account_id ?? '') : '')
  const [advertiserId, setAdvertiserId] = useState(!isMeta ? (ttExisting?.advertiser_id ?? '') : '')

  function handleSave() {
    if (!accessToken.trim()) return
    if (isMeta) {
      onSave({ access_token: accessToken.trim(), ad_account_id: accountId.trim() } as MetaCredentials)
    } else {
      onSave({ access_token: accessToken.trim(), advertiser_id: advertiserId.trim() } as TikTokCredentials)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-xl">{isMeta ? '📘' : '🎵'}</span>
            <div>
              <h2 className="text-sm font-bold text-white">Conectar {isMeta ? 'Meta Ads' : 'TikTok Ads'}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Suas credenciais ficam salvas localmente</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Security notice */}
          <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-3 text-xs text-amber-300 flex items-start gap-2">
            <span className="flex-shrink-0 mt-0.5">🔒</span>
            <span>Tokens são armazenados localmente no seu navegador e enviados apenas ao backend da plataforma para realizar as chamadas à API.</span>
          </div>

          {/* Access Token */}
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">
              Access Token *
            </label>
            <textarea
              value={accessToken}
              onChange={e => setAccessToken(e.target.value)}
              rows={3}
              placeholder={isMeta ? 'EAAxxxxxx...' : 'Seu TikTok Access Token'}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
            <p className="text-[10px] text-gray-600 mt-1">
              {isMeta
                ? 'Obtenha em: Meta Business Suite → Configurações → Contas de anúncios → API'
                : 'Obtenha em: TikTok Ads Manager → Ativos → Credenciais da API'}
            </p>
          </div>

          {/* Meta: Ad Account ID */}
          {isMeta && (
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">
                Ad Account ID *
              </label>
              <input
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                placeholder="act_1234567890 ou 1234567890"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
              />
              <p className="text-[10px] text-gray-600 mt-1">Formato: act_XXXXXXXXXX (o prefixo act_ é adicionado automaticamente)</p>
            </div>
          )}

          {/* TikTok: Advertiser ID */}
          {!isMeta && (
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">
                Advertiser ID *
              </label>
              <input
                value={advertiserId}
                onChange={e => setAdvertiserId(e.target.value)}
                placeholder="1234567890123"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
              />
              <p className="text-[10px] text-gray-600 mt-1">Encontre em: TikTok Ads Manager → URL da conta</p>
            </div>
          )}

          {/* Token permissions reminder */}
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-1">
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Permissões necessárias</p>
            {isMeta ? (
              <ul className="text-[11px] text-gray-400 space-y-0.5">
                <li>• <code className="text-gray-300">ads_management</code> — leitura e criação de campanhas</li>
                <li>• <code className="text-gray-300">ads_read</code> — leitura de métricas</li>
                <li>• <code className="text-gray-300">business_management</code> — acesso à conta</li>
              </ul>
            ) : (
              <ul className="text-[11px] text-gray-400 space-y-0.5">
                <li>• <code className="text-gray-300">Campaign Management</code> — leitura e criação</li>
                <li>• <code className="text-gray-300">Ad Reporting</code> — métricas</li>
              </ul>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!accessToken.trim() || (isMeta ? !accountId.trim() : !advertiserId.trim())}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            Salvar e Conectar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create Campaign Modal ────────────────────────────────────────────────────

interface CreateCampaignModalProps {
  platform: IntegrationPlatform
  onClose: () => void
  onCreated: (result: { campaign_id?: string; platform: string }) => void
}

function CreateCampaignModal({ platform, onClose, onCreated }: CreateCampaignModalProps) {
  const isMeta = platform === 'meta'
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('vendas_conversao')
  const [dailyBudget, setDailyBudget] = useState('50')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const aiCampaigns = tosDb.aiCampaigns.getAll().slice(0, 10)

  async function handleCreate() {
    if (!name.trim()) return
    setCreating(true)
    setError('')

    const creds = isMeta
      ? tosDb.integrations.getMeta()
      : tosDb.integrations.getTikTok()

    if (!creds) {
      setError('Nenhuma credencial salva. Conecte a conta primeiro.')
      setCreating(false)
      return
    }

    try {
      const endpoint = isMeta ? '/api/meta-create' : '/api/tiktok-create'
      const body = isMeta
        ? {
            ...(creds as MetaCredentials),
            name: name.trim(),
            objective,
            daily_budget_cents: Math.round(parseFloat(dailyBudget) * 100),
          }
        : {
            ...(creds as TikTokCredentials),
            name: name.trim(),
            objective,
            budget: parseFloat(dailyBudget),
          }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { campaign_id?: string; platform?: string; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erro ao criar campanha')
      onCreated({ campaign_id: data.campaign_id, platform: data.platform ?? platform })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-xl">{isMeta ? '📘' : '🎵'}</span>
            <div>
              <h2 className="text-sm font-bold text-white">Criar Campanha — {isMeta ? 'Meta Ads' : 'TikTok Ads'}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Campanha criada como PAUSADA para revisão</p>
            </div>
          </div>
          {!creating && (
            <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
          )}
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">Nome da Campanha *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: [Produto] — Conversão — Mai/2026"
              disabled={creating}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">Objetivo</label>
            <select
              value={objective}
              onChange={e => setObjective(e.target.value)}
              disabled={creating}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              {TOS_OBJECTIVES.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">
              Orçamento Diário (USD) *
            </label>
            <input
              value={dailyBudget}
              onChange={e => setDailyBudget(e.target.value)}
              type="number"
              min="1"
              step="1"
              disabled={creating}
              placeholder="50"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Optionally prefill from AI campaign */}
          {aiCampaigns.length > 0 && (
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">
                Pré-preencher de Campanha IA (opcional)
              </label>
              <select
                onChange={e => {
                  const c = aiCampaigns.find(a => a.id === e.target.value)
                  if (c) {
                    setName(c.strategy?.nome_estrategico ?? c.objective)
                    setObjective(c.objective)
                    setDailyBudget(String(c.daily_budget ?? 50))
                  }
                }}
                disabled={creating}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Selecione uma campanha...</option>
                {aiCampaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.strategy?.nome_estrategico ?? c.objective}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-3 text-xs text-red-400">{error}</div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {!creating && (
            <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors">
              Cancelar
            </button>
          )}
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim() || !dailyBudget}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {creating ? 'Criando...' : '+ Criar Campanha'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Platform Panel ───────────────────────────────────────────────────────────

interface PlatformPanelProps {
  platform: IntegrationPlatform
  refresh: number
  onRefresh: () => void
}

function PlatformPanel({ platform, onRefresh }: PlatformPanelProps) {
  const isMeta = platform === 'meta'
  const platformLabel = isMeta ? 'Meta Ads' : 'TikTok Ads'
  const platformIcon = isMeta ? '📘' : '🎵'
  const syncEndpoint = isMeta ? '/api/meta-sync' : '/api/tiktok-sync'

  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [syncData, setSyncData] = useState<PlatformSync | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [showCredModal, setShowCredModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createSuccess, setCreateSuccess] = useState('')
  const [autoSynced, setAutoSynced] = useState(false)

  const autoSyncRef = useRef(false)

  // Load from storage on mount
  useEffect(() => {
    const creds = isMeta ? tosDb.integrations.getMeta() : tosDb.integrations.getTikTok()
    const saved = isMeta ? tosDb.integrations.getMetaSync() : tosDb.integrations.getTikTokSync()
    if (creds) {
      setStatus('connected')
      if (saved) setSyncData(saved)
    }
  }, [isMeta])

  // Auto-sync once when connected + no recent sync (< 60 min)
  useEffect(() => {
    if (autoSyncRef.current) return
    if (status !== 'connected') return
    if (!syncData) {
      autoSyncRef.current = true
      setAutoSynced(true)
      handleSync()
      return
    }
    const age = Date.now() - new Date(syncData.synced_at).getTime()
    if (age > 60 * 60 * 1000) {
      autoSyncRef.current = true
      setAutoSynced(true)
      handleSync()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  async function handleSync() {
    const creds = isMeta ? tosDb.integrations.getMeta() : tosDb.integrations.getTikTok()
    if (!creds) return
    setSyncing(true)
    setSyncError('')
    setStatus('syncing')

    try {
      const body = isMeta
        ? { access_token: (creds as MetaCredentials).access_token, ad_account_id: (creds as MetaCredentials).ad_account_id }
        : { access_token: (creds as TikTokCredentials).access_token, advertiser_id: (creds as TikTokCredentials).advertiser_id }

      const res = await fetch(syncEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { sync?: PlatformSync; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erro ao sincronizar')

      const sync = data.sync!
      if (isMeta) {
        tosDb.integrations.saveMetaSync(sync)
      } else {
        tosDb.integrations.saveTikTokSync(sync)
      }
      setSyncData(sync)
      setStatus('connected')
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Erro desconhecido')
      setStatus('error')
    } finally {
      setSyncing(false)
    }
  }

  function handleSaveCredentials(creds: MetaCredentials | TikTokCredentials) {
    if (isMeta) {
      tosDb.integrations.saveMeta(creds as MetaCredentials)
    } else {
      tosDb.integrations.saveTikTok(creds as TikTokCredentials)
    }
    setShowCredModal(false)
    setStatus('connected')
    autoSyncRef.current = false
    setAutoSynced(false)
    handleSync()
  }

  function handleDisconnect() {
    if (!confirm(`Desconectar ${platformLabel}? Os dados sincronizados serão removidos.`)) return
    if (isMeta) {
      tosDb.integrations.deleteMeta()
    } else {
      tosDb.integrations.deleteTikTok()
    }
    setStatus('disconnected')
    setSyncData(null)
    setSyncError('')
    autoSyncRef.current = false
    setAutoSynced(false)
    onRefresh()
  }

  const isConnected = status === 'connected' || status === 'error'
  const creds = isMeta ? tosDb.integrations.getMeta() : tosDb.integrations.getTikTok()

  return (
    <div className="space-y-4">
      {/* Modals */}
      {showCredModal && (
        <CredentialsModal
          platform={platform}
          existing={creds}
          onSave={handleSaveCredentials}
          onClose={() => setShowCredModal(false)}
        />
      )}
      {showCreateModal && (
        <CreateCampaignModal
          platform={platform}
          onClose={() => setShowCreateModal(false)}
          onCreated={result => {
            setShowCreateModal(false)
            setCreateSuccess(`✓ Campanha criada com ID: ${result.campaign_id}`)
            setTimeout(() => setCreateSuccess(''), 8000)
          }}
        />
      )}

      {/* Connection card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{platformIcon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{platformLabel}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${CONNECTION_STATUS_COLORS[status]}`}>
                  {syncing ? '⟳ Sincronizando...' : CONNECTION_STATUS_LABELS[status]}
                </span>
              </div>
              {isConnected && (
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {isMeta
                    ? `Conta: ${(creds as MetaCredentials)?.ad_account_id ?? '—'}`
                    : `Advertiser: ${(creds as TikTokCredentials)?.advertiser_id ?? '—'}`}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isConnected ? (
              <button
                onClick={() => setShowCredModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                🔌 Conectar
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowCreateModal(true)}
                  disabled={syncing}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  + Criar Campanha
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 text-xs rounded-lg transition-colors"
                >
                  {syncing ? '⟳' : '🔄'} Sincronizar
                </button>
                <button
                  onClick={() => setShowCredModal(true)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs rounded-lg transition-colors"
                  title="Editar credenciais"
                >
                  ⚙
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-red-900/50 text-gray-500 hover:text-red-400 text-xs rounded-lg transition-colors"
                  title="Desconectar"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sync status */}
        {syncData && (
          <div className="mt-3 pt-3 border-t border-gray-800 text-[11px] text-gray-500 flex items-center gap-2">
            <span>Última sincronização: {formatDateTime(syncData.synced_at)}</span>
            {autoSynced && <span className="text-blue-500">• Auto-sync</span>}
          </div>
        )}
        {syncError && (
          <div className="mt-3 pt-3 border-t border-red-900/30 text-xs text-red-400 flex items-start gap-2">
            <span>⚠</span><span>{syncError}</span>
          </div>
        )}
        {createSuccess && (
          <div className="mt-3 pt-3 border-t border-emerald-900/30 text-xs text-emerald-400">
            {createSuccess}
          </div>
        )}
      </div>

      {/* Metrics overview */}
      {syncData && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <MetricCard label="Gasto Total" value={formatCurrency(syncData.total_spend)} icon="💰" sub="Últimos 30 dias" />
            <MetricCard label="Impressões" value={formatNumber(syncData.total_impressions)} icon="👁" />
            <MetricCard label="Cliques" value={formatNumber(syncData.total_clicks)} icon="🖱" />
            <MetricCard label="CTR Médio" value={formatPercent(syncData.avg_ctr)} icon="📊" />
            <MetricCard label="CPC Médio" value={formatCurrency(syncData.avg_cpc)} icon="💲" />
          </div>

          {/* Campaign count badges */}
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span>🎯 <span className="text-white font-medium">{syncData.campaign_count}</span> campanhas</span>
            <span>·</span>
            <span>✅ <span className="text-emerald-400 font-medium">{syncData.active_count}</span> ativas</span>
            <span>·</span>
            <span>⏸ <span className="text-gray-400 font-medium">{syncData.campaign_count - syncData.active_count}</span> pausadas/outras</span>
          </div>

          {/* Campaigns table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Campanhas — últimos 30 dias
              </h3>
              <span className="text-[10px] text-gray-600">{syncData.campaigns.length} exibidas</span>
            </div>
            <div className="p-4">
              <CampaignTable campaigns={syncData.campaigns} platform={platform} />
            </div>
          </div>
        </>
      )}

      {/* Not connected empty state */}
      {!isConnected && (
        <div className="text-center py-10 text-gray-600 border border-dashed border-gray-800 rounded-xl">
          <span className="text-3xl block mb-3">{platformIcon}</span>
          <p className="text-sm">Conecte sua conta {platformLabel}</p>
          <p className="text-xs mt-1 text-gray-700">para sincronizar campanhas e métricas reais</p>
          <button
            onClick={() => setShowCredModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            🔌 Conectar agora
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Integracoes() {
  const [activeTab, setActiveTab] = useState<IntegrationPlatform>('meta')
  const [refresh, setRefresh] = useState(0)

  const metaCreds = tosDb.integrations.getMeta()
  const ttCreds = tosDb.integrations.getTikTok()

  const tabs: { id: IntegrationPlatform; label: string; icon: string; connected: boolean }[] = [
    { id: 'meta', label: 'Meta Ads', icon: '📘', connected: !!metaCreds },
    { id: 'tiktok', label: 'TikTok Ads', icon: '🎵', connected: !!ttCreds },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">🔌 Integrações de Tráfego</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Conecte suas contas de anúncios para ler métricas e criar campanhas diretamente da TrafficOS
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            {tabs.map(t => (
              <span
                key={t.id}
                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium ${
                  t.connected
                    ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40'
                    : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
              >
                {t.icon} {t.label} {t.connected ? '✓' : '—'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-4 flex items-start gap-3">
        <span className="text-blue-400 text-lg flex-shrink-0">ℹ</span>
        <div className="text-xs text-blue-300 space-y-1">
          <p className="font-medium">Como funciona</p>
          <p>As chamadas à API Meta e TikTok são feitas pelo backend da plataforma — seus tokens nunca são expostos diretamente ao navegador. A sincronização ocorre automaticamente ao abrir esta página (se houver conexão ativa) e pode ser feita manualmente a qualquer momento.</p>
        </div>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-2 border-b border-gray-800">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.id
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-base">{t.icon}</span>
            <span>{t.label}</span>
            {t.connected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        ))}
      </div>

      {/* Active panel */}
      <PlatformPanel
        key={activeTab}
        platform={activeTab}
        refresh={refresh}
        onRefresh={() => setRefresh(r => r + 1)}
      />
    </div>
  )
}
