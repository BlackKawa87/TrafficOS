import { useState, useRef } from 'react'
import { useLanguage } from '../i18n'
import { tosDb } from '../store/storage'

const CURRENCIES = ['USD', 'BRL', 'EUR', 'GBP']

export default function Configuracoes() {
  const { t, lang, setLang } = useLanguage()
  const [defaultCurrency, setDefaultCurrency] = useState(
    localStorage.getItem('tos_default_currency') ?? 'USD'
  )
  const [aiLang, setAiLang] = useState(
    localStorage.getItem('tos_ai_lang') ?? 'pt-BR'
  )

  function handleAiLangChange(l: string) {
    setAiLang(l)
    localStorage.setItem('tos_ai_lang', l)
  }
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  function showMessage(text: string, type: 'success' | 'error' = 'success') {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  function handleCurrencyChange(c: string) {
    setDefaultCurrency(c)
    localStorage.setItem('tos_default_currency', c)
  }

  function handleExport() {
    const data = tosDb.exportAll()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trafficOS-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    showMessage(t('sett.export_success'))
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        tosDb.importAll(ev.target?.result as string)
        showMessage(t('sett.import_success'))
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        showMessage('Erro ao importar dados. Verifique o formato do arquivo.', 'error')
      }
    }
    reader.readAsText(file)
    if (importRef.current) importRef.current.value = ''
  }

  function handleClear() {
    if (confirm(t('sett.clear_confirm'))) {
      tosDb.clearAll()
      showMessage(t('sett.clear_success'))
      setTimeout(() => window.location.reload(), 1000)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">{t('sett.title')}</h1>

      {/* Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${
          message.type === 'success' ? 'bg-emerald-900 text-emerald-200 border border-emerald-700' :
          'bg-red-900 text-red-200 border border-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* General Settings */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
        <h2 className="text-sm font-semibold text-white mb-4">{t('sett.general')}</h2>
        <div className="space-y-5">
          {/* UI Language */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">{t('sett.language')}</label>
            <p className="text-[11px] text-gray-600 mb-2">Idioma da interface do sistema</p>
            <div className="flex gap-2">
              <button
                onClick={() => setLang('pt')}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors border ${
                  lang === 'pt'
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-gray-800 text-gray-400 hover:text-white border-gray-700'
                }`}
              >
                🇧🇷 Português
              </button>
              <button
                onClick={() => setLang('en')}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors border ${
                  lang === 'en'
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-gray-800 text-gray-400 hover:text-white border-gray-700'
                }`}
              >
                🇺🇸 English
              </button>
            </div>
          </div>

          {/* AI Output Language */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">🤖 Idioma dos Outputs de IA</label>
            <p className="text-[11px] text-gray-600 mb-2">
              Idioma em que a IA vai gerar diagnósticos, campanhas, criativos, relatórios e todos os outros conteúdos
            </p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { code: 'pt-BR', flag: '🇧🇷', label: 'Português' },
                { code: 'en-US', flag: '🇺🇸', label: 'English' },
                { code: 'es',    flag: '🇪🇸', label: 'Español' },
                { code: 'fr',    flag: '🇫🇷', label: 'Français' },
                { code: 'de',    flag: '🇩🇪', label: 'Deutsch' },
                { code: 'it',    flag: '🇮🇹', label: 'Italiano' },
              ] as { code: string; flag: string; label: string }[]).map(l => (
                <button
                  key={l.code}
                  onClick={() => handleAiLangChange(l.code)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                    aiLang === l.code
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-gray-800 text-gray-400 hover:text-white border-gray-700'
                  }`}
                >
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">{t('sett.currency')}</label>
            <div className="flex gap-2 flex-wrap">
              {CURRENCIES.map(c => (
                <button
                  key={c}
                  onClick={() => handleCurrencyChange(c)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    defaultCurrency === c
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-gray-800 text-gray-400 hover:text-white border-gray-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
        <h2 className="text-sm font-semibold text-white mb-4">{t('sett.data')}</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-800">
            <div>
              <div className="text-sm text-white font-medium">{t('sett.export')}</div>
              <div className="text-xs text-gray-500 mt-0.5">Baixar todos os dados em formato JSON</div>
            </div>
            <button
              onClick={handleExport}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm py-2 px-4 rounded-lg transition-colors"
            >
              📥 Export
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm text-white font-medium">{t('sett.import')}</div>
              <div className="text-xs text-gray-500 mt-0.5">Restaurar dados de um backup JSON</div>
            </div>
            <button
              onClick={() => importRef.current?.click()}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm py-2 px-4 rounded-lg transition-colors"
            >
              📤 Import
            </button>
          </div>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-gray-900 border border-red-900/40 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-red-400 mb-4">{t('sett.danger')}</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white font-medium">{t('sett.clear')}</div>
            <div className="text-xs text-gray-500 mt-0.5">Esta ação não pode ser desfeita</div>
          </div>
          <button
            onClick={handleClear}
            className="bg-red-900/50 hover:bg-red-900 text-red-300 hover:text-red-200 text-sm py-2 px-4 rounded-lg transition-colors border border-red-800/50"
          >
            🗑 Limpar
          </button>
        </div>
      </div>

      {/* Version */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-600">TrafficOS v1.0.0 · Paid Traffic Intelligence Platform</p>
        <p className="text-xs text-gray-700 mt-1">Dados armazenados localmente no navegador</p>
      </div>
    </div>
  )
}
