// src/Home.tsx

import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl md:text-6xl font-bold mb-6 text-center">
        FootballCoreHub v2
      </h1>

      <p className="text-lg md:text-xl mb-10 text-gray-300 text-center max-w-2xl">
        A plataforma de inteligência individual mais avançada do futebol moderno.
        Pensada para atletas, scouts, empresários e analistas de desempenho.
      </p>

      <a
        href="/cadastro"
        className="bg-white text-gray-900 px-8 py-3 rounded-full font-semibold text-lg hover:bg-gray-200 transition"
      >
        Acessar Plataforma
      </a>

      <div className="absolute top-4 right-4">
        <span className="text-sm text-gray-500">FootballCoreHub © {new Date().getFullYear()}</span>
      </div>
    </div>
  );
};

export default Home;
