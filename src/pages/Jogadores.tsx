import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../store/storage';
import type { CRMPlayer } from '../types';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, RELATION_TYPE_LABELS, FOOT_LABELS } from '../utils/helpers';

export default function Jogadores() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<CRMPlayer[]>([]);
  const [search, setSearch] = useState('');
  const [filterRelation, setFilterRelation] = useState('');
  const [filterAvail, setFilterAvail] = useState('');
  const [filterPos, setFilterPos] = useState('');

  useEffect(() => {
    setPlayers(db.players.getAll());
  }, []);

  const filtered = players.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.full_name.toLowerCase().includes(q) ||
      p.short_name.toLowerCase().includes(q) ||
      p.primary_position.toLowerCase().includes(q) ||
      p.current_club.toLowerCase().includes(q) ||
      p.nationality.toLowerCase().includes(q);
    const matchesRelation = !filterRelation || p.relation_type === filterRelation;
    const matchesAvail = !filterAvail || p.availability_level === filterAvail;
    const matchesPos = !filterPos || p.primary_position.toLowerCase().includes(filterPos.toLowerCase());
    return matchesSearch && matchesRelation && matchesAvail && matchesPos;
  });

  function handleDelete(id: string) {
    if (!confirm('Excluir este jogador?')) return;
    db.players.delete(id);
    db.matches.deleteByPlayer(id);
    setPlayers(db.players.getAll());
  }

  const activeCount = players.filter((p) => p.relation_type !== 'arquivado').length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Jogadores</h1>
          <p className="text-gray-400 text-sm mt-1">
            {activeCount} ativo{activeCount !== 1 ? 's' : ''} · {players.length} total
          </p>
        </div>
        <Link
          to="/crm/jogadores/novo"
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Novo Jogador
        </Link>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar nome, posição, clube..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-64"
        />
        <select
          value={filterRelation}
          onChange={(e) => setFilterRelation(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(RELATION_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterAvail}
          onChange={(e) => setFilterAvail(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">Disponibilidade</option>
          <option value="alta">Alta</option>
          <option value="media">Média</option>
          <option value="baixa">Baixa</option>
        </select>
        <input
          type="text"
          placeholder="Filtrar posição..."
          value={filterPos}
          onChange={(e) => setFilterPos(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-44"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-gray-500 text-lg">Nenhum jogador encontrado.</p>
          <Link to="/crm/jogadores/novo" className="text-emerald-400 text-sm mt-2 inline-block hover:text-emerald-300">
            Cadastrar primeiro jogador →
          </Link>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800 bg-gray-900/80">
                <th className="text-left px-4 py-3 font-medium">Jogador</th>
                <th className="text-left px-4 py-3 font-medium">Posição</th>
                <th className="text-left px-4 py-3 font-medium">Clube Atual</th>
                <th className="text-left px-4 py-3 font-medium">Pé</th>
                <th className="text-left px-4 py-3 font-medium">Valor</th>
                <th className="text-left px-4 py-3 font-medium">Relação</th>
                <th className="text-left px-4 py-3 font-medium">Disponib.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-gray-800/40 cursor-pointer"
                  onClick={() => navigate(`/crm/jogadores/${p.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">
                      {p.short_name || p.full_name}
                      {p.favorite && ' ⭐'}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {p.nationality}{p.age ? ` · ${p.age} anos` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-200">{p.primary_position || '—'}</p>
                    {p.secondary_positions && (
                      <p className="text-gray-500 text-xs">{p.secondary_positions}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-300">{p.current_club || '—'}</p>
                    <p className="text-gray-500 text-xs">{p.current_league}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {FOOT_LABELS[p.preferred_foot] ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatCurrency(p.market_value, p.market_value_currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge type="relation" value={p.relation_type} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge type="availability" value={p.availability_level} />
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/crm/jogadores/${p.id}/editar`)}
                        className="text-gray-500 hover:text-white text-xs transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
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
