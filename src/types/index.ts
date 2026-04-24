export type Priority = 'baixa' | 'media' | 'alta';

export type RequestStatus =
  | 'aberto'
  | 'em_analise'
  | 'match_encontrado'
  | 'busca_externa'
  | 'shortlist_criada'
  | 'shortlist_enviada'
  | 'aguardando_retorno'
  | 'em_negociacao'
  | 'fechado'
  | 'perdido'
  | 'cancelado'
  | 'arquivado';

export type DealType =
  | 'compra'
  | 'emprestimo'
  | 'free_agent'
  | 'emprestimo_com_opcao'
  | 'emprestimo_com_obrigacao';

export type PreferredFoot = 'direito' | 'esquerdo' | 'ambidestro' | 'indiferente';
export type AvailabilityLevel = 'alta' | 'media' | 'baixa';
export type AccessLevel = 'direto' | 'indireto' | 'dificil';
export type SquadStatus = 'titular' | 'rotacao' | 'reserva' | 'fora_dos_planos' | 'emprestado';
export type RiskLevel = 'baixo' | 'medio' | 'alto';
export type MatchStatus = 'active' | 'shortlisted' | 'offered' | 'rejected' | 'closed';
export type ShortlistStatus = 'na_lista' | 'aprovado' | 'descartado' | 'em_negociacao';

export type RelationType =
  | 'proprio'
  | 'parceiro'
  | 'monitorado'
  | 'oportunidade'
  | 'oportunidade_externa'
  | 'pesquisar_empresario'
  | 'contato_iniciado'
  | 'parceria_negociando'
  | 'autorizado'
  | 'oferecido'
  | 'em_negociacao'
  | 'sem_fit'
  | 'sem_acesso'
  | 'descartado'
  | 'arquivado';

export interface ClubRequest {
  id: string;
  club_name: string;
  club_country: string;
  club_league: string;
  contact_name: string;
  contact_role: string;
  contact_method: string;
  request_date: string;
  transfer_window: string;
  priority: Priority;
  status: RequestStatus;

  position_main: string;
  position_secondary: string;
  preferred_foot: PreferredFoot;
  age_min: number | null;
  age_max: number | null;
  height_min: number | null;
  height_max: number | null;
  preferred_nationalities: string;
  restricted_nationalities: string;
  preferred_leagues: string;
  excluded_leagues: string;
  preferred_countries: string;
  physical_profile: string;
  technical_profile: string;
  tactical_profile: string;
  player_style: string;
  mandatory_traits: string;
  desired_traits: string;

  transfer_budget: number | null;
  transfer_budget_currency: string;
  salary_budget: number | null;
  salary_budget_currency: string;
  total_package_budget: number | null;
  total_package_currency: string;
  deal_type: DealType;
  resale_focus: boolean;

  needs_ready_player: boolean;
  accepts_project_player: boolean;
  accepts_low_minutes: boolean;
  accepts_recovering: boolean;
  accepts_lower_division: boolean;
  notes: string;

  created_at: string;
  updated_at: string;
}

export interface CRMPlayer {
  id: string;
  api_football_id: string;
  full_name: string;
  short_name: string;
  birth_date: string;
  age: number | null;
  nationality: string;
  second_nationality: string;
  eu_passport: boolean;
  preferred_foot: PreferredFoot;
  height: number | null;
  weight: number | null;
  primary_position: string;
  secondary_positions: string;

  current_club: string;
  current_club_country: string;
  current_league: string;
  contract_until: string;
  squad_status: SquadStatus;
  recent_minutes: number | null;
  club_history: string;
  transfer_history: string;

  market_value: number | null;
  market_value_currency: string;
  estimated_salary: number | null;
  estimated_salary_currency: string;
  deal_type_possible: DealType;
  availability_level: AvailabilityLevel;
  exit_probability: AvailabilityLevel;
  ideal_exit_window: string;
  priority_markets: string;
  accepted_markets: string;
  blocked_markets: string;

  relation_type: RelationType;
  partner_name: string;
  commission_notes: string;
  access_level: AccessLevel;
  last_contact_date: string;
  contact_status: string;
  commercial_notes: string;

  playing_style: string;
  physical_profile: string;
  technical_profile: string;
  tactical_profile: string;
  strengths: string;
  concerns: string;
  ideal_league_fit: string;
  ideal_game_model: string;

  custom_tags: string;
  internal_priority: Priority;
  favorite: boolean;
  notes: string;

  // external source info
  external_source_url: string;
  external_source: string;

  created_at: string;
  updated_at: string;
}

export interface RequestPlayerMatch {
  id: string;
  request_id: string;
  player_id: string;
  sports_fit_score: number;
  financial_fit_score: number;
  commercial_fit_score: number;
  strategic_fit_score: number;
  final_score: number;
  risk_level: RiskLevel;
  fit_summary: string;
  match_status: MatchStatus;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  entity_type: 'request' | 'player' | 'match';
  entity_id: string;
  action_type: string;
  previous_value?: string;
  new_value?: string;
  note: string;
  created_at: string;
}

export interface Shortlist {
  id: string;
  request_id: string;
  player_id: string;
  shortlist_status: ShortlistStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

// AI Import types
export interface ImportedRequest {
  club_name: string;
  club_country: string;
  club_league: string;
  position_main: string;
  position_secondary: string;
  preferred_foot: PreferredFoot;
  age_min: number | null;
  age_max: number | null;
  height_min: number | null;
  transfer_budget: number | null;
  transfer_budget_currency: string;
  deal_type: DealType;
  player_style: string;
  notes: string;
  priority: Priority;
}

export interface ImportedPlayer {
  full_name: string;
  short_name: string;
  age: number | null;
  nationality: string;
  preferred_foot: PreferredFoot;
  height: number | null;
  primary_position: string;
  current_club: string;
  current_league: string;
  market_value: number | null;
  market_value_currency: string;
  contract_until: string;
  partner_name: string;
  notes: string;
}

export interface ImportResult {
  detected_type: 'requests' | 'players' | 'both';
  confidence: 'high' | 'medium' | 'low';
  requests: ImportedRequest[];
  players: ImportedPlayer[];
}
