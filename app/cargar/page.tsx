'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';

export default function CargarPage() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo) return;

    setCargando(true);
    setError(null);
    setResultado(null);

    const formData = new FormData();
    formData.append('archivo', archivo);

    try {
      const res = await fetch('/api/procesar-lista', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar el archivo');
      }

      setResultado(data);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Cargar Lista de Precios</h1>

      <form onSubmit={manejarEnvio} className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-2">
            Selecciona un archivo (Excel, PDF o Imagen):
          </label>
          <input
            type="file"
            accept=".xlsx, .xls, .pdf, .png, .jpg, .jpeg"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            className="border p-2 rounded w-full"
          />
        </div>

        <button
          type="submit"
          disabled={!archivo || cargando}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {cargando ? 'Procesando archivo...' : 'Cargar y Procesar'}
        </button>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-4">
          {error}
        </div>
      )}

      {resultado && (
        <div className="bg-green-50 border border-green-200 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Resultados Extraídos:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(resultado, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
