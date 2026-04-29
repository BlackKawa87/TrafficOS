import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LanguageProvider, useLanguage } from '../i18n'

// ─── Nav group definitions ───────────────────────────────────────────────────
type NavItem = { path: string; label: string; icon: string; end?: boolean }
type NavGroup = { id: string; label: string; labelEn: string; icon: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Visão Geral',
    labelEn: 'Overview',
    icon: '⊞',
    items: [
      { path: '/', label: 'Dashboard', icon: '⊞', end: true },
      { path: '/command-center', label: 'Command Center', icon: '🧠' },
      { path: '/plano-diario', label: 'Plano Diário', icon: '📅' },
      { path: '/relatorios', label: 'Relatórios', icon: '📊' },
    ],
  },
  {
    id: 'pipeline',
    label: '⚡ Pipeline IA',
    labelEn: '⚡ AI Pipeline',
    icon: '⚡',
    items: [
      { path: '/produtos/novo', label: 'Novo Pipeline', icon: '➕' },
      { path: '/produtos', label: 'Produtos Ativos', icon: '📦' },
    ],
  },
  {
    id: 'traffic',
    label: 'Tráfego',
    labelEn: 'Traffic',
    icon: '📢',
    items: [
      { path: '/produtos', label: 'Produtos', icon: '📦' },
      { path: '/campanhas', label: 'Campanhas', icon: '📢' },
      { path: '/criativos', label: 'Criativos', icon: '🎨' },
      { path: '/metricas', label: 'Métricas', icon: '📈' },
    ],
  },
  {
    id: 'ia',
    label: 'IA & Otimização',
    labelEn: 'AI & Optimization',
    icon: '🤖',
    items: [
      { path: '/decisoes', label: 'Decisões IA', icon: '🤖' },
      { path: '/escala', label: 'Motor de Escala', icon: '🚀' },
      { path: '/remarketing', label: 'Remarketing', icon: '🔁' },
      { path: '/expansao', label: 'Multi-Canal', icon: '🌐' },
      { path: '/inteligencia', label: 'Inteligência', icon: '🔮' },
      { path: '/multi-produto', label: 'Multi-Produto', icon: '🏆' },
    ],
  },
  {
    id: 'content',
    label: 'Conteúdo & Copy',
    labelEn: 'Content & Copy',
    icon: '✍️',
    items: [
      { path: '/email', label: 'Email Marketing', icon: '📧' },
      { path: '/whatsapp', label: 'WhatsApp', icon: '💬' },
      { path: '/vsl', label: 'Gerador de VSL', icon: '🎬' },
      { path: '/video-ai', label: 'Video AI', icon: '🎥' },
      { path: '/landing-page', label: 'Landing Pages', icon: '🖥️' },
      { path: '/landing-publisher', label: 'LP Publisher', icon: '⚡' },
    ],
  },
  {
    id: 'auto',
    label: 'Automação',
    labelEn: 'Automation',
    icon: '⚙️',
    items: [
      { path: '/autopilot', label: 'Auto-Pilot', icon: '🎯' },
      { path: '/auto-testing', label: 'Auto-Testing', icon: '🧪' },
      { path: '/ai-core', label: 'AI Core', icon: '💡' },
      { path: '/full-auto', label: 'Full Auto', icon: '🔄' },
    ],
  },
  {
    id: 'system',
    label: 'Sistema',
    labelEn: 'System',
    icon: '⚙️',
    items: [
      { path: '/compliance', label: 'Compliance', icon: '🛡️' },
      { path: '/integracoes', label: 'Integrações', icon: '🔌' },
      { path: '/cloud-ops', label: 'Cloud Ops', icon: '☁️' },
      { path: '/prompt-center', label: 'Prompt Center', icon: '📝' },
      { path: '/configuracoes', label: 'Configurações', icon: '⚙️' },
    ],
  },
]

const STORAGE_KEY = 'tos_nav_open'

function getInitialOpen(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  // Default: first two groups open
  const init: Record<string, boolean> = {}
  NAV_GROUPS.forEach((g, i) => { init[g.id] = i < 2 })
  return init
}

// ─── Inner component ─────────────────────────────────────────────────────────
const AI_LANGS = [
  { code: 'pt-BR', flag: '🇧🇷', short: 'PT' },
  { code: 'en-US', flag: '🇺🇸', short: 'EN' },
  { code: 'es',    flag: '🇪🇸', short: 'ES' },
  { code: 'fr',    flag: '🇫🇷', short: 'FR' },
  { code: 'de',    flag: '🇩🇪', short: 'DE' },
  { code: 'it',    flag: '🇮🇹', short: 'IT' },
]

function LayoutInner() {
  const { lang, setLang } = useLanguage()
  const location = useLocation()
  const [open, setOpen] = useState<Record<string, boolean>>(getInitialOpen)
  const [aiLang, setAiLangState] = useState<string>(
    () => localStorage.getItem('tos_ai_lang') ?? 'pt-BR'
  )

  function setAiLang(code: string) {
    setAiLangState(code)
    localStorage.setItem('tos_ai_lang', code)
  }

  // Auto-expand the group that contains the active route
  useEffect(() => {
    const active = location.pathname
    const groupId = active.startsWith('/pipeline')
      ? 'pipeline'
      : NAV_GROUPS.find(g =>
          g.items.some(item =>
            item.end
              ? active === item.path
              : active === item.path || active.startsWith(item.path + '/')
          )
        )?.id
    if (groupId) {
      setOpen(prev => {
        if (prev[groupId]) return prev
        const next = { ...prev, [groupId]: true }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
    }
  }, [location.pathname])

  function toggle(id: string) {
    setOpen(prev => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function isGroupActive(group: NavGroup) {
    const active = location.pathname
    if (group.id === 'pipeline' && active.startsWith('/pipeline')) return true
    return group.items.some(item =>
      item.end
        ? active === item.path
        : active === item.path || active.startsWith(item.path + '/')
    )
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
              ⚡
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-none">TrafficOS</div>
              <div className="text-[10px] text-gray-500 mt-0.5">Paid Traffic Intelligence</div>
            </div>
          </div>
        </div>

        {/* Guia link — always visible at top */}
        <div className="px-3 pt-2.5 pb-1">
          <NavLink
            to="/guia"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-violet-600/20 text-violet-400'
                  : 'bg-violet-600/10 text-violet-400 hover:bg-violet-600/20'
              }`
            }
          >
            <span>📖</span>
            <span>{lang === 'en' ? 'How to Use' : 'Guia de Uso'}</span>
          </NavLink>
        </div>

        {/* Navigation groups */}
        <nav className="flex-1 py-1 overflow-y-auto">
          {NAV_GROUPS.map(group => {
            const isOpen = open[group.id] ?? false
            const groupActive = isGroupActive(group)

            return (
              <div key={group.id} className="mb-0.5">
                {/* Group header */}
                <button
                  onClick={() => toggle(group.id)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                    groupActive
                      ? 'text-violet-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <span>{lang === 'en' ? group.labelEn : group.label}</span>
                  <span
                    className={`text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                  >
                    ▶
                  </span>
                </button>

                {/* Group items */}
                {isOpen && (
                  <div className="pb-1">
                    {group.items.map(item => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg text-sm transition-all ${
                            isActive
                              ? 'bg-violet-600/20 text-violet-400 font-medium'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`
                        }
                      >
                        <span className="text-sm w-4 text-center flex-shrink-0">{item.icon}</span>
                        <span className="text-xs">{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Language toggles */}
        <div className="px-4 py-3 border-t border-gray-800 space-y-3">
          {/* UI language */}
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
              {lang === 'en' ? 'Interface' : 'Interface'}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setLang('pt')}
                className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${
                  lang === 'pt'
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                🇧🇷 PT
              </button>
              <button
                onClick={() => setLang('en')}
                className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${
                  lang === 'en'
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                🇺🇸 EN
              </button>
            </div>
          </div>

          {/* AI output language */}
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
              🤖 {lang === 'en' ? 'AI Language' : 'Idioma da IA'}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {AI_LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => setAiLang(l.code)}
                  title={l.code}
                  className={`py-1.5 text-xs rounded-md font-medium transition-colors ${
                    aiLang === l.code
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {l.flag} {l.short}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-950">
        <Outlet />
      </main>
    </div>
  )
}

export default function Layout() {
  return (
    <LanguageProvider>
      <LayoutInner />
    </LanguageProvider>
  )
}
