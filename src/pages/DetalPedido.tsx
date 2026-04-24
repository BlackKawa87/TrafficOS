import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { db } from '../store/storage';
import { runMatchesForRequest } from '../utils/matching';
import type { ClubRequest, CRMPlayer, RequestPlayerMatch, Shortlist } from '../types';
import StatusBadge from '../components/StatusBadge';
import ScoreMeter from '../components/ScoreMeter';
import {
  formatDateTime,
  formatCurrency,
  DEAL_TYPE_LABELS,
  FOOT_LABELS,
} from '../utils/helpers';

export default function DetalPedido() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<ClubRequest | null>(null);
  const [players, setPlayers] = useState<CRMPlayer[]>([]);
  const [matches, setMatches] = useState<RequestPlayerMatch[]>([]);
  const [shortlist, setShortlist] = useState<Shortlist[]>([]);
  const [logs, setLogs] = useState<ReturnType<typeof db.logs.getAll>>([]);
  const [tab, setTab] = useState<'matches' | 'shortlist' | 'info' | 'log'>('matches');

  useEffect(() => {
    if (!id) return;
    const req = db.requests.getById(id);
    if (!req) { navigate('/crm/pedidos'); return; }
    setRequest(req);

    const allPlayers = db.players.getAll();
    setPlayers(allPlayers);

    const computed = runMatchesForRequest(req, allPlayers);
    db.matches.saveAll(computed);
    setMatches(computed);

    setShortlist(db.shortlists.getByRequest(id));
    setLogs(db.logs.getByEntity('request', id));
  }, [id, navigate]);

  if (!request) return null;

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  const shortlistedIds = new Set(shortlist.map((s) => s.player_id));

  function toggleShortlist(playerId: string) {
    if (!id) return;
    if (shortlistedIds.has(playerId)) {
      db.shortlists.deleteByPair(id, playerId);
    } else {
      db.shortlists.add(id, playerId);
      db.logs.add({
        entity_type: 'request',
        entity_id: id,
        action_type: 'shortlisted',
        note: `${playerMap[playerId]?.short_name || playerMap[playerId]?.full_name} adicionado à shortlist`,
      });
    }
    setShortlist(db.shortlists.getByRequest(id));
  }

  function handleBuscar() {
    const params = new URLSearchParams({ request: request!.id });
    navigate(`/crm/buscar?${params.toString()}`);
  }

  const topMatches = matches.slice(0, 20);
  const shortlistMatches = matches.filter((m) => shortlistedIds.has(m.player_id));

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
            <Link to="/crm/pedidos" className="hover:text-white">Pedidos</Link>
            <span>/</span>
            <span className="text-gray-300">{request.club_name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{request.club_name}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {request.position_main}{request.position_secondary ? ` / ${request.position_secondary}` : ''} · {request.club_country}
            {request.club_league ? ` · ${request.club_league}` : ''}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge type="priority" value={request.priority} />
            <StatusBadge type="status" value={request.status} />
            {request.transfer_budget && (
              <span className="text-xs text-gray-400">
                Budget: {formatCurrency(request.transfer_budget, request.transfer_budget_currency)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleBuscar}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🔍 Buscar Jogadores
          </button>
          <Link
            to={`/crm/pedidos/${id}/editar`}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {[
          { key: 'matches', label: `Matches (${topMatches.length})` },
          { key: 'shortlist', label: `Shortlist (${shortlist.length})` },
          { key: 'info', label: 'Detalhes' },
          { key: 'log', label: 'Histórico' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Matches */}
      {tab === 'matches' && (
        <div className="space-y-3">
          {topMatches.length === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
              <p className="text-gray-500">Nenhum jogador cadastrado para gerar matches.</p>
              <Link to="/crm/jogadores/novo" className="text-emerald-400 text-sm mt-2 inline-block">
                Cadastrar jogador →
              </Link>
            </div>
          ) : (
            topMatches.map((m) => {
              const player = playerMap[m.player_id];
              if (!player) return null;
              const inShortlist = shortlistedIds.has(player.id);
              return (
                <div key={m.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link to={`/crm/jogadores/${player.id}`} className="text-white font-medium hover:text-emerald-400">
                        {player.short_name || player.full_name}
                        {player.favorite && ' ⭐'}
                      </Link>
                      <StatusBadge type="relation" value={player.relation_type} />
                      <StatusBadge type="risk" value={m.risk_level} />
                    </div>
                    <p className="text-gray-400 text-xs mb-2">
                      {player.primary_position} · {player.current_club} · {player.nationality}
                      {player.age ? ` · ${player.age} anos` : ''}
                      {player.preferred_foot ? ` · Pé ${FOOT_LABELS[player.preferred_foot]}` : ''}
                    </p>
                    <p className="text-gray-500 text-xs italic mb-3">{m.fit_summary}</p>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: 'Esportivo', score: m.sports_fit_score },
                        { label: 'Financeiro', score: m.financial_fit_score },
                        { label: 'Comercial', score: m.commercial_fit_score },
                        { label: 'Estratégico', score: m.strategic_fit_score },
                      ].map((s) => (
                        <div key={s.label}>
                          <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                          <ScoreMeter score={s.score} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${m.final_score >= 70 ? 'text-emerald-400' : m.final_score >= 45 ? 'text-amber-400' : 'text-red-400'}`}>
                        {m.final_score}
                      </p>
                      <p className="text-xs text-gray-500">score</p>
                    </div>
                    <button
                      onClick={() => toggleShortlist(player.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        inShortlist
                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {inShortlist ? '✓ Na shortlist' : '+ Shortlist'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Shortlist */}
      {tab === 'shortlist' && (
        <div className="space-y-3">
          {shortlist.length === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
              <p className="text-gray-500">Nenhum jogador na shortlist ainda.</p>
              <button onClick={() => setTab('matches')} className="text-emerald-400 text-sm mt-2 inline-block">
                Ver matches →
              </button>
            </div>
          ) : (
            shortlistMatches.map((m) => {
              const player = playerMap[m.player_id];
              if (!player) return null;
              return (
                <div key={m.id} className="bg-gray-900 rounded-xl border border-emerald-800/40 p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link to={`/crm/jogadores/${player.id}`} className="text-white font-medium hover:text-emerald-400">
                        {player.short_name || player.full_name}
                      </Link>
                      <StatusBadge type="relation" value={player.relation_type} />
                    </div>
                    <p className="text-gray-400 text-xs mt-1">
                      {player.primary_position} · {player.current_club} · {player.current_league}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <ScoreMeter score={m.final_score} />
                    </div>
                    <button
                      onClick={() => toggleShortlist(player.id)}
                      className="text-red-400 hover:text-red-300 text-xs transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Info */}
      {tab === 'info' && (
        <div className="grid grid-cols-2 gap-5">
          <InfoCard title="Perfil do Jogador">
            <InfoRow label="Posição" value={request.position_main} />
            <InfoRow label="Posição 2" value={request.position_secondary} />
            <InfoRow label="Pé" value={request.preferred_foot ? FOOT_LABELS[request.preferred_foot] : ''} />
            <InfoRow label="Idade" value={request.age_min || request.age_max ? `${request.age_min ?? '—'} a ${request.age_max ?? '—'} anos` : ''} />
            <InfoRow label="Altura" value={request.height_min || request.height_max ? `${request.height_min ?? '—'} a ${request.height_max ?? '—'} cm` : ''} />
            <InfoRow label="Estilo" value={request.player_style} />
            <InfoRow label="Mercados preferidos" value={request.preferred_countries} />
          </InfoCard>

          <InfoCard title="Financeiro">
            <InfoRow label="Budget transferência" value={formatCurrency(request.transfer_budget, request.transfer_budget_currency)} />
            <InfoRow label="Budget salarial" value={formatCurrency(request.salary_budget, request.salary_budget_currency)} />
            <InfoRow label="Package total" value={formatCurrency(request.total_package_budget, request.total_package_currency)} />
            <InfoRow label="Tipo de negócio" value={DEAL_TYPE_LABELS[request.deal_type] ?? ''} />
            <InfoRow label="Foco em revenda" value={request.resale_focus ? 'Sim' : 'Não'} />
          </InfoCard>

          <InfoCard title="Contexto">
            <InfoRow label="Pronto para jogar" value={request.needs_ready_player ? 'Sim' : 'Não obrigatório'} />
            <InfoRow label="Aceita projeto" value={request.accepts_project_player ? 'Sim' : 'Não'} />
            <InfoRow label="Aceita baixa minutagem" value={request.accepts_low_minutes ? 'Sim' : 'Não'} />
            <InfoRow label="Aceita em recuperação" value={request.accepts_recovering ? 'Sim' : 'Não'} />
            <InfoRow label="Aceita divisão inferior" value={request.accepts_lower_division ? 'Sim' : 'Não'} />
          </InfoCard>

          <InfoCard title="Perfis">
            {request.physical_profile && <InfoBlock label="Físico" value={request.physical_profile} />}
            {request.technical_profile && <InfoBlock label="Técnico" value={request.technical_profile} />}
            {request.tactical_profile && <InfoBlock label="Tático" value={request.tactical_profile} />}
            {request.mandatory_traits && <InfoBlock label="Obrigatório" value={request.mandatory_traits} />}
            {request.desired_traits && <InfoBlock label="Desejável" value={request.desired_traits} />}
          </InfoCard>

          {request.notes && (
            <div className="col-span-2">
              <InfoCard title="Observações">
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{request.notes}</p>
              </InfoCard>
            </div>
          )}
        </div>
      )}

      {/* Tab: Log */}
      {tab === 'log' && (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhuma atividade registrada.</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="flex items-start gap-3 text-sm py-2 border-b border-gray-800">
                <span className="text-gray-500 text-xs w-36 shrink-0">{formatDateTime(l.created_at)}</span>
                <span className="text-gray-300">{l.note}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <h3 className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 text-xs w-40 shrink-0">{label}</span>
      <span className="text-gray-200 text-sm">{value}</span>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="text-gray-200 text-sm whitespace-pre-wrap">{value}</p>
    </div>
  );
}
