import type { ClubRequest, CRMPlayer, RequestPlayerMatch, RiskLevel } from '../types';

function positionScore(reqPos: string, mainPos: string, secPos: string): number {
  if (!reqPos || !mainPos) return 5;
  const norm = (s: string) => s.toLowerCase().trim();
  const req = norm(reqPos);
  const main = norm(mainPos);
  const sec = norm(secPos || '');

  if (main === req || main.includes(req) || req.includes(main)) return 10;
  if (sec && (sec.includes(req) || req.includes(sec))) return 7;

  const families: Record<string, string[]> = {
    goleiro: ['goleiro', 'gk', 'goalkeeper'],
    defensor: ['zagueiro', 'cb', 'defensor'],
    lateral: ['lateral', 'rb', 'lb', 'fullback', 'wingback'],
    volante: ['volante', 'cdm', 'defensive', 'pivô'],
    meia: ['meia', 'cm', 'cam', 'am', 'meio'],
    ponta: ['ponta', 'rm', 'lm', 'winger', 'extremo', 'ala'],
    atacante: ['atacante', 'st', 'cf', 'striker', 'forward', 'centroavante'],
  };

  const getFamily = (pos: string) => {
    for (const [fam, terms] of Object.entries(families)) {
      if (terms.some((t) => pos.includes(t))) return fam;
    }
    return null;
  };

  if (getFamily(req) !== null && getFamily(req) === getFamily(main)) return 6;
  return 2;
}

function footScore(reqFoot: string, playerFoot: string): number {
  if (!reqFoot || reqFoot === 'indiferente') return 8;
  if (playerFoot === 'ambidestro') return 9;
  return reqFoot === playerFoot ? 10 : 3;
}

function ageScore(
  min: number | null,
  max: number | null,
  age: number | null
): number {
  if (!age) return 5;
  if (!min && !max) return 7;
  if (min !== null && max !== null) {
    if (age >= min && age <= max) return 10;
    const dist = Math.min(Math.abs(age - min), Math.abs(age - max));
    return Math.max(0, 10 - dist * 2);
  }
  if (min !== null && age >= min) return 9;
  if (max !== null && age <= max) return 9;
  return 5;
}

function heightScore(
  min: number | null,
  max: number | null,
  h: number | null
): number {
  if (!h) return 6;
  if (!min && !max) return 8;
  const inRange =
    (min === null || h >= min) && (max === null || h <= max);
  if (inRange) return 10;
  const dists: number[] = [];
  if (min !== null) dists.push(Math.abs(h - min));
  if (max !== null) dists.push(Math.abs(h - max));
  const dist = dists.length ? Math.min(...dists) : 0;
  return Math.max(0, 10 - dist * 0.5);
}

function budgetScore(budget: number | null, value: number | null): number {
  if (!budget || !value) return 6;
  if (value <= budget) return 10;
  if (value <= budget * 1.1) return 8;
  if (value <= budget * 1.25) return 5;
  if (value <= budget * 1.5) return 2;
  return 0;
}

function availScore(level: string): number {
  if (level === 'alta') return 10;
  if (level === 'media') return 6;
  if (level === 'baixa') return 2;
  return 5;
}

function accessScore(level: string): number {
  if (level === 'direto') return 10;
  if (level === 'indireto') return 6;
  return 2;
}

function dealTypeScore(req: string, player: string): number {
  if (!req || !player) return 7;
  if (req === player) return 10;
  const compraCat = ['compra', 'free_agent'];
  const empCat = [
    'emprestimo',
    'emprestimo_com_opcao',
    'emprestimo_com_obrigacao',
  ];
  if (compraCat.includes(req) && compraCat.includes(player)) return 8;
  if (empCat.includes(req) && empCat.includes(player)) return 8;
  return 3;
}

function marketScore(
  preferredCountries: string,
  priorityMarkets: string,
  acceptedMarkets: string
): number {
  if (!preferredCountries || (!priorityMarkets && !acceptedMarkets)) return 6;
  const pref = preferredCountries.toLowerCase();
  const available = (priorityMarkets + ' ' + acceptedMarkets).toLowerCase();
  const prefList = pref
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const p of prefList) {
    if (available.includes(p)) return 10;
  }
  return 4;
}

function buildSummary(
  sports: number,
  financial: number,
  commercial: number,
  player: CRMPlayer
): string {
  const parts: string[] = [];
  if (sports >= 70) parts.push('boa compatibilidade esportiva');
  else if (sports >= 45) parts.push('compatibilidade esportiva parcial');
  else parts.push('baixa compatibilidade esportiva');

  if (financial >= 70) parts.push('dentro do orçamento');
  else if (financial >= 45) parts.push('orçamento no limite');
  else parts.push('fora do orçamento');

  if (player.access_level === 'direto') parts.push('acesso comercial direto');
  else if (player.access_level === 'indireto') parts.push('acesso via parceiro');

  if (player.availability_level === 'alta')
    parts.push('alta disponibilidade de saída');
  else if (player.availability_level === 'baixa')
    parts.push('baixa disponibilidade percebida');

  if (commercial >= 70) parts.push('perfil comercial favorável');

  if (
    player.recent_minutes !== null &&
    player.recent_minutes < 500
  )
    parts.push('pouca minutagem recente (atenção)');

  if (parts.length === 0) return 'Dados insuficientes para análise completa.';

  const [first, ...rest] = parts;
  return (
    first.charAt(0).toUpperCase() +
    first.slice(1) +
    (rest.length ? '. ' + rest.join('. ') : '') +
    '.'
  );
}

export function computeMatch(
  request: ClubRequest,
  player: CRMPlayer
): RequestPlayerMatch {
  const p = positionScore(
    request.position_main,
    player.primary_position,
    player.secondary_positions
  );
  const f = footScore(request.preferred_foot, player.preferred_foot);
  const a = ageScore(request.age_min, request.age_max, player.age);
  const h = heightScore(request.height_min, request.height_max, player.height);
  const sports_fit_score = Math.min(
    100,
    Math.round(((p + f + a + h) / 4) * 10)
  );

  const b = budgetScore(request.transfer_budget, player.market_value);
  const s = budgetScore(request.salary_budget, player.estimated_salary);
  const d = dealTypeScore(request.deal_type, player.deal_type_possible);
  const financial_fit_score = Math.min(
    100,
    Math.round(((b + s + d) / 3) * 10)
  );

  const av = availScore(player.availability_level);
  const ac = accessScore(player.access_level);
  const ex = availScore(player.exit_probability);
  const commercial_fit_score = Math.min(
    100,
    Math.round(((av + ac + ex) / 3) * 10)
  );

  const mk = marketScore(
    request.preferred_countries,
    player.priority_markets,
    player.accepted_markets
  );
  const strategic_fit_score = Math.min(100, Math.round(mk * 10));

  const final_score = Math.min(
    100,
    Math.round(
      sports_fit_score * 0.3 +
        financial_fit_score * 0.25 +
        commercial_fit_score * 0.25 +
        strategic_fit_score * 0.2
    )
  );

  const risk_level: RiskLevel =
    final_score >= 70 ? 'baixo' : final_score >= 45 ? 'medio' : 'alto';

  return {
    id: `${request.id}_${player.id}`,
    request_id: request.id,
    player_id: player.id,
    sports_fit_score,
    financial_fit_score,
    commercial_fit_score,
    strategic_fit_score,
    final_score,
    risk_level,
    fit_summary: buildSummary(
      sports_fit_score,
      financial_fit_score,
      commercial_fit_score,
      player
    ),
    match_status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function runMatchesForRequest(
  request: ClubRequest,
  players: CRMPlayer[]
): RequestPlayerMatch[] {
  return players
    .filter((p) => p.relation_type !== 'arquivado')
    .map((p) => computeMatch(request, p))
    .sort((a, b) => b.final_score - a.final_score);
}

export function runMatchesForPlayer(
  player: CRMPlayer,
  requests: ClubRequest[]
): RequestPlayerMatch[] {
  return requests
    .filter(
      (r) =>
        r.status !== 'arquivado' &&
        r.status !== 'fechado' &&
        r.status !== 'cancelado'
    )
    .map((r) => computeMatch(r, player))
    .sort((a, b) => b.final_score - a.final_score);
}

export function runAllMatches(
  requests: ClubRequest[],
  players: CRMPlayer[]
): RequestPlayerMatch[] {
  const activeRequests = requests.filter(
    (r) =>
      r.status !== 'arquivado' &&
      r.status !== 'fechado' &&
      r.status !== 'cancelado'
  );
  const activePlayers = players.filter(
    (p) => p.relation_type !== 'arquivado'
  );
  const results: RequestPlayerMatch[] = [];
  for (const r of activeRequests) {
    for (const p of activePlayers) {
      results.push(computeMatch(r, p));
    }
  }
  return results.sort((a, b) => b.final_score - a.final_score);
}
