'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';

export default function ComparadorPage() {
  const [busqueda, setBusqueda] = useState('');

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Comparador de Precios</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>

      <div className="border rounded p-6 text-center text-gray-500">
        {busqueda ? (
          <p>Buscando resultados para: <strong>{busqueda}</strong></p>
        ) : (
          <p>Ingresa el nombre de un producto para comparar precios estandarizados.</p>
        )}
      </div>
    </div>
  );
}
