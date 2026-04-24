import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <p className="text-emerald-400 text-sm font-semibold tracking-widest uppercase mb-4">
          Football Intelligence Platform
        </p>
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          FootballCoreHub
          <span className="text-emerald-400"> v2</span>
        </h1>
        <p className="text-lg text-gray-300 mb-10">
          A plataforma de inteligência individual mais avançada do futebol moderno.
          Pensada para atletas, scouts, empresários e analistas de desempenho.
        </p>
        <Link
          to="/crm"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-full font-semibold text-lg transition-colors"
        >
          Acessar CRM de Mercado →
        </Link>
        <p className="text-gray-600 text-sm mt-6">
          Pedidos · Jogadores · Match Automático · Pipeline
        </p>
      </div>

      <div className="absolute top-4 right-4">
        <span className="text-sm text-gray-600">FootballCoreHub © {new Date().getFullYear()}</span>
      </div>
    </div>
  );
};

export default Home;
