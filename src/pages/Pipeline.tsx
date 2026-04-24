import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../store/storage';
import type { ClubRequest, CRMPlayer, RequestStatus, RelationType } from '../types';
import StatusBadge from '../components/StatusBadge';
import { now } from '../utils/helpers';

const REQUEST_STAGES: { key: RequestStatus; label: string }[] = [
  { key: 'aberto', label: 'Novo Pedido' },
  { key: 'em_analise', label: 'Filtrando' },
  { key: 'shortlist_enviada', label: 'Shortlist Enviada' },
  { key: 'em_negociacao', label: 'Em Negociação' },
  { key: 'fechado', label: 'Fechado ✓' },
  { key: 'cancelado', label: 'Cancelado' },
];

const PLAYER_STAGES: { key: RelationType; label: string }[] = [
  { key: 'monitorado', label: 'Monitorado' },
  { key: 'proprio', label: 'Pronto p/ Oferta' },
  { key: 'oportunidade', label: 'Oportunidade' },
  { key: 'oferecido', label: 'Oferecido' },
  { key: 'em_negociacao', label: 'Em Negociação' },
  { key: 'parceiro', label: 'Parceiro' },
];

type View = 'requests' | 'players';

export default function Pipeline() {
  const [view, setView] = useState<View>('requests');
  const [requests, setRequests] = useState<ClubRequest[]>([]);
  const [players, setPlayers] = useState<CRMPlayer[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    setRequests(db.requests.getAll());
    setPlayers(db.players.getAll());
  }, []);

  function moveRequest(id: string, newStatus: RequestStatus) {
    const req = db.requests.getById(id);
    if (!req) return;
    const updated = { ...req, status: newStatus, updated_at: now() };
    db.requests.save(updated);
    db.logs.add({
      entity_type: 'request',
      entity_id: id,
      action_type: 'status_changed',
      previous_value: req.status,
      new_value: newStatus,
      note: `Status alterado: ${req.status} → ${newStatus}`,
    });
    setRequests(db.requests.getAll());
  }

  function movePlayer(id: string, newRelation: RelationType) {
    const player = db.players.getById(id);
    if (!player) return;
    const updated = { ...player, relation_type: newRelation, updated_at: now() };
    db.players.save(updated);
    db.logs.add({
      entity_type: 'player',
      entity_id: id,
      action_type: 'relation_changed',
      previous_value: player.relation_type,
      new_value: newRelation,
      note: `Relação alterada: ${player.relation_type} → ${newRelation}`,
    });
    setPlayers(db.players.getAll());
  }

  const activeRequests = requests.filter(
    (r) => r.status !== 'arquivado'
  );
  const activePlayers = players.filter(
    (p) => p.relation_type !== 'arquivado' && p.relation_type !== 'sem_fit'
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline Comercial</h1>
          <p className="text-gray-400 text-sm mt-1">
            Acompanhe o andamento dos seus pedidos e jogadores
          </p>
        </div>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setView('requests')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'requests'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📋 Pedidos
          </button>
          <button
            onClick={() => setView('players')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'players'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            👤 Jogadores
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {view === 'requests'
            ? REQUEST_STAGES.map((stage) => {
                const stageItems = activeRequests.filter(
                  (r) => r.status === stage.key
                );
                return (
                  <KanbanColumn
                    key={stage.key}
                    title={stage.label}
                    count={stageItems.length}
                    onDrop={() => {
                      if (dragging) {
                        moveRequest(dragging, stage.key);
                        setDragging(null);
                      }
                    }}
                  >
                    {stageItems.map((r) => (
                      <RequestCard
                        key={r.id}
                        request={r}
                        stages={REQUEST_STAGES}
                        onMove={(newStatus) => moveRequest(r.id, newStatus as RequestStatus)}
                        onDragStart={() => setDragging(r.id)}
                        onDragEnd={() => setDragging(null)}
                      />
                    ))}
                  </KanbanColumn>
                );
              })
            : PLAYER_STAGES.map((stage) => {
                const stageItems = activePlayers.filter(
                  (p) => p.relation_type === stage.key
                );
                return (
                  <KanbanColumn
                    key={stage.key}
                    title={stage.label}
                    count={stageItems.length}
                    onDrop={() => {
                      if (dragging) {
                        movePlayer(dragging, stage.key);
                        setDragging(null);
                      }
                    }}
                  >
                    {stageItems.map((p) => (
                      <PlayerCard
                        key={p.id}
                        player={p}
                        stages={PLAYER_STAGES}
                        onMove={(rel) => movePlayer(p.id, rel as RelationType)}
                        onDragStart={() => setDragging(p.id)}
                        onDragEnd={() => setDragging(null)}
                      />
                    ))}
                  </KanbanColumn>
                );
              })}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  title,
  count,
  children,
  onDrop,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  onDrop: () => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <div
      className={`w-64 shrink-0 flex flex-col gap-2 rounded-xl p-3 border transition-colors ${
        over ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-800 bg-gray-900/50'
      }`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); onDrop(); }}
    >
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {title}
        </span>
        <span className="text-xs text-gray-600 bg-gray-800 rounded-full px-2 py-0.5">
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2 min-h-16">{children}</div>
    </div>
  );
}

function RequestCard({
  request,
  stages,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  request: ClubRequest;
  stages: { key: string; label: string }[];
  onMove: (status: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <Link
            to={`/crm/pedidos/${request.id}`}
            className="text-white text-sm font-medium hover:text-emerald-400 truncate block"
          >
            {request.club_name}
          </Link>
          <p className="text-gray-500 text-xs mt-0.5">
            {request.position_main}
            {request.transfer_budget
              ? ` · €${(request.transfer_budget / 1_000_000).toFixed(1)}M`
              : ''}
          </p>
        </div>
        <StatusBadge type="priority" value={request.priority} />
      </div>

      {/* Quick move */}
      <div className="mt-2 relative">
        <button
          onClick={() => setOpen(!open)}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Mover →
        </button>
        {open && (
          <div className="absolute left-0 top-5 z-10 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-1 w-48">
            {stages.map((s) => (
              <button
                key={s.key}
                onClick={() => { onMove(s.key); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs rounded hover:bg-gray-700 transition-colors ${
                  request.status === s.key ? 'text-emerald-400' : 'text-gray-300'
                }`}
              >
                {request.status === s.key ? '✓ ' : ''}{s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerCard({
  player,
  stages,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  player: CRMPlayer;
  stages: { key: string; label: string }[];
  onMove: (rel: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <Link
            to={`/crm/jogadores/${player.id}`}
            className="text-white text-sm font-medium hover:text-emerald-400 truncate block"
          >
            {player.short_name || player.full_name}
            {player.favorite && ' ⭐'}
          </Link>
          <p className="text-gray-500 text-xs mt-0.5">
            {player.primary_position}
            {player.current_club ? ` · ${player.current_club}` : ''}
          </p>
        </div>
        <StatusBadge type="availability" value={player.availability_level} />
      </div>

      <div className="mt-2 relative">
        <button
          onClick={() => setOpen(!open)}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Mover →
        </button>
        {open && (
          <div className="absolute left-0 top-5 z-10 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-1 w-44">
            {stages.map((s) => (
              <button
                key={s.key}
                onClick={() => { onMove(s.key); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs rounded hover:bg-gray-700 transition-colors ${
                  player.relation_type === s.key ? 'text-emerald-400' : 'text-gray-300'
                }`}
              >
                {player.relation_type === s.key ? '✓ ' : ''}{s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
