import { useState, useEffect, useRef, useCallback } from 'react'
import { tosDb, generateId, now } from '../store/storage'
import {
  formatDateTime,
  CLOUD_JOB_TYPE_LABELS,
  CLOUD_JOB_TYPE_ICONS,
  CLOUD_JOB_TYPE_DESC,
  CLOUD_JOB_STATUS_LABELS,
  CLOUD_JOB_STATUS_COLORS,
  CLOUD_JOB_PRIORITY_COLORS,
  CLOUD_LOG_LEVEL_COLORS,
  CLOUD_LOG_LEVEL_BG,
  CLOUD_ALERT_COLORS,
  CLOUD_ALERT_ICONS,
} from '../utils/helpers'
import type {
  CloudOpsState,
  CloudJob,
  CloudLogEntry,
  CloudAlert,
  CloudJobType,
  CloudJobPriority,
  CloudJobStatus,
  CloudLogLevel,
  CloudAlertSeverity,
} from '../types'

// ─── Job definitions ──────────────────────────────────────────────────────────

interface JobDef {
  type: CloudJobType
  priority: CloudJobPriority
  schedule_label: string
  demo_interval: number  // ms — for live demo, much shorter than real
  running_logs: string[]
  success_msg: string
  error_msg: string
}

const JOB_DEFS: JobDef[] = [
  {
    type: 'monitor_campaigns',
    priority: 'critical',
    schedule_label: 'A cada 2 min',
    demo_interval: 14000,
    running_logs: [
      'Varrendo campanhas ativas...',
      'Verificando thresholds de ROAS e CPA...',
      'Analisando tendências de CTR nas últimas 4h...',
    ],
    success_msg: '✓ {n} campanha(s) verificada(s). Nenhuma anomalia crítica detectada.',
    error_msg: 'Timeout ao acessar dados de campanha. Retry agendado.',
  },
  {
    type: 'sync_metrics',
    priority: 'high',
    schedule_label: 'A cada 5 min',
    demo_interval: 20000,
    running_logs: [
      'Conectando às fontes de dados integradas...',
      'Processando métricas de performance por criativo...',
      'Calculando ROAS, CPA e CTR consolidados...',
    ],
    success_msg: '✓ Métricas sincronizadas. {n} registros atualizados em {ms}ms.',
    error_msg: 'Falha de conexão com fonte de dados. Última sincronização mantida.',
  },
  {
    type: 'auto_pause',
    priority: 'high',
    schedule_label: 'A cada 15 min',
    demo_interval: 38000,
    running_logs: [
      'Verificando regras de pausa automática...',
      'Analisando campanhas com ROAS abaixo do mínimo...',
      'Aplicando decisões dentro dos limites de segurança...',
    ],
    success_msg: '✓ Verificação concluída. {n} ação(ões) de pausa registrada(s).',
    error_msg: 'Limite de orçamento não definido. Pausa automática abortada por segurança.',
  },
  {
    type: 'auto_scale',
    priority: 'high',
    schedule_label: 'A cada 15 min',
    demo_interval: 42000,
    running_logs: [
      'Verificando campanhas com ROAS acima do target...',
      'Calculando incremento de budget seguro...',
      'Aplicando escala controlada dentro dos limites...',
    ],
    success_msg: '✓ Escala aplicada em {n} campanha(s). Budget ajustado dentro dos limites.',
    error_msg: 'Orçamento máximo atingido. Escala automática bloqueada por segurança.',
  },
  {
    type: 'update_decisions',
    priority: 'medium',
    schedule_label: 'A cada 30 min',
    demo_interval: 55000,
    running_logs: [
      'Analisando performance recente das campanhas...',
      'Aplicando regras de decisão estratégica...',
      'Atualizando prioridades da fila de decisões...',
    ],
    success_msg: '✓ {n} decisão(ões) recalculada(s). Prioridades atualizadas.',
    error_msg: 'Dados insuficientes para gerar novas decisões. Aguardando mais dados.',
  },
  {
    type: 'update_daily_plan',
    priority: 'medium',
    schedule_label: 'A cada hora',
    demo_interval: 70000,
    running_logs: [
      'Coletando tarefas e alertas pendentes...',
      'Priorizando ações por impacto potencial no ROI...',
      'Recalculando plano diário...',
    ],
    success_msg: '✓ Plano diário atualizado. {n} tarefa(s) repriorizada(s).',
    error_msg: 'Nenhum produto ativo encontrado. Plano não gerado.',
  },
  {
    type: 'generate_report',
    priority: 'medium',
    schedule_label: 'A cada hora',
    demo_interval: 85000,
    running_logs: [
      'Coletando dados dos últimos 7 dias...',
      'Processando performance por canal e criativo...',
      'Compilando insights e recomendações estratégicas...',
    ],
    success_msg: '✓ Relatório consolidado gerado. {n} insight(s) identificado(s).',
    error_msg: 'Dados insuficientes para relatório completo. Aguardando mais métricas.',
  },
  {
    type: 'generate_creatives',
    priority: 'low',
    schedule_label: 'A cada 6 horas',
    demo_interval: 110000,
    running_logs: [
      'Analisando padrões de criativos vencedores...',
      'Identificando hooks e copies de alto desempenho...',
      'Gerando variações e salvando na biblioteca...',
    ],
    success_msg: '✓ {n} nova(s) variação(ões) de criativo gerada(s) e salva(s) na biblioteca.',
    error_msg: 'Dados de padrões insuficientes. Aguardando mais dados de performance.',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeJobId(type: CloudJobType): string {
  return `job_${type}`
}

function createInitialState(): CloudOpsState {
  const n = now()
  const jobs: CloudJob[] = JOB_DEFS.map((def, i) => ({
    id: makeJobId(def.type),
    type: def.type,
    status: 'pending' as CloudJobStatus,
    priority: def.priority,
    enabled: true,
    next_run: new Date(Date.now() + def.demo_interval * 0.3 + i * 3000).toISOString(),
    run_count: 0,
    success_count: 0,
    error_count: 0,
    updated_at: n,
  }))
  return {
    enabled: false,
    jobs,
    logs: [],
    alerts: [],
    total_runs: 0,
    total_successes: 0,
    total_errors: 0,
    updated_at: n,
  }
}

function formatCountdown(nextRun: string): string {
  const ms = new Date(nextRun).getTime() - Date.now()
  if (ms <= 0) return 'Agora'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function formatUptime(startedAt?: string): string {
  if (!startedAt) return '—'
  const ms = Date.now() - new Date(startedAt).getTime()
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

function formatDuration(ms?: number): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function successRate(total: number, successes: number): string {
  if (total === 0) return '—'
  return `${Math.round((successes / total) * 100)}%`
}

type Tab = 'dashboard' | 'jobs' | 'logs' | 'alerts'

// ─── Component ────────────────────────────────────────────────────────────────

export default function CloudOps() {
  const [ops, setOps] = useState<CloudOpsState | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [logFilter, setLogFilter] = useState<string>('all')
  const [tick, setTick] = useState(0)  // forces re-render for countdowns

  const opsRef = useRef<CloudOpsState | null>(null)
  const simTickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const uiTickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const runningRef = useRef(new Set<string>())

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = tosDb.cloudOps.get()
    const state = stored ?? createInitialState()
    // Always start disabled — simulation is session-only
    const fresh: CloudOpsState = { ...state, enabled: false, session_started_at: undefined }
    opsRef.current = fresh
    setOps(fresh)

    // UI tick for countdowns & uptime
    uiTickRef.current = setInterval(() => setTick(t => t + 1), 1000)
    return () => {
      if (uiTickRef.current) clearInterval(uiTickRef.current)
      if (simTickRef.current) clearInterval(simTickRef.current)
    }
  }, [])

  // ── Update helper ─────────────────────────────────────────────────────────
  const updateOps = useCallback((fn: (s: CloudOpsState) => CloudOpsState) => {
    setOps(prev => {
      if (!prev) return prev
      const next = fn(prev)
      opsRef.current = next
      tosDb.cloudOps.save(next)
      return next
    })
  }, [])

  // ── Simulation tick ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!ops?.enabled) {
      if (simTickRef.current) { clearInterval(simTickRef.current); simTickRef.current = null }
      return
    }

    const runTick = () => {
      const state = opsRef.current
      if (!state?.enabled) return

      // Find due jobs (next_run <= now, enabled, not already running)
      const due = state.jobs
        .filter(j => j.enabled && !runningRef.current.has(j.id) && j.status !== 'running' && new Date(j.next_run).getTime() <= Date.now())
        .sort((a, b) => {
          const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
          return (order[a.priority] ?? 4) - (order[b.priority] ?? 4)
        })

      if (due.length === 0) return

      // Run up to 1 job per tick
      const job = due[0]
      const def = JOB_DEFS.find(d => d.type === job.type)
      if (!def) return

      runningRef.current.add(job.id)
      const startedAt = new Date().toISOString()

      // Build running log entries
      const runLogs: CloudLogEntry[] = def.running_logs.map(msg => ({
        id: generateId(),
        job_id: job.id,
        job_type: job.type,
        job_name: CLOUD_JOB_TYPE_LABELS[job.type],
        level: 'info' as CloudLogLevel,
        message: msg,
        timestamp: startedAt,
      }))

      updateOps(s => ({
        ...s,
        jobs: s.jobs.map(j => j.id === job.id ? { ...j, status: 'running' as CloudJobStatus, updated_at: startedAt } : j),
        logs: [...runLogs, ...s.logs].slice(0, 300),
        updated_at: startedAt,
      }))

      // Complete after delay
      const delay = 1800 + Math.random() * 2200
      setTimeout(() => {
        const isError = Math.random() < 0.08
        const finishedAt = new Date().toISOString()
        const duration = Math.round(delay)
        const n = Math.floor(Math.random() * 18) + 3

        const resultMsg = isError
          ? def.error_msg
          : def.success_msg.replace('{n}', String(n)).replace('{ms}', String(duration))

        const resultLog: CloudLogEntry = {
          id: generateId(),
          job_id: job.id,
          job_type: job.type,
          job_name: CLOUD_JOB_TYPE_LABELS[job.type],
          level: (isError ? 'error' : 'success') as CloudLogLevel,
          message: resultMsg,
          timestamp: finishedAt,
        }

        // Possibly generate an alert on error
        const newAlert: CloudAlert | null = isError && Math.random() < 0.6 ? {
          id: generateId(),
          severity: job.priority === 'critical' ? 'critical' : 'warning' as CloudAlertSeverity,
          title: `Falha: ${CLOUD_JOB_TYPE_LABELS[job.type]}`,
          message: def.error_msg,
          job_type: job.type,
          acknowledged: false,
          created_at: finishedAt,
        } : null

        runningRef.current.delete(job.id)

        updateOps(s => {
          const nextRun = new Date(Date.now() + def.demo_interval).toISOString()
          return {
            ...s,
            jobs: s.jobs.map(j => j.id === job.id ? {
              ...j,
              status: (isError ? 'error' : 'completed') as CloudJobStatus,
              last_run: startedAt,
              last_duration_ms: duration,
              last_result: isError ? undefined : resultMsg,
              last_error: isError ? def.error_msg : undefined,
              next_run: nextRun,
              run_count: j.run_count + 1,
              success_count: isError ? j.success_count : j.success_count + 1,
              error_count: isError ? j.error_count + 1 : j.error_count,
              updated_at: finishedAt,
            } : j),
            logs: [resultLog, ...s.logs].slice(0, 300),
            alerts: newAlert ? [newAlert, ...s.alerts].slice(0, 100) : s.alerts,
            total_runs: s.total_runs + 1,
            total_successes: isError ? s.total_successes : s.total_successes + 1,
            total_errors: isError ? s.total_errors + 1 : s.total_errors,
            last_sync: job.type === 'sync_metrics' && !isError ? finishedAt : s.last_sync,
            updated_at: finishedAt,
          }
        })
      }, delay)
    }

    runTick() // run immediately
    simTickRef.current = setInterval(runTick, 3000)
    return () => { if (simTickRef.current) { clearInterval(simTickRef.current); simTickRef.current = null } }
  }, [ops?.enabled, updateOps])

  // ── Actions ───────────────────────────────────────────────────────────────
  function toggleSystem(enabled: boolean) {
    updateOps(s => ({
      ...s,
      enabled,
      session_started_at: enabled ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    }))
  }

  function toggleJob(jobId: string, enabled: boolean) {
    updateOps(s => ({
      ...s,
      jobs: s.jobs.map(j => j.id === jobId ? {
        ...j,
        enabled,
        status: enabled ? 'pending' as CloudJobStatus : 'disabled' as CloudJobStatus,
        updated_at: new Date().toISOString(),
      } : j),
      updated_at: new Date().toISOString(),
    }))
  }

  function runJobNow(jobId: string) {
    updateOps(s => ({
      ...s,
      jobs: s.jobs.map(j => j.id === jobId ? {
        ...j,
        next_run: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } : j),
    }))
  }

  function acknowledgeAlert(alertId: string) {
    updateOps(s => ({
      ...s,
      alerts: s.alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a),
    }))
  }

  function clearLogs() {
    updateOps(s => ({ ...s, logs: [] }))
  }

  function resetState() {
    runningRef.current.clear()
    const fresh = createInitialState()
    opsRef.current = fresh
    setOps(fresh)
    tosDb.cloudOps.save(fresh)
  }

  if (!ops) return <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-500">Carregando...</div>

  const runningJobs = ops.jobs.filter(j => j.status === 'running')
  const pendingAlerts = ops.alerts.filter(a => !a.acknowledged)
  const filteredLogs = logFilter === 'all' ? ops.logs : ops.logs.filter(l => l.level === logFilter)
  const rate = successRate(ops.total_runs, ops.total_successes)

  // Force re-render when tick changes (for countdowns/uptime)
  void tick

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ── Top header ── */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 shrink-0">
        <div className="flex items-center gap-5">
          {/* System toggle */}
          <div className="flex items-center gap-3">
            <div className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors ${ops.enabled ? 'bg-emerald-500' : 'bg-gray-700'}`}
              onClick={() => toggleSystem(!ops.enabled)}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${ops.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${ops.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                <span className={`text-sm font-bold ${ops.enabled ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {ops.enabled ? 'SISTEMA ATIVO' : 'SISTEMA INATIVO'}
                </span>
              </div>
              {ops.enabled && ops.session_started_at && (
                <div className="text-xs text-gray-500 font-mono">Uptime: {formatUptime(ops.session_started_at)}</div>
              )}
            </div>
          </div>

          <div className="w-px h-10 bg-gray-700" />

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-lg font-bold text-white font-mono">{ops.total_runs.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Execuções</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold font-mono ${ops.total_errors > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{rate}</div>
              <div className="text-xs text-gray-500">Taxa de Sucesso</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold font-mono ${ops.total_errors > 0 ? 'text-red-400' : 'text-gray-500'}`}>{ops.total_errors}</div>
              <div className="text-xs text-gray-500">Erros</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-mono text-gray-300">{ops.last_sync ? formatDateTime(ops.last_sync) : '—'}</div>
              <div className="text-xs text-gray-500">Última Sync</div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {pendingAlerts.length > 0 && (
              <button
                onClick={() => setActiveTab('alerts')}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-900/30 text-amber-300 border border-amber-700/40 hover:bg-amber-900/50 transition-colors"
              >
                ⚠️ {pendingAlerts.length} alerta{pendingAlerts.length !== 1 ? 's' : ''}
              </button>
            )}
            {runningJobs.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-900/30 text-violet-300 border border-violet-700/40">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                {runningJobs.length} em execução
              </div>
            )}
            <button
              onClick={resetState}
              className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
            >
              ↺ Resetar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4">
          {(['dashboard', 'jobs', 'logs', 'alerts'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors relative ${activeTab === t ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
            >
              {t === 'dashboard' ? '📊 Dashboard' :
               t === 'jobs' ? '⚙️ Jobs' :
               t === 'logs' ? '📋 Logs' : '🔔 Alertas'}
              {t === 'alerts' && pendingAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {pendingAlerts.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── DASHBOARD ── */}
      {activeTab === 'dashboard' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Job queue */}
          <div className="w-1/2 border-r border-gray-800 overflow-y-auto p-5 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Fila de Execução</h2>
              <span className="text-xs text-gray-500">{ops.jobs.filter(j => j.enabled).length} jobs ativos</span>
            </div>
            {ops.jobs.map(job => {
              const isRunning = job.status === 'running'
              const isError = job.status === 'error'
              const icon = CLOUD_JOB_TYPE_ICONS[job.type]
              const priorityColor = CLOUD_JOB_PRIORITY_COLORS[job.priority]
              return (
                <div
                  key={job.id}
                  className={`bg-gray-900 border rounded-xl p-4 transition-all ${
                    isRunning ? 'border-violet-600/50 bg-violet-900/10' :
                    isError ? 'border-red-700/40' :
                    'border-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`text-xl shrink-0 ${isRunning ? 'animate-pulse' : ''}`}>{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white truncate">{CLOUD_JOB_TYPE_LABELS[job.type]}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${CLOUD_JOB_STATUS_COLORS[job.status]}`}>
                          {isRunning ? '● ' : ''}{CLOUD_JOB_STATUS_LABELS[job.status]}
                        </span>
                        <span className={`text-xs ${priorityColor}`}>●</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {isRunning ? (
                          <span className="text-violet-400 animate-pulse">Executando...</span>
                        ) : (
                          <span>Próxima: <span className="text-gray-300 font-mono">{formatCountdown(job.next_run)}</span></span>
                        )}
                        {job.last_run && <span>Última: {formatDateTime(job.last_run)}</span>}
                        <span className="font-mono">{job.run_count} runs · {job.success_count}✓ {job.error_count > 0 ? `${job.error_count}✗` : ''}</span>
                      </div>
                      {job.last_error && isError && (
                        <div className="mt-1.5 text-xs text-red-400 truncate">{job.last_error}</div>
                      )}
                      {job.last_result && job.status === 'completed' && (
                        <div className="mt-1 text-xs text-emerald-400 truncate">{job.last_result}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {ops.enabled && job.enabled && !isRunning && (
                        <button
                          onClick={() => runJobNow(job.id)}
                          title="Executar agora"
                          className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded border border-gray-700 hover:border-gray-600 transition-colors"
                        >
                          ▶
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {!ops.enabled && (
              <div className="mt-4 p-4 bg-gray-900/50 border border-dashed border-gray-700 rounded-xl text-center">
                <p className="text-gray-500 text-sm mb-3">Sistema inativo. Ative para iniciar os jobs.</p>
                <button
                  onClick={() => toggleSystem(true)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Ativar Sistema
                </button>
              </div>
            )}
          </div>

          {/* Live logs */}
          <div className="w-1/2 overflow-y-auto flex flex-col">
            <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-950 z-10">
              <h2 className="text-sm font-semibold text-white">Log em Tempo Real</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-mono">{ops.logs.length} entradas</span>
                {ops.logs.length > 0 && (
                  <button onClick={clearLogs} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                    Limpar
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 p-4 font-mono text-xs space-y-1">
              {ops.logs.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-600">
                  {ops.enabled ? 'Aguardando logs...' : 'Ative o sistema para ver logs.'}
                </div>
              ) : (
                ops.logs.slice(0, 80).map(log => (
                  <div key={log.id} className="flex items-start gap-2 py-0.5 border-b border-gray-800/50">
                    <span className="text-gray-600 shrink-0 text-[10px] pt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                    <span className={`shrink-0 text-[10px] px-1 py-0.5 rounded font-bold ${CLOUD_LOG_LEVEL_BG[log.level]}`}>
                      {log.level === 'success' ? 'OK' : log.level.toUpperCase()}
                    </span>
                    <span className="text-gray-400 shrink-0">{CLOUD_JOB_TYPE_ICONS[log.job_type]}</span>
                    <span className={`flex-1 ${CLOUD_LOG_LEVEL_COLORS[log.level]} leading-relaxed`}>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── JOBS ── */}
      {activeTab === 'jobs' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Configuração de Jobs</h2>
              <div className="text-xs text-gray-500">{ops.jobs.filter(j => j.enabled).length}/{ops.jobs.length} ativos</div>
            </div>
            <div className="space-y-3">
              {ops.jobs.map(job => {
                const def = JOB_DEFS.find(d => d.type === job.type)!
                const isRunning = job.status === 'running'
                return (
                  <div key={job.id} className={`bg-gray-900 border rounded-xl p-5 transition-all ${isRunning ? 'border-violet-600/40' : job.enabled ? 'border-gray-800' : 'border-gray-800 opacity-60'}`}>
                    <div className="flex items-start gap-4">
                      <div className="text-2xl shrink-0">{CLOUD_JOB_TYPE_ICONS[job.type]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="text-white font-semibold">{CLOUD_JOB_TYPE_LABELS[job.type]}</span>
                          <span className={`text-xs ${CLOUD_JOB_PRIORITY_COLORS[job.priority]}`}>● {job.priority.toUpperCase()}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${CLOUD_JOB_STATUS_COLORS[job.status]}`}>
                            {CLOUD_JOB_STATUS_LABELS[job.status]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-3 leading-relaxed">{CLOUD_JOB_TYPE_DESC[job.type]}</p>
                        <div className="grid grid-cols-5 gap-4 text-xs">
                          <div>
                            <div className="text-gray-500 mb-0.5">Frequência</div>
                            <div className="text-gray-300 font-mono">{def.schedule_label}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-0.5">Próxima execução</div>
                            <div className="text-gray-300 font-mono">{job.enabled ? formatCountdown(job.next_run) : '—'}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-0.5">Total de runs</div>
                            <div className="text-gray-300 font-mono">{job.run_count}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-0.5">Taxa de sucesso</div>
                            <div className={`font-mono ${job.error_count > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {successRate(job.run_count, job.success_count)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-0.5">Última duração</div>
                            <div className="text-gray-300 font-mono">{formatDuration(job.last_duration_ms)}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {ops.enabled && job.enabled && !isRunning && (
                          <button
                            onClick={() => runJobNow(job.id)}
                            className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                          >
                            ▶ Executar
                          </button>
                        )}
                        <div
                          className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${job.enabled ? 'bg-emerald-500' : 'bg-gray-700'}`}
                          onClick={() => toggleJob(job.id, !job.enabled)}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${job.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Security box */}
            <div className="mt-6 bg-gray-900 border border-amber-700/30 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-amber-400 mb-3">🛡 Regras de Segurança Ativas</h3>
              <ul className="space-y-2">
                {[
                  'Ações financeiras só executam dentro do orçamento máximo definido por produto.',
                  'Pausas automáticas não escalam budget — apenas reduzem ou param.',
                  'Todas as ações automáticas são registradas no log com timestamp e resultado.',
                  'O sistema pode ser desligado a qualquer momento pelo toggle acima.',
                  'Nenhuma ação irreversível (exclusão, transferência) é executada automaticamente.',
                ].map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                    <span className="text-emerald-500 shrink-0 font-bold">✓</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGS ── */}
      {activeTab === 'logs' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-800 flex items-center gap-3 shrink-0">
            <span className="text-sm font-semibold text-white">Logs Técnicos</span>
            <span className="text-xs text-gray-500 font-mono">{filteredLogs.length} entradas</span>
            <div className="flex items-center gap-1 ml-auto">
              {['all', 'success', 'error', 'warn', 'info', 'debug'].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setLogFilter(lvl)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${logFilter === lvl ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {lvl === 'all' ? 'Todos' : lvl.toUpperCase()}
                </button>
              ))}
              {ops.logs.length > 0 && (
                <button onClick={clearLogs} className="text-xs text-red-500 hover:text-red-400 ml-2 px-2.5 py-1 rounded-lg border border-red-900/50 hover:border-red-700/50 transition-colors">
                  Limpar
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
                <tr>
                  <th className="text-left text-gray-500 px-4 py-2 font-medium w-28">Hora</th>
                  <th className="text-left text-gray-500 px-2 py-2 font-medium w-16">Nível</th>
                  <th className="text-left text-gray-500 px-2 py-2 font-medium w-8">Job</th>
                  <th className="text-left text-gray-500 px-2 py-2 font-medium">Mensagem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-gray-600">{ops.enabled ? 'Nenhum log ainda.' : 'Ative o sistema para gerar logs.'}</td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className={`hover:bg-gray-900/30 ${log.level === 'error' ? 'bg-red-950/20' : log.level === 'warn' ? 'bg-amber-950/10' : ''}`}>
                      <td className="px-4 py-1.5 text-gray-600 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</td>
                      <td className="px-2 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${CLOUD_LOG_LEVEL_BG[log.level]}`}>
                          {log.level === 'success' ? 'OK' : log.level.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">{CLOUD_JOB_TYPE_ICONS[log.job_type]}</td>
                      <td className={`px-2 py-1.5 ${CLOUD_LOG_LEVEL_COLORS[log.level]}`}>{log.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ALERTS ── */}
      {activeTab === 'alerts' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Alertas</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{pendingAlerts.length} não reconhecido{pendingAlerts.length !== 1 ? 's' : ''}</span>
                {pendingAlerts.length > 0 && (
                  <button
                    onClick={() => updateOps(s => ({ ...s, alerts: s.alerts.map(a => ({ ...a, acknowledged: true })) }))}
                    className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    Reconhecer todos
                  </button>
                )}
              </div>
            </div>

            {ops.alerts.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-gray-400 text-sm">Nenhum alerta registrado.</p>
                <p className="text-gray-600 text-xs mt-1">Quando houver falhas ou anomalias, aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ops.alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`border rounded-xl p-4 transition-all ${CLOUD_ALERT_COLORS[alert.severity]} ${alert.acknowledged ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0">{CLOUD_ALERT_ICONS[alert.severity]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-white">{alert.title}</span>
                          <span className="text-xs text-gray-500">{formatDateTime(alert.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">{alert.message}</p>
                        {alert.job_type && (
                          <div className="mt-2 text-xs text-gray-500">
                            Job: {CLOUD_JOB_TYPE_ICONS[alert.job_type]} {CLOUD_JOB_TYPE_LABELS[alert.job_type]}
                          </div>
                        )}
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="shrink-0 text-xs text-gray-500 hover:text-white px-2 py-1 rounded border border-gray-700 hover:border-gray-600 transition-colors"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Integrations future */}
            <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Integrações de Automação</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-700/40">Em breve</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: '🗄', name: 'Supabase', desc: 'Edge Functions' },
                  { icon: '▲', name: 'Vercel', desc: 'Cron Jobs' },
                  { icon: '🔗', name: 'Pipedream', desc: 'Workflows' },
                  { icon: '⚙️', name: 'Make', desc: 'Cenários' },
                  { icon: '🤖', name: 'n8n', desc: 'Automação' },
                  { icon: '☁️', name: 'Cloudflare', desc: 'Workers' },
                ].map(int => (
                  <div key={int.name} className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg opacity-50">
                    <span>{int.icon}</span>
                    <div>
                      <div className="text-xs font-medium text-gray-300">{int.name}</div>
                      <div className="text-xs text-gray-600">{int.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
