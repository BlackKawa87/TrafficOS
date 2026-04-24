import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { db } from '../store/storage';
import { generateId, now, POSITIONS, buildTransfermarktUrl } from '../utils/helpers';
import type { ClubRequest, CRMPlayer } from '../types';

interface ExternalPlayer {
  full_name: string;
  short_name: string;
  nationality: string;
  age: string;
  position: string;
  current_club: string;
  current_league: string;
  market_value: string;
  contract_until: string;
  preferred_foot: string;
  notes: string;
  source_url: string;
}

const EMPTY_PLAYER: ExternalPlayer = {
  full_name: '',
  short_name: '',
  nationality: '',
  age: '',
  position: '',
  current_club: '',
  current_league: '',
  market_value: '',
  contract_until: '',
  preferred_foot: 'indiferente',
  notes: '',
  source_url: '',
};

export default function BuscarMercado() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('request');

  const [request, setRequest] = useState<ClubRequest | null>(null);
  const [filters, setFilters] = useState({
    position: '',
    ageMin: '',
    ageMax: '',
    foot: '',
    nationality: '',
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [playerForm, setPlayerForm] = useState<ExternalPlayer>(EMPTY_PLAYER);
  const [savedPlayers, setSavedPlayers] = useState<CRMPlayer[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (requestId) {
      const req = db.requests.getById(requestId);
      if (req) {
        setRequest(req);
        setFilters({
          position: req.position_main || '',
          ageMin: req.age_min ? String(req.age_min) : '',
          ageMax: req.age_max ? String(req.age_max) : '',
          foot: req.preferred_foot !== 'indiferente' ? req.preferred_foot : '',
          nationality: '',
        });
      }
    }
    setSavedPlayers(
      db.players.getAll().filter(
        (p) =>
          p.external_source === 'busca_mercado' ||
          p.relation_type === 'oportunidade_externa'
      )
    );
  }, [requestId]);

  const tmUrl = buildTransfermarktUrl({
    position: filters.position,
    ageMin: filters.ageMin ? Number(filters.ageMin) : null,
    ageMax: filters.ageMax ? Number(filters.ageMax) : null,
    foot: filters.foot,
    valueMax: null,
    nationality: filters.nationality,
  });

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function setField(key: keyof ExternalPlayer, value: string) {
    setPlayerForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSavePlayer() {
    if (!playerForm.full_name.trim()) return;
    const t = now();
    const player: CRMPlayer = {
      id: generateId(),
      api_football_id: '',
      full_name: playerForm.full_name,
      short_name: playerForm.short_name || playerForm.full_name,
      birth_date: '',
      age: playerForm.age ? Number(playerForm.age) : null,
      nationality: playerForm.nationality,
      second_nationality: '',
      eu_passport: false,
      preferred_foot: (playerForm.preferred_foot as CRMPlayer['preferred_foot']) || 'indiferente',
      height: null,
      weight: null,
      primary_position: playerForm.position,
      secondary_positions: '',
      current_club: playerForm.current_club,
      current_club_country: '',
      current_league: playerForm.current_league,
      contract_until: playerForm.contract_until,
      squad_status: 'rotacao',
      recent_minutes: null,
      club_history: '',
      transfer_history: '',
      market_value: playerForm.market_value ? parseFloat(playerForm.market_value.replace(/[^0-9.]/g, '')) * 1_000_000 : null,
      market_value_currency: 'EUR',
      estimated_salary: null,
      estimated_salary_currency: 'EUR',
      deal_type_possible: 'compra',
      availability_level: 'media',
      exit_probability: 'media',
      ideal_exit_window: '',
      priority_markets: '',
      accepted_markets: '',
      blocked_markets: '',
      relation_type: 'oportunidade_externa',
      partner_name: '',
      commission_notes: '',
      access_level: 'dificil',
      last_contact_date: '',
      contact_status: '',
      commercial_notes: '',
      playing_style: '',
      physical_profile: '',
      technical_profile: '',
      tactical_profile: '',
      strengths: '',
      concerns: '',
      ideal_league_fit: '',
      ideal_game_model: '',
      custom_tags: '',
      internal_priority: 'media',
      favorite: false,
      notes: playerForm.notes,
      external_source_url: playerForm.source_url,
      external_source: 'busca_mercado',
      created_at: t,
      updated_at: t,
    };

    db.players.save(player);
    db.logs.add({
      entity_type: 'player',
      entity_id: player.id,
      action_type: 'created',
      note: `Jogador ${player.short_name} adicionado via Buscar Mercado`,
    });

    if (requestId) {
      db.shortlists.add(requestId, player.id);
    }

    setSavedPlayers(db.players.getAll().filter(
      (p) => p.external_source === 'busca_mercado' || p.relation_type === 'oportunidade_externa'
    ));
    setPlayerForm(EMPTY_PLAYER);
    setShowAddForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500';
  const selectCls = `${inputCls} cursor-pointer`;

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Buscar no Mercado</h1>
          <p className="text-gray-400 text-sm mt-1">
            Pesquise externamente e registre jogadores de interesse
          </p>
        </div>
        {request && (
          <Link
            to={`/crm/pedidos/${request.id}`}
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            ← {request.club_name} — {request.position_main}
          </Link>
        )}
      </div>

      {/* Filters + TM link */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
        <h2 className="text-white font-semibold text-sm">Filtros de Busca</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Posição</label>
            <select
              className={selectCls}
              value={filters.position}
              onChange={(e) => setFilter('position', e.target.value)}
            >
              <option value="">Qualquer</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Idade mín.</label>
            <input
              type="number"
              className={inputCls}
              placeholder="Ex: 18"
              value={filters.ageMin}
              onChange={(e) => setFilter('ageMin', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Idade máx.</label>
            <input
              type="number"
              className={inputCls}
              placeholder="Ex: 28"
              value={filters.ageMax}
              onChange={(e) => setFilter('ageMax', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Pé</label>
            <select
              className={selectCls}
              value={filters.foot}
              onChange={(e) => setFilter('foot', e.target.value)}
            >
              <option value="">Qualquer</option>
              <option value="direito">Direito</option>
              <option value="esquerdo">Esquerdo</option>
              <option value="ambidestro">Ambidestro</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nacionalidade</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Ex: Brasil"
              value={filters.nationality}
              onChange={(e) => setFilter('nationality', e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <a
            href={tmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            🔍 Abrir Transfermarkt
          </a>
          <p className="text-gray-500 text-xs">Abre com os filtros aplicados em nova aba</p>
        </div>
      </div>

      {/* Add player manually */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">Registrar Jogador Encontrado</h2>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-lg text-sm transition-colors"
            >
              + Adicionar
            </button>
          )}
        </div>

        {saved && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 text-sm">
            ✓ Jogador salvo{requestId ? ' e adicionado à shortlist do pedido' : ''}!
          </div>
        )}

        {showAddForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome Completo *</label>
                <input className={inputCls} value={playerForm.full_name} onChange={(e) => setField('full_name', e.target.value)} placeholder="Nome completo" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome Curto</label>
                <input className={inputCls} value={playerForm.short_name} onChange={(e) => setField('short_name', e.target.value)} placeholder="Como é conhecido" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Posição</label>
                <select className={selectCls} value={playerForm.position} onChange={(e) => setField('position', e.target.value)}>
                  <option value="">—</option>
                  {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Pé</label>
                <select className={selectCls} value={playerForm.preferred_foot} onChange={(e) => setField('preferred_foot', e.target.value)}>
                  <option value="indiferente">Indiferente</option>
                  <option value="direito">Direito</option>
                  <option value="esquerdo">Esquerdo</option>
                  <option value="ambidestro">Ambidestro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nacionalidade</label>
                <input className={inputCls} value={playerForm.nationality} onChange={(e) => setField('nationality', e.target.value)} placeholder="Ex: Brasil" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Idade</label>
                <input type="number" className={inputCls} value={playerForm.age} onChange={(e) => setField('age', e.target.value)} placeholder="Ex: 24" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Clube Atual</label>
                <input className={inputCls} value={playerForm.current_club} onChange={(e) => setField('current_club', e.target.value)} placeholder="Nome do clube" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Liga</label>
                <input className={inputCls} value={playerForm.current_league} onChange={(e) => setField('current_league', e.target.value)} placeholder="Ex: Serie A" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Valor de Mercado (M€)</label>
                <input className={inputCls} value={playerForm.market_value} onChange={(e) => setField('market_value', e.target.value)} placeholder="Ex: 5.5" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Contrato até</label>
                <input type="date" className={inputCls} value={playerForm.contract_until} onChange={(e) => setField('contract_until', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">URL da Fonte (Transfermarkt etc.)</label>
                <input className={inputCls} value={playerForm.source_url} onChange={(e) => setField('source_url', e.target.value)} placeholder="https://..." />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Notas</label>
                <textarea rows={2} className={`${inputCls} resize-none`} value={playerForm.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Observações sobre o jogador..." />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSavePlayer}
                disabled={!playerForm.full_name.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Salvar Jogador{requestId ? ' + Shortlist' : ''}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setPlayerForm(EMPTY_PLAYER); }}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Saved external players */}
      {savedPlayers.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-3">
          <h2 className="text-white font-semibold text-sm">
            Externos Salvos ({savedPlayers.length})
          </h2>
          <div className="space-y-2">
            {savedPlayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-white text-sm font-medium">{p.short_name || p.full_name}</p>
                  <p className="text-gray-500 text-xs">
                    {p.primary_position && `${p.primary_position} · `}
                    {p.current_club && `${p.current_club}`}
                    {p.age ? ` · ${p.age} anos` : ''}
                    {p.market_value ? ` · €${(p.market_value / 1_000_000).toFixed(1)}M` : ''}
                  </p>
                </div>
                <Link
                  to={`/crm/jogadores/${p.id}`}
                  className="text-emerald-400 hover:text-emerald-300 text-xs"
                >
                  Ver →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          to="/crm/jogadores"
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          Ver todos os jogadores →
        </Link>
        {requestId && (
          <Link
            to={`/crm/pedidos/${requestId}`}
            className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
          >
            Voltar ao pedido →
          </Link>
        )}
      </div>
    </div>
  );
}
