import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Layout from './components/Layout';
import CRMDashboard from './pages/CRMDashboard';
import Pedidos from './pages/Pedidos';
import PedidoForm from './pages/PedidoForm';
import DetalPedido from './pages/DetalPedido';
import Jogadores from './pages/Jogadores';
import JogadorForm from './pages/JogadorForm';
import DetalJogador from './pages/DetalJogador';
import Matches from './pages/Matches';
import Pipeline from './pages/Pipeline';
import BuscarJogadores from './pages/BuscarJogadores';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/crm" element={<Layout />}>
          <Route index element={<CRMDashboard />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="pedidos/novo" element={<PedidoForm />} />
          <Route path="pedidos/:id" element={<DetalPedido />} />
          <Route path="pedidos/:id/editar" element={<PedidoForm />} />
          <Route path="jogadores" element={<Jogadores />} />
          <Route path="jogadores/novo" element={<JogadorForm />} />
          <Route path="jogadores/:id" element={<DetalJogador />} />
          <Route path="jogadores/:id/editar" element={<JogadorForm />} />
          <Route path="matches" element={<Matches />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="buscar" element={<BuscarJogadores />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
