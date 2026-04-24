import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../store/storage';
import { runMatchesForPlayer } from '../utils/matching';
import { generateId, now, POSITIONS, CURRENCIES, DEAL_TYPE_LABELS } from '../utils/helpers';
import type {
  CRMPlayer,
  DealType,
  PreferredFoot,
  Priority,
  RelationType,
  SquadStatus,
  AvailabilityLevel,
  AccessLevel,
} from '../types';

const emptyPlayer = (): CRMPlayer => ({
  id: generateId(),
  api_football_id: '',
  full_name: '',
  short_name: '',
  birth_date: '',
  age: null,
  nationality: '',
  second_nationality: '',
  eu_passport: false,
  preferred_foot: 'direito',
  height: null,
  weight: null,
  primary_position: '',
  secondary_positions: '',
  current_club: '',
  current_club_country: '',
  current_league: '',
  contract_until: '',
  squad_status: 'rotacao',
  recent_minutes: null,
  club_history: '',
  transfer_history: '',
  market_value: null,
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
  relation_type: 'monitorado',
  partner_name: '',
  commission_notes: '',
  access_level: 'indireto',
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
  notes: '',
  external_source_url: '',
  external_source: '',
  created_at: now(),
  updated_at: now(),
});

const inputCls =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500';
const selectCls =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500';
const textareaCls =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 resize-none';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
      <h2 className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) {
  return (
    <div className={half ? 'flex-1' : 'w-full'}>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function JogadorForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id && id !== 'novo');

  const [form, setForm] = useState<CRMPlayer>(emptyPlayer());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      const existing = db.players.getById(id);
      if (existing) setForm(existing);
    }
  }, [id, isEdit]);

  const set = <K extends keyof CRMPlayer>(key: K, value: CRMPlayer[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const setNum = (key: keyof CRMPlayer, raw: string) => {
    const n = raw === '' ? null : Number(raw);
    setForm((f) => ({ ...f, [key]: n }));
  };

  async function handleSave() {
    if (!form.full_name.trim()) {
      alert('Informe o nome do jogador.');
      return;
    }
    setSaving(true);

    // Auto-calc age from birth_date
    let player = { ...form, updated_at: now() };
    if (form.birth_date && !form.age) {
      const born = new Date(form.birth_date);
      const ageDiff = Date.now() - born.getTime();
      const ageDate = new Date(ageDiff);
      player = { ...player, age: Math.abs(ageDate.getUTCFullYear() - 1970) };
    }

    db.players.save(player);

    const requests = db.requests.getAll();
    const matches = runMatchesForPlayer(player, requests);
    db.matches.saveAll(matches);

    db.logs.add({
      entity_type: 'player',
      entity_id: form.id,
      action_type: isEdit ? 'updated' : 'created',
      note: isEdit ? 'Jogador atualizado' : 'Jogador cadastrado',
    });

    setSaving(false);
    navigate(`/crm/jogadores/${form.id}`);
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? 'Editar Jogador' : 'Novo Jogador'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {isEdit ? (form.short_name || form.full_name) : 'Preencha os dados do jogador'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar Jogador'}
          </button>
        </div>
      </div>

      {/* Section 1: Identificação */}
      <Section title="Identificação">
        <div className="flex gap-4">
          <Field label="Nome Completo *" half>
            <input className={inputCls} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Nome completo do jogador" />
          </Field>
          <Field label="Nome Curto" half>
            <input className={inputCls} value={form.short_name} onChange={(e) => set('short_name', e.target.value)} placeholder="Como é conhecido" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Data de Nascimento" half>
            <input type="date" className={inputCls} value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
          </Field>
          <Field label="Idade" half>
            <input type="number" className={inputCls} value={form.age ?? ''} onChange={(e) => setNum('age', e.target.value)} placeholder="Calculada automaticamente" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Nacionalidade" half>
            <input className={inputCls} value={form.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="Ex: Brasileira" />
          </Field>
          <Field label="Segunda Nacionalidade" half>
            <input className={inputCls} value={form.second_nationality} onChange={(e) => set('second_nationality', e.target.value)} placeholder="Ex: Italiana" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Pé Dominante" half>
            <select className={selectCls} value={form.preferred_foot} onChange={(e) => set('preferred_foot', e.target.value as PreferredFoot)}>
              <option value="direito">Direito</option>
              <option value="esquerdo">Esquerdo</option>
              <option value="ambidestro">Ambidestro</option>
            </select>
          </Field>
          <div className="flex-1 flex items-center gap-6 pt-5">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" className="accent-emerald-500 w-4 h-4" checked={form.eu_passport} onChange={(e) => set('eu_passport', e.target.checked)} />
              Passaporte UE
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" className="accent-emerald-500 w-4 h-4" checked={form.favorite} onChange={(e) => set('favorite', e.target.checked)} />
              ⭐ Favorito
            </label>
          </div>
        </div>
        <div className="flex gap-4">
          <Field label="Altura (cm)" half>
            <input type="number" className={inputCls} value={form.height ?? ''} onChange={(e) => setNum('height', e.target.value)} placeholder="Ex: 182" />
          </Field>
          <Field label="Peso (kg)" half>
            <input type="number" className={inputCls} value={form.weight ?? ''} onChange={(e) => setNum('weight', e.target.value)} placeholder="Ex: 78" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Posição Principal" half>
            <select className={selectCls} value={form.primary_position} onChange={(e) => set('primary_position', e.target.value)}>
              <option value="">Selecionar...</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Posições Secundárias" half>
            <input className={inputCls} value={form.secondary_positions} onChange={(e) => set('secondary_positions', e.target.value)} placeholder="Ex: Volante, Meia" />
          </Field>
        </div>
      </Section>

      {/* Section 2: Clube e Carreira */}
      <Section title="Clube e Carreira">
        <div className="flex gap-4">
          <Field label="Clube Atual" half>
            <input className={inputCls} value={form.current_club} onChange={(e) => set('current_club', e.target.value)} placeholder="Nome do clube" />
          </Field>
          <Field label="País do Clube" half>
            <input className={inputCls} value={form.current_club_country} onChange={(e) => set('current_club_country', e.target.value)} placeholder="Ex: Brasil" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Liga Atual" half>
            <input className={inputCls} value={form.current_league} onChange={(e) => set('current_league', e.target.value)} placeholder="Ex: Brasileirão Série A" />
          </Field>
          <Field label="Contrato Até" half>
            <input type="date" className={inputCls} value={form.contract_until} onChange={(e) => set('contract_until', e.target.value)} />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Situação no Clube" half>
            <select className={selectCls} value={form.squad_status} onChange={(e) => set('squad_status', e.target.value as SquadStatus)}>
              <option value="titular">Titular</option>
              <option value="rotacao">Rotação</option>
              <option value="reserva">Reserva</option>
              <option value="fora_dos_planos">Fora dos Planos</option>
              <option value="emprestado">Emprestado</option>
            </select>
          </Field>
          <Field label="Minutagem Recente (min)" half>
            <input type="number" className={inputCls} value={form.recent_minutes ?? ''} onChange={(e) => setNum('recent_minutes', e.target.value)} placeholder="Minutos na temporada atual" />
          </Field>
        </div>
        <Field label="Histórico de Clubes">
          <textarea className={textareaCls} rows={2} value={form.club_history} onChange={(e) => set('club_history', e.target.value)} placeholder="Ex: Fluminense (2019-2022), Grêmio (2022-)" />
        </Field>
      </Section>

      {/* Section 3: Mercado */}
      <Section title="Mercado e Disponibilidade">
        <div className="flex gap-4">
          <Field label="Valor de Mercado" half>
            <div className="flex gap-2">
              <input type="number" className={`${inputCls} flex-1`} value={form.market_value ?? ''} onChange={(e) => setNum('market_value', e.target.value)} placeholder="Ex: 1500000" />
              <select className="bg-gray-800 border border-gray-700 rounded-lg px-2 text-sm text-white focus:outline-none focus:border-emerald-500 w-20" value={form.market_value_currency} onChange={(e) => set('market_value_currency', e.target.value)}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Salário Estimado" half>
            <div className="flex gap-2">
              <input type="number" className={`${inputCls} flex-1`} value={form.estimated_salary ?? ''} onChange={(e) => setNum('estimated_salary', e.target.value)} placeholder="Ex: 30000/mês" />
              <select className="bg-gray-800 border border-gray-700 rounded-lg px-2 text-sm text-white focus:outline-none focus:border-emerald-500 w-20" value={form.estimated_salary_currency} onChange={(e) => set('estimated_salary_currency', e.target.value)}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Tipo de Operação Possível" half>
            <select className={selectCls} value={form.deal_type_possible} onChange={(e) => set('deal_type_possible', e.target.value as DealType)}>
              {Object.entries(DEAL_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Janela Ideal de Saída" half>
            <input className={inputCls} value={form.ideal_exit_window} onChange={(e) => set('ideal_exit_window', e.target.value)} placeholder="Ex: Julho 2025" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Disponibilidade Percebida" half>
            <select className={selectCls} value={form.availability_level} onChange={(e) => set('availability_level', e.target.value as AvailabilityLevel)}>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </Field>
          <Field label="Chance de Saída" half>
            <select className={selectCls} value={form.exit_probability} onChange={(e) => set('exit_probability', e.target.value as AvailabilityLevel)}>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Mercados Prioritários" half>
            <input className={inputCls} value={form.priority_markets} onChange={(e) => set('priority_markets', e.target.value)} placeholder="Ex: Brasil, Portugal, México" />
          </Field>
          <Field label="Mercados Aceitos" half>
            <input className={inputCls} value={form.accepted_markets} onChange={(e) => set('accepted_markets', e.target.value)} placeholder="Ex: América do Sul em geral" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Mercados Bloqueados" half>
            <input className={inputCls} value={form.blocked_markets} onChange={(e) => set('blocked_markets', e.target.value)} placeholder="Ex: Oriente Médio" />
          </Field>
        </div>
      </Section>

      {/* Section 4: Relação Comercial */}
      <Section title="Relação Comercial">
        <div className="flex gap-4">
          <Field label="Tipo de Relação" half>
            <select className={selectCls} value={form.relation_type} onChange={(e) => set('relation_type', e.target.value as RelationType)}>
              <option value="proprio">Próprio</option>
              <option value="parceiro">Parceiro</option>
              <option value="monitorado">Monitorado</option>
              <option value="oportunidade">Oportunidade</option>
              <option value="oportunidade_externa">Oport. Externa</option>
              <option value="pesquisar_empresario">Pesq. Empresário</option>
              <option value="contato_iniciado">Contato Iniciado</option>
              <option value="parceria_negociando">Parceria Neg.</option>
              <option value="autorizado">Autorizado</option>
              <option value="oferecido">Oferecido</option>
              <option value="em_negociacao">Em Negociação</option>
              <option value="sem_fit">Sem Fit</option>
              <option value="sem_acesso">Sem Acesso</option>
              <option value="descartado">Descartado</option>
              <option value="arquivado">Arquivado</option>
            </select>
          </Field>
          <Field label="Nível de Acesso" half>
            <select className={selectCls} value={form.access_level} onChange={(e) => set('access_level', e.target.value as AccessLevel)}>
              <option value="direto">Direto</option>
              <option value="indireto">Indireto (via parceiro)</option>
              <option value="dificil">Difícil</option>
            </select>
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Nome do Parceiro / Agente" half>
            <input className={inputCls} value={form.partner_name} onChange={(e) => set('partner_name', e.target.value)} placeholder="Quem detém o acesso" />
          </Field>
          <Field label="Comissão / Observações" half>
            <input className={inputCls} value={form.commission_notes} onChange={(e) => set('commission_notes', e.target.value)} placeholder="Ex: 10% split 50/50" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Último Contato" half>
            <input type="date" className={inputCls} value={form.last_contact_date} onChange={(e) => set('last_contact_date', e.target.value)} />
          </Field>
          <Field label="Status do Contato" half>
            <input className={inputCls} value={form.contact_status} onChange={(e) => set('contact_status', e.target.value)} placeholder="Ex: Aguardando retorno" />
          </Field>
        </div>
        <Field label="Observações Comerciais">
          <textarea className={textareaCls} rows={3} value={form.commercial_notes} onChange={(e) => set('commercial_notes', e.target.value)} placeholder="Informações sobre o relacionamento comercial..." />
        </Field>
      </Section>

      {/* Section 5: Perfil Esportivo */}
      <Section title="Perfil Esportivo">
        <div className="flex gap-4">
          <Field label="Estilo de Jogo" half>
            <input className={inputCls} value={form.playing_style} onChange={(e) => set('playing_style', e.target.value)} placeholder="Ex: Target man, Box-to-box, Pressing" />
          </Field>
          <Field label="Fit Ideal de Liga" half>
            <input className={inputCls} value={form.ideal_league_fit} onChange={(e) => set('ideal_league_fit', e.target.value)} placeholder="Ex: Brasileirão, Segunda Divisão Europeia" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Pontos Fortes" half>
            <textarea className={textareaCls} rows={3} value={form.strengths} onChange={(e) => set('strengths', e.target.value)} placeholder="Qualidades principais do jogador..." />
          </Field>
          <Field label="Pontos de Atenção" half>
            <textarea className={textareaCls} rows={3} value={form.concerns} onChange={(e) => set('concerns', e.target.value)} placeholder="Limitações ou riscos a considerar..." />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Perfil Físico" half>
            <textarea className={textareaCls} rows={2} value={form.physical_profile} onChange={(e) => set('physical_profile', e.target.value)} placeholder="Atributos físicos..." />
          </Field>
          <Field label="Perfil Tático" half>
            <textarea className={textareaCls} rows={2} value={form.tactical_profile} onChange={(e) => set('tactical_profile', e.target.value)} placeholder="Função tática e características..." />
          </Field>
        </div>
        <Field label="Modelo de Jogo Ideal">
          <input className={inputCls} value={form.ideal_game_model} onChange={(e) => set('ideal_game_model', e.target.value)} placeholder="Ex: Posse de bola, Contra-ataque, Alta pressão" />
        </Field>
      </Section>

      {/* Section 6: Organização Interna */}
      <Section title="Organização Interna">
        <div className="flex gap-4">
          <Field label="Prioridade Interna" half>
            <select className={selectCls} value={form.internal_priority} onChange={(e) => set('internal_priority', e.target.value as Priority)}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </Field>
          <Field label="Tags" half>
            <input className={inputCls} value={form.custom_tags} onChange={(e) => set('custom_tags', e.target.value)} placeholder="Ex: jovem-talento, contrato-curto, livre-2025" />
          </Field>
        </div>
        <Field label="Observações">
          <textarea className={textareaCls} rows={4} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Informações adicionais, contexto, estratégia..." />
        </Field>
      </Section>
    </div>
  );
}
