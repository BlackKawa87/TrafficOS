import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../store/storage';
import { runAllMatches } from '../utils/matching';
import type { ClubRequest, CRMPlayer, RequestPlayerMatch } from '../types';
import StatusBadge from '../components/StatusBadge';
import ScoreMeter from '../components/ScoreMeter';
import { formatCurrency } from '../utils/helpers';

export default function CRMDashboard() {
  const [requests, setRequests] = useState<ClubRequest[]>([]);
  const [players, setPlayers] = useState<CRMPlayer[]>([]);
  const [matches, setMatches] = useState<RequestPlayerMatch[]>([]);
  const [shortlistCount, setShortlistCount] = useState(0);

  useEffect(() => {
    const reqs = db.requests.getAll();
    const plays = db.players.getAll();
    const mts = runAllMatches(reqs, plays);
    db.matches.saveAll(mts);
    setRequests(reqs);
    setPlayers(plays);
    setMatches(mts);
    setShortlistCount(db.shortlists.getAll().length);
  }, []);

  const openRequests = requests.filter(
    (r) =>
      r.status !== 'arquivado' &&
      r.status !== 'fechado' &&
      r.status !== 'cancelado'
  );

  const priorityOrder: Record<string, number> = { alta: 3, media: 2, baixa: 1 };

  const priorityRequests = [...openRequests]
    .sort((a, b) => (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0))
    .slice(0, 5);

  const topPlayers = [...players]
    .filter((p) => p.relation_type !== 'arquivado')
    .sort((a, b) => {
      const av: Record<string, number> = { alta: 3, media: 2, baixa: 1 };
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return (av[b.availability_level] ?? 0) - (av[a.availability_level] ?? 0);
    })
    .slice(0, 5);

  const topMatches = matches.slice(0, 8);

  const requestMap = Object.fromEntries(requests.map((r) => [r.id, r]));
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  const stats = [
    {
      label: 'Pedidos Abertos',
      value: openRequests.length,
      color: 'text-emerald-400',
      link: '/crm/pedidos',
    },
    {
      label: 'Jogadores na Base',
      value: players.filter((p) => p.relation_type !== 'arquivado').length,
      color: 'text-blue-400',
      link: '/crm/jogadores',
    },
    {
      label: 'Matches Gerados',
      value: matches.length,
      color: 'text-purple-400',
      link: '/crm/matches',
    },
    {
      label: 'Shortlist Total',
      value: shortlistCount,
      color: 'text-amber-400',
      link: '/crm/pedidos',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">CRM de Mercado</h1>
          <p className="text-gray-400 text-sm mt-1">
            Central de inteligência comercial para transferências
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/crm/pedidos/novo"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Novo Pedido
          </Link>
          <Link
            to="/crm/jogadores/novo"
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Novo Jogador
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.link}
            className="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-colors"
          >
            <p className="text-gray-400 text-sm">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Pedidos prioritários */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Pedidos Prioritários</h2>
            <Link
              to="/crm/pedidos"
              className="text-emerald-400 text-xs hover:text-emerald-300"
            >
              Ver todos →
            </Link>
          </div>
          {priorityRequests.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm">Nenhum pedido aberto ainda.</p>
              <Link to="/crm/pedidos/novo" className="text-emerald-400 text-sm mt-2 inline-block">
                Criar pedido →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {priorityRequests.map((r) => (
                <Link
                  key={r.id}
                  to={`/crm/pedidos/${r.id}`}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {r.club_name}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {r.position_main} · {r.club_country}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <StatusBadge type="priority" value={r.priority} />
                    <StatusBadge type="status" value={r.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Jogadores ofertáveis */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Jogadores Ofertáveis</h2>
            <Link
              to="/crm/jogadores"
              className="text-emerald-400 text-xs hover:text-emerald-300"
            >
              Ver todos →
            </Link>
          </div>
          {topPlayers.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm">Nenhum jogador cadastrado ainda.</p>
              <Link to="/crm/jogadores/novo" className="text-emerald-400 text-sm mt-2 inline-block">
                Cadastrar jogador →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {topPlayers.map((p) => (
                <Link
                  key={p.id}
                  to={`/crm/jogadores/${p.id}`}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {p.short_name || p.full_name}
                      {p.favorite && ' ⭐'}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {p.primary_position} · {p.current_club || '—'}
                      {p.market_value
                        ? ` · ${formatCurrency(p.market_value, p.market_value_currency)}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <StatusBadge type="relation" value={p.relation_type} />
                    <StatusBadge type="availability" value={p.availability_level} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Matches */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Melhores Matches</h2>
          <Link
            to="/crm/matches"
            className="text-emerald-400 text-xs hover:text-emerald-300"
          >
            Ver todos →
          </Link>
        </div>
        {topMatches.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            Cadastre pedidos e jogadores para gerar matches automáticos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left pb-2 font-medium">Clube</th>
                  <th className="text-left pb-2 font-medium">Posição</th>
                  <th className="text-left pb-2 font-medium">Jogador</th>
                  <th className="text-left pb-2 font-medium">Clube Atual</th>
                  <th className="text-left pb-2 font-medium w-36">Score Final</th>
                  <th className="text-left pb-2 font-medium">Risco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {topMatches.map((m) => {
                  const req = requestMap[m.request_id];
                  const player = playerMap[m.player_id];
                  if (!req || !player) return null;
                  return (
                    <tr key={m.id} className="hover:bg-gray-800/30">
                      <td className="py-2.5 pr-4">
                        <Link
                          to={`/crm/pedidos/${req.id}`}
                          className="text-white hover:text-emerald-400 font-medium"
                        >
                          {req.club_name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-400 text-xs">
                        {req.position_main}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Link
                          to={`/crm/jogadores/${player.id}`}
                          className="text-white hover:text-emerald-400"
                        >
                          {player.short_name || player.full_name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-400 text-xs">
                        {player.current_club}
                      </td>
                      <td className="py-2.5 pr-4 w-36">
                        <ScoreMeter score={m.final_score} />
                      </td>
                      <td className="py-2.5">
                        <StatusBadge type="risk" value={m.risk_level} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
