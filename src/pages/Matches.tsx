import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../store/storage';
import { runAllMatches } from '../utils/matching';
import type { ClubRequest, CRMPlayer, RequestPlayerMatch } from '../types';
import StatusBadge from '../components/StatusBadge';
import ScoreMeter from '../components/ScoreMeter';

export default function Matches() {
  const [requests, setRequests] = useState<ClubRequest[]>([]);
  const [players, setPlayers] = useState<CRMPlayer[]>([]);
  const [matches, setMatches] = useState<RequestPlayerMatch[]>([]);
  const [filterRisk, setFilterRisk] = useState('');
  const [filterRequest, setFilterRequest] = useState('');
  const [filterPlayer, setFilterPlayer] = useState('');
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    const reqs = db.requests.getAll();
    const plays = db.players.getAll();
    const mts = runAllMatches(reqs, plays);
    db.matches.saveAll(mts);
    setRequests(reqs);
    setPlayers(plays);
    setMatches(mts);
  }, []);

  const requestMap = Object.fromEntries(requests.map((r) => [r.id, r]));
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  const filtered = matches.filter((m) => {
    if (filterRisk && m.risk_level !== filterRisk) return false;
    if (filterRequest && m.request_id !== filterRequest) return false;
    if (filterPlayer && m.player_id !== filterPlayer) return false;
    if (m.final_score < minScore) return false;
    return true;
  });

  function rerunMatches() {
    const reqs = db.requests.getAll();
    const plays = db.players.getAll();
    const mts = runAllMatches(reqs, plays);
    db.matches.saveAll(mts);
    setMatches(mts);
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Matches</h1>
          <p className="text-gray-400 text-sm mt-1">
            {filtered.length} de {matches.length} match{matches.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <button
          onClick={rerunMatches}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          ↻ Recalcular Matches
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">Todos os riscos</option>
          <option value="baixo">Risco Baixo</option>
          <option value="medio">Risco Médio</option>
          <option value="alto">Risco Alto</option>
        </select>

        <select
          value={filterRequest}
          onChange={(e) => setFilterRequest(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 max-w-52"
        >
          <option value="">Todos os pedidos</option>
          {requests.map((r) => (
            <option key={r.id} value={r.id}>
              {r.club_name} — {r.position_main}
            </option>
          ))}
        </select>

        <select
          value={filterPlayer}
          onChange={(e) => setFilterPlayer(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 max-w-52"
        >
          <option value="">Todos os jogadores</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.short_name || p.full_name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-xs">Score mínimo:</label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="accent-emerald-500 w-28"
          />
          <span className="text-white text-xs w-8">{minScore}</span>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-gray-500">
            {matches.length === 0
              ? 'Nenhum match gerado ainda. Cadastre pedidos e jogadores.'
              : 'Nenhum match com os filtros aplicados.'}
          </p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800 bg-gray-900/80">
                <th className="text-left px-4 py-3 font-medium">Pedido (Clube)</th>
                <th className="text-left px-4 py-3 font-medium">Jogador</th>
                <th className="text-left px-4 py-3 font-medium">Esportivo</th>
                <th className="text-left px-4 py-3 font-medium">Financeiro</th>
                <th className="text-left px-4 py-3 font-medium">Comercial</th>
                <th className="text-left px-4 py-3 font-medium">Estratégico</th>
                <th className="text-left px-4 py-3 font-medium w-28">Score Final</th>
                <th className="text-left px-4 py-3 font-medium">Risco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((m) => {
                const req = requestMap[m.request_id];
                const player = playerMap[m.player_id];
                if (!req || !player) return null;
                return (
                  <tr key={m.id} className="hover:bg-gray-800/40">
                    <td className="px-4 py-3">
                      <Link
                        to={`/crm/pedidos/${req.id}`}
                        className="text-white hover:text-emerald-400 font-medium"
                      >
                        {req.club_name}
                      </Link>
                      <p className="text-gray-500 text-xs">{req.position_main}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/crm/jogadores/${player.id}`}
                        className="text-white hover:text-emerald-400"
                      >
                        {player.short_name || player.full_name}
                      </Link>
                      <p className="text-gray-500 text-xs">{player.current_club}</p>
                    </td>
                    <td className="px-4 py-3 w-24">
                      <ScoreMeter score={m.sports_fit_score} size="sm" />
                    </td>
                    <td className="px-4 py-3 w-24">
                      <ScoreMeter score={m.financial_fit_score} size="sm" />
                    </td>
                    <td className="px-4 py-3 w-24">
                      <ScoreMeter score={m.commercial_fit_score} size="sm" />
                    </td>
                    <td className="px-4 py-3 w-24">
                      <ScoreMeter score={m.strategic_fit_score} size="sm" />
                    </td>
                    <td className="px-4 py-3 w-28">
                      <div className="flex items-center gap-2">
                        <ScoreMeter score={m.final_score} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
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
  );
}
