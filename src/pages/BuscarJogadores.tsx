import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { db } from '../store/storage';
import { computeMatch } from '../utils/matching';
import type { ClubRequest, CRMPlayer, RequestPlayerMatch } from '../types';
import StatusBadge from '../components/StatusBadge';
import ScoreMeter from '../components/ScoreMeter';
import { formatCurrency, POSITIONS, FOOT_LABELS } from '../utils/helpers';

interface Filters {
  position: string;
  foot: string;
  ageMin: string;
  ageMax: string;
  heightMin: string;
  heightMax: string;
  budgetMax: string;
  nationality: string;
}

export default function BuscarJogadores() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('request');

  const [sourceRequest, setSourceRequest] = useState<ClubRequest | null>(null);
  const [filters, setFilters] = useState<Filters>({
    position: '',
    foot: '',
    ageMin: '',
    ageMax: '',
    heightMin: '',
    heightMax: '',
    budgetMax: '',
    nationality: '',
  });
  const [results, setResults] = useState<{ player: CRMPlayer; match: RequestPlayerMatch }[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (requestId) {
      const req = db.requests.getById(requestId);
      if (req) {
        setSourceRequest(req);
        setFilters({
          position: req.position_main || '',
          foot: req.preferred_foot === 'indiferente' ? '' : req.preferred_foot,
          ageMin: req.age_min !== null ? String(req.age_min) : '',
          ageMax: req.age_max !== null ? String(req.age_max) : '',
          heightMin: req.height_min !== null ? String(req.height_min) : '',
          heightMax: req.height_max !== null ? String(req.height_max) : '',
          budgetMax: req.transfer_budget !== null ? String(req.transfer_budget) : '',
          nationality: req.preferred_nationalities || '',
        });
      }
    }
  }, [requestId]);

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
  };

  function runSearch() {
    const players = db.players.getAll().filter(
      (p) => p.relation_type !== 'arquivado'
    );

    const filtered = players.filter((p) => {
      if (
        filters.position &&
        !p.primary_position.toLowerCase().includes(filters.position.toLowerCase()) &&
        !p.secondary_positions.toLowerCase().includes(filters.position.toLowerCase())
      )
        return false;
      if (filters.foot && p.preferred_foot !== filters.foot && p.preferred_foot !== 'ambidestro')
        return false;
      if (filters.ageMin && p.age !== null && p.age < Number(filters.ageMin)) return false;
      if (filters.ageMax && p.age !== null && p.age > Number(filters.ageMax)) return false;
      if (filters.heightMin && p.height !== null && p.height < Number(filters.heightMin)) return false;
      if (filters.heightMax && p.height !== null && p.height > Number(filters.heightMax)) return false;
      if (filters.budgetMax && p.market_value !== null && p.market_value > Number(filters.budgetMax)) return false;
      if (
        filters.nationality &&
        !p.nationality.toLowerCase().includes(filters.nationality.toLowerCase()) &&
        !p.second_nationality.toLowerCase().includes(filters.nationality.toLowerCase())
      )
        return false;
      return true;
    });

    // Compute match score against source request or a dummy request
    const dummyRequest: ClubRequest = sourceRequest || {
      id: '__search__',
      club_name: '',
      club_country: '',
      club_league: '',
      contact_name: '',
      contact_role: '',
      contact_method: '',
      request_date: '',
      transfer_window: '',
      priority: 'media',
      status: 'aberto',
      position_main: filters.position,
      position_secondary: '',
      preferred_foot: (filters.foot as ClubRequest['preferred_foot']) || 'indiferente',
      age_min: filters.ageMin ? Number(filters.ageMin) : null,
      age_max: filters.ageMax ? Number(filters.ageMax) : null,
      height_min: filters.heightMin ? Number(filters.heightMin) : null,
      height_max: filters.heightMax ? Number(filters.heightMax) : null,
      preferred_nationalities: filters.nationality,
      restricted_nationalities: '',
      preferred_leagues: '',
      excluded_leagues: '',
      preferred_countries: '',
      physical_profile: '',
      technical_profile: '',
      tactical_profile: '',
      player_style: '',
      mandatory_traits: '',
      desired_traits: '',
      transfer_budget: filters.budgetMax ? Number(filters.budgetMax) : null,
      transfer_budget_currency: 'EUR',
      salary_budget: null,
      salary_budget_currency: 'EUR',
      total_package_budget: null,
      total_package_currency: 'EUR',
      deal_type: 'compra',
      resale_focus: false,
      needs_ready_player: false,
      accepts_project_player: true,
      accepts_low_minutes: true,
      accepts_recovering: false,
      accepts_lower_division: true,
      notes: '',
      created_at: '',
      updated_at: '',
    };

    const scored = filtered
      .map((p) => ({ player: p, match: computeMatch(dummyRequest, p) }))
      .sort((a, b) => b.match.final_score - a.match.final_score);

    setResults(scored);
    setHasSearched(true);

    if (requestId) {
      setShortlistedIds(new Set(db.shortlists.getByRequest(requestId).map((s) => s.player_id)));
    }
  }

  function toggleShortlist(playerId: string) {
    if (!requestId) return;
    if (shortlistedIds.has(playerId)) {
      db.shortlists.deleteByPair(requestId, playerId);
    } else {
      db.shortlists.add(requestId, playerId);
    }
    setShortlistedIds(new Set(db.shortlists.getByRequest(requestId).map((s) => s.player_id)));
  }

  const inputCls =
    'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500';

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Buscar Jogadores</h1>
        {sourceRequest && (
          <p className="text-gray-400 text-sm mt-1">
            Busca vinculada ao pedido:{' '}
            <Link to={`/crm/pedidos/${sourceRequest.id}`} className="text-emerald-400 hover:text-emerald-300">
              {sourceRequest.club_name} — {sourceRequest.position_main}
            </Link>
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
          Filtros
          {sourceRequest && (
            <span className="text-gray-500 normal-case font-normal ml-2">
              (pré-preenchidos pelo pedido)
            </span>
          )}
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Posição</label>
            <select
              className={inputCls}
              value={filters.position}
              onChange={(e) => setFilter('position', e.target.value)}
            >
              <option value="">Qualquer</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Pé Preferencial</label>
            <select
              className={inputCls}
              value={filters.foot}
              onChange={(e) => setFilter('foot', e.target.value)}
            >
              <option value="">Indiferente</option>
              {Object.entries(FOOT_LABELS)
                .filter(([k]) => k !== 'indiferente')
                .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Idade Mín.</label>
            <input
              type="number"
              className={inputCls}
              value={filters.ageMin}
              onChange={(e) => setFilter('ageMin', e.target.value)}
              placeholder="Ex: 20"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Idade Máx.</label>
            <input
              type="number"
              className={inputCls}
              value={filters.ageMax}
              onChange={(e) => setFilter('ageMax', e.target.value)}
              placeholder="Ex: 28"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Altura Mín. (cm)</label>
            <input
              type="number"
              className={inputCls}
              value={filters.heightMin}
              onChange={(e) => setFilter('heightMin', e.target.value)}
              placeholder="Ex: 180"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Budget Máx. (valor mercado)</label>
            <input
              type="number"
              className={inputCls}
              value={filters.budgetMax}
              onChange={(e) => setFilter('budgetMax', e.target.value)}
              placeholder="Ex: 5000000"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nacionalidade</label>
            <input
              className={inputCls}
              value={filters.nationality}
              onChange={(e) => setFilter('nationality', e.target.value)}
              placeholder="Ex: Brasileira"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={runSearch}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🔍 Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm">
            {results.length} jogador{results.length !== 1 ? 'es' : ''} encontrado{results.length !== 1 ? 's' : ''}
            {requestId && ` · ${shortlistedIds.size} na shortlist`}
          </p>
          {results.length === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
              <p className="text-gray-500">Nenhum jogador encontrado com estes filtros.</p>
            </div>
          ) : (
            results.map(({ player, match }) => (
              <div key={player.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link to={`/crm/jogadores/${player.id}`} className="text-white font-medium hover:text-emerald-400">
                      {player.short_name || player.full_name}
                      {player.favorite && ' ⭐'}
                    </Link>
                    <StatusBadge type="relation" value={player.relation_type} />
                    <StatusBadge type="availability" value={player.availability_level} />
                  </div>
                  <p className="text-gray-400 text-xs mb-2">
                    {player.primary_position}
                    {player.age ? ` · ${player.age} anos` : ''}
                    {player.preferred_foot ? ` · ${FOOT_LABELS[player.preferred_foot]}` : ''}
                    {player.height ? ` · ${player.height}cm` : ''}
                    {player.current_club ? ` · ${player.current_club}` : ''}
                    {player.market_value ? ` · ${formatCurrency(player.market_value, player.market_value_currency)}` : ''}
                  </p>
                  <p className="text-gray-500 text-xs italic">{match.fit_summary}</p>
                  {sourceRequest && (
                    <div className="grid grid-cols-4 gap-3 mt-3">
                      {[
                        { label: 'Esportivo', score: match.sports_fit_score },
                        { label: 'Financeiro', score: match.financial_fit_score },
                        { label: 'Comercial', score: match.commercial_fit_score },
                        { label: 'Estratégico', score: match.strategic_fit_score },
                      ].map((s) => (
                        <div key={s.label}>
                          <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                          <ScoreMeter score={s.score} size="sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${match.final_score >= 70 ? 'text-emerald-400' : match.final_score >= 45 ? 'text-amber-400' : 'text-red-400'}`}>
                      {match.final_score}
                    </p>
                    <p className="text-xs text-gray-500">score</p>
                  </div>
                  {requestId && (
                    <button
                      onClick={() => toggleShortlist(player.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        shortlistedIds.has(player.id)
                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {shortlistedIds.has(player.id) ? '✓ Shortlist' : '+ Shortlist'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
