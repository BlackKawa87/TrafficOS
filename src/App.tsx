import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './traffic/components/Layout'
import Dashboard from './traffic/pages/Dashboard'
import Produtos from './traffic/pages/Produtos'
import ProdutoForm from './traffic/pages/ProdutoForm'
import ProdutoDetalhe from './traffic/pages/ProdutoDetalhe'
import DiagnosticoOferta from './traffic/pages/DiagnosticoOferta'
import Campanhas from './traffic/pages/Campanhas'
import NovaCampanha from './traffic/pages/NovaCampanha'
import CampanhaDetalhe from './traffic/pages/CampanhaDetalhe'
import Criativos from './traffic/pages/Criativos'
import NovoCriativo from './traffic/pages/NovoCriativo'
import CriativoDetalhe from './traffic/pages/CriativoDetalhe'
import Metricas from './traffic/pages/Metricas'
import DecisoesIA from './traffic/pages/DecisoesIA'
import DecisoesDetalhe from './traffic/pages/DecisoesDetalhe'
import PlanoDiario from './traffic/pages/PlanoDiario'
import PlanoDetalhe from './traffic/pages/PlanoDetalhe'
import GerarMixCriativo from './traffic/pages/GerarMixCriativo'
import Escala from './traffic/pages/Escala'
import EscalaDetalhe from './traffic/pages/EscalaDetalhe'
import Remarketing from './traffic/pages/Remarketing'
import RemarketingDetalhe from './traffic/pages/RemarketingDetalhe'
import Expansao from './traffic/pages/Expansao'
import ExpansaoDetalhe from './traffic/pages/ExpansaoDetalhe'
import Email from './traffic/pages/Email'
import EmailDetalhe from './traffic/pages/EmailDetalhe'
import Whatsapp from './traffic/pages/Whatsapp'
import WhatsappDetalhe from './traffic/pages/WhatsappDetalhe'
import Vsl from './traffic/pages/Vsl'
import VslDetalhe from './traffic/pages/VslDetalhe'
import Integracoes from './traffic/pages/Integracoes'
import Inteligencia from './traffic/pages/Inteligencia'
import Autopilot from './traffic/pages/Autopilot'
import AutoTesting from './traffic/pages/AutoTesting'
import AiCore from './traffic/pages/AiCore'
import MultiProduto from './traffic/pages/MultiProduto'
import FullAuto from './traffic/pages/FullAuto'
import VideoAI from './traffic/pages/VideoAI'
import LandingPublisher from './traffic/pages/LandingPublisher'
import CloudOps from './traffic/pages/CloudOps'
import CommandCenter from './traffic/pages/CommandCenter'
import Compliance from './traffic/pages/Compliance'
import Relatorios from './traffic/pages/Relatorios'
import LandingPages from './traffic/pages/LandingPages'
import LandingPageDetalhe from './traffic/pages/LandingPageDetalhe'
import PromptCenter from './traffic/pages/PromptCenter'
import Configuracoes from './traffic/pages/Configuracoes'
import NovaMetrica from './traffic/pages/NovaMetrica'
import ImportarMetricas from './traffic/pages/ImportarMetricas'
import Guia from './traffic/pages/Guia'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="produtos/novo" element={<ProdutoForm />} />
          <Route path="produtos/:id" element={<ProdutoDetalhe />} />
          <Route path="produtos/:id/editar" element={<ProdutoForm />} />
          <Route path="oferta/:produtoId" element={<DiagnosticoOferta />} />
          <Route path="campanhas" element={<Campanhas />} />
          <Route path="campanhas/nova" element={<NovaCampanha />} />
          <Route path="campanhas/:id" element={<CampanhaDetalhe />} />
          <Route path="criativos" element={<Criativos />} />
          <Route path="criativos/mix" element={<GerarMixCriativo />} />
          <Route path="criativos/novo" element={<NovoCriativo />} />
          <Route path="criativos/:id" element={<CriativoDetalhe />} />
          <Route path="metricas" element={<Metricas />} />
          <Route path="metricas/novo" element={<NovaMetrica />} />
          <Route path="metricas/importar" element={<ImportarMetricas />} />
          <Route path="decisoes" element={<DecisoesIA />} />
          <Route path="decisoes/:id" element={<DecisoesDetalhe />} />
          <Route path="escala" element={<Escala />} />
          <Route path="escala/:id" element={<EscalaDetalhe />} />
          <Route path="remarketing" element={<Remarketing />} />
          <Route path="remarketing/:id" element={<RemarketingDetalhe />} />
          <Route path="expansao" element={<Expansao />} />
          <Route path="expansao/:id" element={<ExpansaoDetalhe />} />
          <Route path="email" element={<Email />} />
          <Route path="email/:id" element={<EmailDetalhe />} />
          <Route path="whatsapp" element={<Whatsapp />} />
          <Route path="whatsapp/:id" element={<WhatsappDetalhe />} />
          <Route path="vsl" element={<Vsl />} />
          <Route path="vsl/:id" element={<VslDetalhe />} />
          <Route path="integracoes" element={<Integracoes />} />
          <Route path="inteligencia" element={<Inteligencia />} />
          <Route path="autopilot" element={<Autopilot />} />
          <Route path="auto-testing" element={<AutoTesting />} />
          <Route path="ai-core" element={<AiCore />} />
          <Route path="multi-produto" element={<MultiProduto />} />
          <Route path="full-auto" element={<FullAuto />} />
          <Route path="video-ai" element={<VideoAI />} />
          <Route path="landing-publisher" element={<LandingPublisher />} />
          <Route path="cloud-ops" element={<CloudOps />} />
          <Route path="command-center" element={<CommandCenter />} />
          <Route path="compliance" element={<Compliance />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="plano-diario" element={<PlanoDiario />} />
          <Route path="plano-diario/:id" element={<PlanoDetalhe />} />
          <Route path="landing-page" element={<LandingPages />} />
          <Route path="landing-page/:id" element={<LandingPageDetalhe />} />
          <Route path="prompt-center" element={<PromptCenter />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="guia" element={<Guia />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
