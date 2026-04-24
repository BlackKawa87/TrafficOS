import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../store/storage';
import type { ClubRequest, Priority } from '../types';
import StatusBadge from '../components/StatusBadge';
import { formatDate, STATUS_LABELS, PRIORITY_LABELS, DEAL_TYPE_LABELS } from '../utils/helpers';

const PRIORITY_ORDER: Record<Priority, number> = { alta: 3, media: 2, baixa: 1 };

export default function Pedidos() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ClubRequest[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'budget'>('priority');

  useEffect(() => {
    setRequests(db.requests.getAll());
  }, []);

  const filtered = requests
    .filter((r) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        r.club_name.toLowerCase().includes(q) ||
        r.position_main.toLowerCase().includes(q) ||
        r.club_country.toLowerCase().includes(q);
      const matchesStatus = !filterStatus || r.status === filterStatus;
      const matchesPriority = !filterPriority || r.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      if (sortBy === 'priority')
        return (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0);
      if (sortBy === 'budget')
        return (b.transfer_budget ?? 0) - (a.transfer_budget ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  function handleDelete(id: string) {
    if (!confirm('Excluir este pedido?')) return;
    db.requests.delete(id);
    db.matches.deleteByRequest(id);
    setRequests(db.requests.getAll());
  }

  const openCount = requests.filter(
    (r) => r.status !== 'arquivado' && r.status !== 'fechado' && r.status !== 'cancelado'
  ).length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pedidos de Clubes</h1>
          <p className="text-gray-400 text-sm mt-1">
            {openCount} aberto{openCount !== 1 ? 's' : ''} · {requests.length} total
          </p>
        </div>
        <Link
          to="/crm/pedidos/novo"
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Novo Pedido
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar clube, posição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-60"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">Todas as prioridades</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="priority">Ordenar: Prioridade</option>
          <option value="date">Ordenar: Data</option>
          <option value="budget">Ordenar: Budget</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-gray-500 text-lg">Nenhum pedido encontrado.</p>
          <Link to="/crm/pedidos/novo" className="text-emerald-400 text-sm mt-2 inline-block hover:text-emerald-300">
            Criar primeiro pedido →
          </Link>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800 bg-gray-900/80">
                <th className="text-left px-4 py-3 font-medium">Clube</th>
                <th className="text-left px-4 py-3 font-medium">Posição</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Budget</th>
                <th className="text-left px-4 py-3 font-medium">Prioridade</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-gray-800/40 cursor-pointer"
                  onClick={() => navigate(`/crm/pedidos/${r.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{r.club_name}</p>
                    <p className="text-gray-500 text-xs">{r.club_country}{r.club_league ? ` · ${r.club_league}` : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-200">{r.position_main || '—'}</p>
                    {r.position_secondary && (
                      <p className="text-gray-500 text-xs">{r.position_secondary}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {DEAL_TYPE_LABELS[r.deal_type] ?? r.deal_type}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {r.transfer_budget
                      ? `${r.transfer_budget_currency} ${(r.transfer_budget / 1_000_000).toFixed(1)}M`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge type="priority" value={r.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge type="status" value={r.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {formatDate(r.request_date || r.created_at)}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/crm/pedidos/${r.id}/editar`)}
                        className="text-gray-500 hover:text-white text-xs transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
