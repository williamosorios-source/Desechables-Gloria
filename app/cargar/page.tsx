'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';

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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Cargar Lista de Precios</h1>
          <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
            ← Volver al Comparador
          </Link>
        </div>

        <form onSubmit={manejarEnvio} className="bg-white p-6 rounded-lg border shadow-sm space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecciona un archivo (Excel, PDF o Imagen):
            </label>
            <input
              type="file"
              accept=".xlsx, .xls, .pdf, .png, .jpg, .jpeg"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              className="border p-2 rounded w-full text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={!archivo || cargando}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition"
          >
            {cargando ? 'Procesando con Gemini IA...' : 'Cargar y Procesar'}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {resultado && (
          <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-green-900 mb-2">Resultados Extraídos:</h2>
            <pre className="bg-white p-4 rounded border text-xs overflow-x-auto text-gray-800">
              {JSON.stringify(resultado, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
