import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../store/storage';
import { generateId, now } from '../utils/helpers';
import type { ImportResult, ImportedRequest, ImportedPlayer } from '../types';

type Step = 'input' | 'reviewing' | 'done';

export default function ImportarDados() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('input');
  const [pastedText, setPastedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<Set<number>>(new Set());
  const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(new Set());

  async function handleFileUpload(file: File) {
    setLoading(true);
    setError('');
    try {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';

      if (!isImage && !isPdf) {
        setError('Formato não suportado. Use PDF, PNG ou JPEG.');
        setLoading(false);
        return;
      }

      const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
      const type = isImage ? 'image' : 'pdf';
      const res = await callImportApi({ type, content: base64, mimeType: file.type });
      handleResult(res);
    } catch (e) {
      setError('Erro ao processar arquivo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTextImport() {
    if (!pastedText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await callImportApi({ type: 'text', content: pastedText });
      handleResult(res);
    } catch (e) {
      setError('Erro ao processar texto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function callImportApi(body: { type: string; content: string; mimeType?: string }) {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('API error');
    return res.json() as Promise<ImportResult>;
  }

  function handleResult(res: ImportResult) {
    setResult(res);
    setSelectedRequests(new Set(res.requests.map((_, i) => i)));
    setSelectedPlayers(new Set(res.players.map((_, i) => i)));
    setStep('reviewing');
  }

  function toggleRequest(i: number) {
    setSelectedRequests((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function togglePlayer(i: number) {
    setSelectedPlayers((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function handleConfirm() {
    if (!result) return;

    let importedRequests = 0;
    let importedPlayers = 0;

    result.requests.forEach((req, i) => {
      if (!selectedRequests.has(i)) return;
      db.requests.save(buildRequest(req));
      importedRequests++;
    });

    result.players.forEach((player, i) => {
      if (!selectedPlayers.has(i)) return;
      db.players.save(buildPlayer(player));
      importedPlayers++;
    });

    setStep('done');
    setTimeout(() => {
      if (importedRequests > 0 && importedPlayers === 0) navigate('/crm/pedidos');
      else if (importedPlayers > 0 && importedRequests === 0) navigate('/crm/jogadores');
      else navigate('/crm');
    }, 1500);
  }

  function buildRequest(r: ImportedRequest) {
    const t = now();
    return {
      id: generateId(),
      club_name: r.club_name || '',
      club_country: r.club_country || '',
      club_league: r.club_league || '',
      contact_name: '',
      contact_role: '',
      contact_method: '',
      request_date: t,
      transfer_window: '',
      priority: r.priority || 'media',
      status: 'aberto' as const,
      position_main: r.position_main || '',
      position_secondary: r.position_secondary || '',
      preferred_foot: r.preferred_foot || 'indiferente',
      age_min: r.age_min,
      age_max: r.age_max,
      height_min: r.height_min,
      height_max: null,
      preferred_nationalities: '',
      restricted_nationalities: '',
      preferred_leagues: '',
      excluded_leagues: '',
      preferred_countries: '',
      physical_profile: '',
      technical_profile: '',
      tactical_profile: '',
      player_style: r.player_style || '',
      mandatory_traits: '',
      desired_traits: '',
      transfer_budget: r.transfer_budget,
      transfer_budget_currency: r.transfer_budget_currency || 'EUR',
      salary_budget: null,
      salary_budget_currency: 'EUR',
      total_package_budget: null,
      total_package_currency: 'EUR',
      deal_type: r.deal_type || 'compra',
      resale_focus: false,
      needs_ready_player: false,
      accepts_project_player: false,
      accepts_low_minutes: false,
      accepts_recovering: false,
      accepts_lower_division: false,
      notes: r.notes || '',
      created_at: t,
      updated_at: t,
    };
  }

  function buildPlayer(p: ImportedPlayer) {
    const t = now();
    return {
      id: generateId(),
      api_football_id: '',
      full_name: p.full_name || '',
      short_name: p.short_name || '',
      birth_date: '',
      age: p.age,
      nationality: p.nationality || '',
      second_nationality: '',
      eu_passport: false,
      preferred_foot: p.preferred_foot || 'indiferente',
      height: p.height,
      weight: null,
      primary_position: p.primary_position || '',
      secondary_positions: '',
      current_club: p.current_club || '',
      current_club_country: '',
      current_league: p.current_league || '',
      contract_until: p.contract_until || '',
      squad_status: 'rotacao' as const,
      recent_minutes: null,
      club_history: '',
      transfer_history: '',
      market_value: p.market_value,
      market_value_currency: p.market_value_currency || 'EUR',
      estimated_salary: null,
      estimated_salary_currency: 'EUR',
      deal_type_possible: 'compra' as const,
      availability_level: 'media' as const,
      exit_probability: 'media' as const,
      ideal_exit_window: '',
      priority_markets: '',
      accepted_markets: '',
      blocked_markets: '',
      relation_type: 'monitorado' as const,
      partner_name: p.partner_name || '',
      commission_notes: '',
      access_level: 'indireto' as const,
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
      internal_priority: 'media' as const,
      favorite: false,
      notes: p.notes || '',
      external_source_url: '',
      external_source: 'import_ai',
      created_at: t,
      updated_at: t,
    };
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Importar Dados</h1>
        <p className="text-gray-400 text-sm mt-1">
          Importe pedidos e jogadores a partir de PDF, imagem ou texto colado
        </p>
      </div>

      {step === 'input' && (
        <div className="space-y-5">
          {/* File Upload */}
          <div
            className="bg-gray-900 border-2 border-dashed border-gray-700 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-600 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFileUpload(file);
            }}
          >
            <div className="text-4xl mb-3">📎</div>
            <p className="text-white font-medium">Arraste ou clique para upload</p>
            <p className="text-gray-500 text-sm mt-1">PDF, PNG ou JPEG</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-gray-600 text-sm">ou cole o texto abaixo</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Text paste */}
          <div className="space-y-3">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Cole aqui o conteúdo do pedido ou dados do jogador..."
              rows={8}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
            <button
              onClick={handleTextImport}
              disabled={!pastedText.trim() || loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? 'Processando com IA...' : 'Analisar com IA'}
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-center">
              <div className="text-2xl mb-2">🤖</div>
              <p className="text-gray-300 text-sm">Analisando com IA...</p>
              <p className="text-gray-500 text-xs mt-1">Isso pode levar alguns segundos</p>
            </div>
          )}
        </div>
      )}

      {step === 'reviewing' && result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-lg">✓</span>
              <span className="text-white font-medium">
                Encontrado: {result.requests.length} pedido{result.requests.length !== 1 ? 's' : ''} ·{' '}
                {result.players.length} jogador{result.players.length !== 1 ? 'es' : ''}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                result.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-400' :
                result.confidence === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {result.confidence === 'high' ? 'Alta confiança' : result.confidence === 'medium' ? 'Média confiança' : 'Baixa confiança'}
              </span>
            </div>
            <button
              onClick={() => { setStep('input'); setResult(null); }}
              className="text-gray-500 hover:text-white text-sm transition-colors"
            >
              ← Voltar
            </button>
          </div>

          {result.requests.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-3">
              <h2 className="text-white font-semibold text-sm">Pedidos de Clubes</h2>
              {result.requests.map((req, i) => (
                <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedRequests.has(i) ? 'border-emerald-600 bg-emerald-500/5' : 'border-gray-800 bg-gray-800/30'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedRequests.has(i)}
                    onChange={() => toggleRequest(i)}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{req.club_name || '(sem nome)'}</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {req.position_main && `${req.position_main} · `}
                      {req.club_country && `${req.club_country} · `}
                      {req.deal_type && `${req.deal_type}`}
                      {req.transfer_budget ? ` · ${req.transfer_budget_currency} ${(req.transfer_budget / 1_000_000).toFixed(1)}M` : ''}
                    </p>
                    {req.notes && <p className="text-gray-500 text-xs mt-1 italic">{req.notes}</p>}
                  </div>
                </label>
              ))}
            </div>
          )}

          {result.players.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-3">
              <h2 className="text-white font-semibold text-sm">Jogadores</h2>
              {result.players.map((player, i) => (
                <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPlayers.has(i) ? 'border-emerald-600 bg-emerald-500/5' : 'border-gray-800 bg-gray-800/30'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedPlayers.has(i)}
                    onChange={() => togglePlayer(i)}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{player.full_name || '(sem nome)'}</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {player.primary_position && `${player.primary_position} · `}
                      {player.current_club && `${player.current_club} · `}
                      {player.nationality && `${player.nationality}`}
                      {player.age ? ` · ${player.age} anos` : ''}
                      {player.market_value ? ` · €${(player.market_value / 1_000_000).toFixed(1)}M` : ''}
                    </p>
                    {player.notes && <p className="text-gray-500 text-xs mt-1 italic">{player.notes}</p>}
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleConfirm}
              disabled={selectedRequests.size === 0 && selectedPlayers.size === 0}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Importar Selecionados ({selectedRequests.size + selectedPlayers.size})
            </button>
            <button
              onClick={() => { setStep('input'); setResult(null); }}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="bg-gray-900 rounded-xl border border-emerald-800/40 p-10 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-white font-semibold text-lg">Importado com sucesso!</p>
          <p className="text-gray-400 text-sm mt-1">Redirecionando...</p>
        </div>
      )}
    </div>
  );
}
