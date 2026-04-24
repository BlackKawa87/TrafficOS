import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../store/storage';
import { runMatchesForRequest } from '../utils/matching';
import { generateId, now, POSITIONS, CURRENCIES, DEAL_TYPE_LABELS } from '../utils/helpers';
import type { ClubRequest, DealType, PreferredFoot, Priority, RequestStatus } from '../types';

const emptyRequest = (): ClubRequest => ({
  id: generateId(),
  club_name: '',
  club_country: '',
  club_league: '',
  contact_name: '',
  contact_role: '',
  contact_method: '',
  request_date: new Date().toISOString().split('T')[0],
  transfer_window: '',
  priority: 'media',
  status: 'aberto',
  position_main: '',
  position_secondary: '',
  preferred_foot: 'indiferente',
  age_min: null,
  age_max: null,
  height_min: null,
  height_max: null,
  preferred_nationalities: '',
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
  transfer_budget: null,
  transfer_budget_currency: 'EUR',
  salary_budget: null,
  salary_budget_currency: 'EUR',
  total_package_budget: null,
  total_package_currency: 'EUR',
  deal_type: 'compra',
  resale_focus: false,
  needs_ready_player: true,
  accepts_project_player: false,
  accepts_low_minutes: false,
  accepts_recovering: false,
  accepts_lower_division: false,
  notes: '',
  created_at: now(),
  updated_at: now(),
});

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
      <h2 className="text-white font-semibold text-sm uppercase tracking-wider text-emerald-400">
        {title}
      </h2>
      {children}
    </div>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  half?: boolean;
}

function Field({ label, children, half }: FieldProps) {
  return (
    <div className={half ? 'flex-1' : 'w-full'}>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500';
const selectCls =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500';
const textareaCls =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 resize-none';

export default function PedidoForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id && id !== 'novo');

  const [form, setForm] = useState<ClubRequest>(emptyRequest());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      const existing = db.requests.getById(id);
      if (existing) setForm(existing);
    }
  }, [id, isEdit]);

  const set = <K extends keyof ClubRequest>(key: K, value: ClubRequest[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const setNum = (key: keyof ClubRequest, raw: string) => {
    const n = raw === '' ? null : Number(raw);
    setForm((f) => ({ ...f, [key]: n }));
  };

  async function handleSave() {
    if (!form.club_name.trim()) {
      alert('Informe o nome do clube.');
      return;
    }
    setSaving(true);
    const updated = { ...form, updated_at: now() };
    db.requests.save(updated);

    // Auto match
    const players = db.players.getAll();
    const matches = runMatchesForRequest(updated, players);
    db.matches.saveAll(matches);

    db.logs.add({
      entity_type: 'request',
      entity_id: form.id,
      action_type: isEdit ? 'updated' : 'created',
      note: isEdit ? 'Pedido atualizado' : 'Pedido criado',
    });

    setSaving(false);
    navigate(`/crm/pedidos/${form.id}`);
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? 'Editar Pedido' : 'Novo Pedido'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {isEdit ? form.club_name : 'Preencha os dados do pedido recebido'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar Pedido'}
          </button>
        </div>
      </div>

      {/* Section 1: Identificação */}
      <Section title="Identificação do Pedido">
        <div className="flex gap-4">
          <Field label="Clube *" half>
            <input className={inputCls} value={form.club_name} onChange={(e) => set('club_name', e.target.value)} placeholder="Ex: Grêmio" />
          </Field>
          <Field label="País" half>
            <input className={inputCls} value={form.club_country} onChange={(e) => set('club_country', e.target.value)} placeholder="Ex: Brasil" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Liga" half>
            <input className={inputCls} value={form.club_league} onChange={(e) => set('club_league', e.target.value)} placeholder="Ex: Brasileirão Série A" />
          </Field>
          <Field label="Janela de Transferência" half>
            <input className={inputCls} value={form.transfer_window} onChange={(e) => set('transfer_window', e.target.value)} placeholder="Ex: Janeiro 2025" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Contato" half>
            <input className={inputCls} value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} placeholder="Nome do contato" />
          </Field>
          <Field label="Cargo" half>
            <input className={inputCls} value={form.contact_role} onChange={(e) => set('contact_role', e.target.value)} placeholder="Ex: Diretor Esportivo" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Meio de Contato" half>
            <input className={inputCls} value={form.contact_method} onChange={(e) => set('contact_method', e.target.value)} placeholder="Ex: WhatsApp, e-mail" />
          </Field>
          <Field label="Data do Pedido" half>
            <input type="date" className={inputCls} value={form.request_date} onChange={(e) => set('request_date', e.target.value)} />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Prioridade" half>
            <select className={selectCls} value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </Field>
          <Field label="Status" half>
            <select className={selectCls} value={form.status} onChange={(e) => set('status', e.target.value as RequestStatus)}>
              <option value="aberto">Aberto</option>
              <option value="em_analise">Em Análise</option>
              <option value="shortlist_enviada">Shortlist Enviada</option>
              <option value="em_negociacao">Em Negociação</option>
              <option value="fechado">Fechado</option>
              <option value="cancelado">Cancelado</option>
              <option value="arquivado">Arquivado</option>
            </select>
          </Field>
        </div>
      </Section>

      {/* Section 2: Perfil do Jogador */}
      <Section title="Perfil do Jogador Buscado">
        <div className="flex gap-4">
          <Field label="Posição Principal" half>
            <select className={selectCls} value={form.position_main} onChange={(e) => set('position_main', e.target.value)}>
              <option value="">Selecionar...</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Posição Secundária" half>
            <select className={selectCls} value={form.position_secondary} onChange={(e) => set('position_secondary', e.target.value)}>
              <option value="">Nenhuma</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Pé Preferencial" half>
            <select className={selectCls} value={form.preferred_foot} onChange={(e) => set('preferred_foot', e.target.value as PreferredFoot)}>
              <option value="indiferente">Indiferente</option>
              <option value="direito">Direito</option>
              <option value="esquerdo">Esquerdo</option>
              <option value="ambidestro">Ambidestro</option>
            </select>
          </Field>
          <Field label="Estilo do Jogador" half>
            <input className={inputCls} value={form.player_style} onChange={(e) => set('player_style', e.target.value)} placeholder="Ex: Target man, Box-to-box" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Idade Mínima" half>
            <input type="number" className={inputCls} value={form.age_min ?? ''} onChange={(e) => setNum('age_min', e.target.value)} placeholder="Ex: 20" />
          </Field>
          <Field label="Idade Máxima" half>
            <input type="number" className={inputCls} value={form.age_max ?? ''} onChange={(e) => setNum('age_max', e.target.value)} placeholder="Ex: 28" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Altura Mínima (cm)" half>
            <input type="number" className={inputCls} value={form.height_min ?? ''} onChange={(e) => setNum('height_min', e.target.value)} placeholder="Ex: 180" />
          </Field>
          <Field label="Altura Máxima (cm)" half>
            <input type="number" className={inputCls} value={form.height_max ?? ''} onChange={(e) => setNum('height_max', e.target.value)} placeholder="Ex: 195" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Nacionalidades Aceitas" half>
            <input className={inputCls} value={form.preferred_nationalities} onChange={(e) => set('preferred_nationalities', e.target.value)} placeholder="Ex: Brasileira, Argentina" />
          </Field>
          <Field label="Nacionalidades Restritas" half>
            <input className={inputCls} value={form.restricted_nationalities} onChange={(e) => set('restricted_nationalities', e.target.value)} placeholder="Ex: fora da cota de estrangeiros" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Ligas Preferidas" half>
            <input className={inputCls} value={form.preferred_leagues} onChange={(e) => set('preferred_leagues', e.target.value)} placeholder="Ex: Brasileirão, Liga MX" />
          </Field>
          <Field label="Ligas Excluídas" half>
            <input className={inputCls} value={form.excluded_leagues} onChange={(e) => set('excluded_leagues', e.target.value)} placeholder="Ex: Divisões inferiores" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Países / Mercados Preferidos" half>
            <input className={inputCls} value={form.preferred_countries} onChange={(e) => set('preferred_countries', e.target.value)} placeholder="Ex: Brasil, Argentina, Portugal" />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Perfil Físico" half>
            <textarea className={textareaCls} rows={2} value={form.physical_profile} onChange={(e) => set('physical_profile', e.target.value)} placeholder="Descreva o perfil físico esperado..." />
          </Field>
          <Field label="Perfil Técnico" half>
            <textarea className={textareaCls} rows={2} value={form.technical_profile} onChange={(e) => set('technical_profile', e.target.value)} placeholder="Descreva as habilidades técnicas..." />
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Perfil Tático" half>
            <textarea className={textareaCls} rows={2} value={form.tactical_profile} onChange={(e) => set('tactical_profile', e.target.value)} placeholder="Função tática esperada..." />
          </Field>
          <div className="flex-1"></div>
        </div>
        <div className="flex gap-4">
          <Field label="Características Obrigatórias" half>
            <textarea className={textareaCls} rows={2} value={form.mandatory_traits} onChange={(e) => set('mandatory_traits', e.target.value)} placeholder="O que é indispensável..." />
          </Field>
          <Field label="Características Desejáveis" half>
            <textarea className={textareaCls} rows={2} value={form.desired_traits} onChange={(e) => set('desired_traits', e.target.value)} placeholder="O que seria ideal mas não é obrigatório..." />
          </Field>
        </div>
      </Section>

      {/* Section 3: Financeiro */}
      <Section title="Faixa Financeira">
        <div className="flex gap-4">
          <Field label="Budget de Transferência" half>
            <div className="flex gap-2">
              <input type="number" className={`${inputCls} flex-1`} value={form.transfer_budget ?? ''} onChange={(e) => setNum('transfer_budget', e.target.value)} placeholder="Ex: 2000000" />
              <select className="bg-gray-800 border border-gray-700 rounded-lg px-2 text-sm text-white focus:outline-none focus:border-emerald-500 w-20" value={form.transfer_budget_currency} onChange={(e) => set('transfer_budget_currency', e.target.value)}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Budget Salarial" half>
            <div className="flex gap-2">
              <input type="number" className={`${inputCls} flex-1`} value={form.salary_budget ?? ''} onChange={(e) => setNum('salary_budget', e.target.value)} placeholder="Ex: 50000/mês" />
              <select className="bg-gray-800 border border-gray-700 rounded-lg px-2 text-sm text-white focus:outline-none focus:border-emerald-500 w-20" value={form.salary_budget_currency} onChange={(e) => set('salary_budget_currency', e.target.value)}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </Field>
        </div>
        <div className="flex gap-4">
          <Field label="Package Total" half>
            <div className="flex gap-2">
              <input type="number" className={`${inputCls} flex-1`} value={form.total_package_budget ?? ''} onChange={(e) => setNum('total_package_budget', e.target.value)} placeholder="Custo total da operação" />
              <select className="bg-gray-800 border border-gray-700 rounded-lg px-2 text-sm text-white focus:outline-none focus:border-emerald-500 w-20" value={form.total_package_currency} onChange={(e) => set('total_package_currency', e.target.value)}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Tipo de Negócio" half>
            <select className={selectCls} value={form.deal_type} onChange={(e) => set('deal_type', e.target.value as DealType)}>
              {Object.entries(DEAL_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" className="accent-emerald-500 w-4 h-4" checked={form.resale_focus} onChange={(e) => set('resale_focus', e.target.checked)} />
            Foco em revenda futura
          </label>
        </div>
      </Section>

      {/* Section 4: Contexto */}
      <Section title="Contexto Estratégico">
        <div className="grid grid-cols-2 gap-3">
          {[
            ['needs_ready_player', 'Precisa estar pronto para jogar imediatamente'],
            ['accepts_project_player', 'Aceita aposta / jogador para desenvolver'],
            ['accepts_low_minutes', 'Aceita jogador com pouca minutagem recente'],
            ['accepts_recovering', 'Aceita jogador em recuperação de lesão'],
            ['accepts_lower_division', 'Aceita jogador de segunda divisão'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                className="accent-emerald-500 w-4 h-4"
                checked={Boolean(form[key as keyof ClubRequest])}
                onChange={(e) => set(key as keyof ClubRequest, e.target.checked as ClubRequest[keyof ClubRequest])}
              />
              {label}
            </label>
          ))}
        </div>
        <Field label="Observações Livres">
          <textarea className={textareaCls} rows={4} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Contexto adicional, urgência, informações importantes..." />
        </Field>
      </Section>
    </div>
  );
}
