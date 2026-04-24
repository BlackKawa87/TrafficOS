import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { db } from '../store/storage';
import { runMatchesForPlayer } from '../utils/matching';
import type { CRMPlayer, ClubRequest, RequestPlayerMatch } from '../types';
import StatusBadge from '../components/StatusBadge';
import ScoreMeter from '../components/ScoreMeter';
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  DEAL_TYPE_LABELS,
  FOOT_LABELS,
  SQUAD_STATUS_LABELS,
} from '../utils/helpers';

export default function DetalJogador() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<CRMPlayer | null>(null);
  const [requests, setRequests] = useState<ClubRequest[]>([]);
  const [matches, setMatches] = useState<RequestPlayerMatch[]>([]);
  const [logs, setLogs] = useState<ReturnType<typeof db.logs.getAll>>([]);
  const [tab, setTab] = useState<'pedidos' | 'info' | 'comercial' | 'log'>('pedidos');

  useEffect(() => {
    if (!id) return;
    const p = db.players.getById(id);
    if (!p) { navigate('/crm/jogadores'); return; }
    setPlayer(p);

    const allRequests = db.requests.getAll();
    setRequests(allRequests);

    const computed = runMatchesForPlayer(p, allRequests);
    db.matches.saveAll(computed);
    setMatches(computed);

    setLogs(db.logs.getByEntity('player', id));
  }, [id, navigate]);

  if (!player) return null;

  const requestMap = Object.fromEntries(requests.map((r) => [r.id, r]));

  async function toggleFavorite() {
    if (!id) return;
    const updated = { ...player!, favorite: !player!.favorite };
    db.players.save(updated);
    setPlayer(updated);
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
            <Link to="/crm/jogadores" className="hover:text-white">Jogadores</Link>
            <span>/</span>
            <span className="text-gray-300">{player.short_name || player.full_name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            {player.full_name}
            <button onClick={toggleFavorite} className="text-xl hover:scale-110 transition-transform">
              {player.favorite ? '⭐' : '☆'}
            </button>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {player.primary_position}{player.secondary_positions ? ` / ${player.secondary_positions}` : ''}
            {player.age ? ` · ${player.age} anos` : ''}
            {player.nationality ? ` · ${player.nationality}` : ''}
            {player.eu_passport ? ' 🇪🇺' : ''}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge type="relation" value={player.relation_type} />
            <StatusBadge type="availability" value={player.availability_level} />
            {player.current_club && (
              <span className="text-xs text-gray-400">{player.current_club} · {player.current_league}</span>
            )}
            {player.market_value && (
              <span className="text-xs text-emerald-400 font-medium">
                {formatCurrency(player.market_value, player.market_value_currency)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/crm/jogadores/${id}/editar`}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Pedidos Compatíveis', value: matches.filter((m) => m.final_score >= 45).length },
          { label: 'Oportunidades Quentes', value: matches.filter((m) => m.final_score >= 70).length },
          { label: 'Shortlists', value: db.shortlists.getByPlayer(id!).length },
          { label: 'Minutagem Recente', value: player.recent_minutes !== null ? `${player.recent_minutes} min` : '—' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <p className="text-gray-400 text-xs">{s.label}</p>
            <p className="text-xl font-bold text-white mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {[
          { key: 'pedidos', label: `Pedidos Compatíveis (${matches.length})` },
          { key: 'info', label: 'Perfil' },
          { key: 'comercial', label: 'Comercial' },
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

      {/* Tab: Pedidos */}
      {tab === 'pedidos' && (
        <div className="space-y-3">
          {matches.length === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
              <p className="text-gray-500">Nenhum pedido ativo para cruzar.</p>
              <Link to="/crm/pedidos/novo" className="text-emerald-400 text-sm mt-2 inline-block">
                Criar pedido →
              </Link>
            </div>
          ) : (
            matches.map((m) => {
              const req = requestMap[m.request_id];
              if (!req) return null;
              return (
                <div key={m.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link to={`/crm/pedidos/${req.id}`} className="text-white font-medium hover:text-emerald-400">
                        {req.club_name}
                      </Link>
                      <StatusBadge type="priority" value={req.priority} />
                      <StatusBadge type="risk" value={m.risk_level} />
                    </div>
                    <p className="text-gray-400 text-xs mb-2">
                      {req.position_main} · {req.club_country}
                      {req.transfer_budget ? ` · Budget: ${formatCurrency(req.transfer_budget, req.transfer_budget_currency)}` : ''}
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
                  <div className="text-center shrink-0">
                    <p className={`text-2xl font-bold ${m.final_score >= 70 ? 'text-emerald-400' : m.final_score >= 45 ? 'text-amber-400' : 'text-red-400'}`}>
                      {m.final_score}
                    </p>
                    <p className="text-xs text-gray-500">score</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Perfil */}
      {tab === 'info' && (
        <div className="grid grid-cols-2 gap-5">
          <InfoCard title="Clube e Carreira">
            <InfoRow label="Clube" value={player.current_club} />
            <InfoRow label="Liga" value={player.current_league} />
            <InfoRow label="País" value={player.current_club_country} />
            <InfoRow label="Contrato até" value={player.contract_until ? formatDate(player.contract_until) : ''} />
            <InfoRow label="Situação" value={SQUAD_STATUS_LABELS[player.squad_status] ?? ''} />
            <InfoRow label="Minutagem recente" value={player.recent_minutes !== null ? `${player.recent_minutes} min` : ''} />
            {player.club_history && <InfoBlock label="Histórico" value={player.club_history} />}
          </InfoCard>

          <InfoCard title="Atributos">
            <InfoRow label="Pé" value={FOOT_LABELS[player.preferred_foot] ?? ''} />
            <InfoRow label="Altura" value={player.height ? `${player.height} cm` : ''} />
            <InfoRow label="Peso" value={player.weight ? `${player.weight} kg` : ''} />
            <InfoRow label="Passaporte UE" value={player.eu_passport ? 'Sim' : 'Não'} />
            <InfoRow label="Estilo" value={player.playing_style} />
            <InfoRow label="Modelo ideal" value={player.ideal_game_model} />
            <InfoRow label="Liga ideal" value={player.ideal_league_fit} />
          </InfoCard>

          {(player.strengths || player.concerns) && (
            <div className="col-span-2">
              <InfoCard title="Análise">
                {player.strengths && <InfoBlock label="Pontos Fortes" value={player.strengths} />}
                {player.concerns && <InfoBlock label="Pontos de Atenção" value={player.concerns} />}
                {player.tactical_profile && <InfoBlock label="Perfil Tático" value={player.tactical_profile} />}
              </InfoCard>
            </div>
          )}
        </div>
      )}

      {/* Tab: Comercial */}
      {tab === 'comercial' && (
        <div className="grid grid-cols-2 gap-5">
          <InfoCard title="Mercado">
            <InfoRow label="Valor de mercado" value={formatCurrency(player.market_value, player.market_value_currency)} />
            <InfoRow label="Salário estimado" value={formatCurrency(player.estimated_salary, player.estimated_salary_currency)} />
            <InfoRow label="Tipo de operação" value={DEAL_TYPE_LABELS[player.deal_type_possible] ?? ''} />
            <InfoRow label="Disponibilidade" value={player.availability_level} />
            <InfoRow label="Chance de saída" value={player.exit_probability} />
            <InfoRow label="Janela ideal" value={player.ideal_exit_window} />
          </InfoCard>

          <InfoCard title="Relação Comercial">
            <InfoRow label="Tipo de relação" value={player.relation_type} />
            <InfoRow label="Parceiro / Agente" value={player.partner_name} />
            <InfoRow label="Nível de acesso" value={player.access_level} />
            <InfoRow label="Último contato" value={player.last_contact_date ? formatDate(player.last_contact_date) : ''} />
            <InfoRow label="Status contato" value={player.contact_status} />
            <InfoRow label="Comissão" value={player.commission_notes} />
          </InfoCard>

          <InfoCard title="Mercados">
            {player.priority_markets && <InfoBlock label="Prioritários" value={player.priority_markets} />}
            {player.accepted_markets && <InfoBlock label="Aceitos" value={player.accepted_markets} />}
            {player.blocked_markets && <InfoBlock label="Bloqueados" value={player.blocked_markets} />}
          </InfoCard>

          {player.commercial_notes && (
            <InfoCard title="Observações Comerciais">
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{player.commercial_notes}</p>
            </InfoCard>
          )}

          {player.notes && (
            <div className="col-span-2">
              <InfoCard title="Observações Internas">
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{player.notes}</p>
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
      <span className="text-gray-500 text-xs w-36 shrink-0">{label}</span>
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
