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
import PlanoDiario from './traffic/pages/PlanoDiario'
import PromptCenter from './traffic/pages/PromptCenter'
import Configuracoes from './traffic/pages/Configuracoes'
import NovaMetrica from './traffic/pages/NovaMetrica'

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
          <Route path="criativos/novo" element={<NovoCriativo />} />
          <Route path="criativos/:id" element={<CriativoDetalhe />} />
          <Route path="metricas" element={<Metricas />} />
          <Route path="metricas/novo" element={<NovaMetrica />} />
          <Route path="decisoes" element={<DecisoesIA />} />
          <Route path="plano-diario" element={<PlanoDiario />} />
          <Route path="prompt-center" element={<PromptCenter />} />
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
