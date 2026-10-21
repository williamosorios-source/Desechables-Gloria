'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function ComparadorPage() {
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [prodSeleccionado, setProdSeleccionado] = useState('');
  const [precios, setPrecios] = useState<any[]>([]);

  useEffect(() => {
    async function buscar() {
      let q = supabase.from('catalogo_maestro').select('*');
      if (busqueda) q = q.ilike('nombre_estandarizado', `%${busqueda}%`);
      const { data } = await q.limit(10);
      if (data) setProductos(data);
    }
    buscar();
  }, [busqueda]);

  useEffect(() => {
    async function cargarPrecios() {
      if (!prodSeleccionado) return;
      const { data } = await supabase
        .from('precios_proveedores')
        .select('*, proveedores(nombre)')
        .eq('catalogo_id', prodSeleccionado)
        .order('precio', { ascending: true });
      if (data) setPrecios(data);
    }
    cargarPrecios();
  }, [prodSeleccionado]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Comparador de Precios</h1>
        <p className="text-slate-500 mt-1">Encuentra al instante el mejor precio de tu catálogo ordenado de menor a mayor.</p>
      </div>

      {/* Buscador de Producto */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Buscar en el catálogo (ej. Vaso, Servilleta)..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-slate-900 text-lg placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-inner"
          />
        </div>

        {/* Pills de Selección */}
        {productos.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {productos.map(p => (
              <button 
                key={p.id} 
                onClick={() => setProdSeleccionado(p.id)} 
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  prodSeleccionado === p.id 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {p.nombre_estandarizado}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resultados de Comparativa */}
      {precios.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
            <h2 className="font-bold text-lg">Comparativa de Cotizaciones</h2>
            <span className="text-xs text-slate-400">Ordenado por mejor precio</span>
          </div>

          <div className="divide-y divide-slate-100">
            {precios.map((item, i) => (
              <div 
                key={item.id} 
                className={`p-5 flex items-center justify-between transition-colors ${
                  i === 0 ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {i === 0 && (
                      <span className="bg-emerald-600 text-white text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md">
                        Mejor Precio
                      </span>
                    )}
                    <span className="font-bold text-slate-900 text-base">
                      {item.proveedores?.nombre || 'Proveedor Desconocido'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Original: <span className="font-mono text-slate-700">{item.nombre_original}</span>
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <p className={`text-2xl font-extrabold font-mono ${i === 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                    ${Number(item.precio).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(item.fecha_actualizacion).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        prodSeleccionado && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
            No hay precios registrados para este producto en Supabase.
          </div>
        )
      )}
    </div>
  );
}
