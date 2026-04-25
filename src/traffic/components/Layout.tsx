import { NavLink, Outlet } from 'react-router-dom'
import { LanguageProvider, useLanguage } from '../i18n'

const NAV_ITEMS = [
  { path: '/', label: 'nav.dashboard' as const, icon: '⊞', end: true },
  { path: '/produtos', label: 'nav.products' as const, icon: '📦' },
  { path: '/campanhas', label: 'nav.campaigns' as const, icon: '📢' },
  { path: '/criativos', label: 'nav.creatives' as const, icon: '🎨' },
  { path: '/metricas', label: 'nav.metrics' as const, icon: '📈' },
  { path: '/decisoes', label: 'nav.decisions' as const, icon: '🤖' },
  { path: '/plano-diario', label: 'nav.plan' as const, icon: '📅' },
  { path: '/landing-page', label: 'nav.landing' as const, icon: '🖥️' },
  { path: '/prompt-center', label: 'nav.prompts' as const, icon: '💬' },
  { path: '/configuracoes', label: 'nav.settings' as const, icon: '⚙️' },
]

function LayoutInner() {
  const { t, lang, setLang } = useLanguage()

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-sm font-bold">
              ⚡
            </div>
            <div>
              <div className="text-base font-bold text-white leading-none">TrafficOS</div>
              <div className="text-[10px] text-gray-500 mt-0.5">Paid Traffic Intelligence</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-400 font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{t(item.label)}</span>
            </NavLink>
          ))}
        </nav>

        {/* Language toggle */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Language / Idioma</div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setLang('pt')}
              className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${
                lang === 'pt'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              PT
            </button>
            <button
              onClick={() => setLang('en')}
              className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${
                lang === 'en'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              EN
            </button>
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
