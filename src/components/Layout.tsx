import { NavLink, Outlet } from 'react-router-dom';

const NAV = [
  { to: '/crm', label: 'Dashboard', icon: '⊞', end: true },
  { to: '/crm/pedidos', label: 'Pedidos', icon: '📋' },
  { to: '/crm/jogadores', label: 'Jogadores', icon: '👤' },
  { to: '/crm/matches', label: 'Matches', icon: '🔗' },
  { to: '/crm/pipeline', label: 'Pipeline', icon: '📊' },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="p-4 border-b border-gray-800">
          <span className="text-emerald-400 font-bold text-sm tracking-widest uppercase">
            FootballCore
          </span>
          <p className="text-gray-500 text-xs mt-0.5">Deal Engine</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <NavLink
            to="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-800 hover:text-white transition-colors"
          >
            ← Home
          </NavLink>
        </div>
      </aside>

      <main className="flex-1 ml-56 min-h-screen overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
