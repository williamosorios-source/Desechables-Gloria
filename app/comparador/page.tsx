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
    <div className="max-w-4xl mx-auto p-6 space-y-6 text-black">
      <h1 className="text-2xl font-bold">2. Comparador de Precios (Menor a Mayor)</h1>
      
      <input
        type="text"
        placeholder="Buscar producto (ej. Vaso 7oz)..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full border-2 border-blue-500 p-3 rounded-lg text-lg"
      />
      
      <div className="flex flex-wrap gap-2">
        {productos.map(p => (
          <button 
            key={p.id} 
            onClick={() => setProdSeleccionado(p.id)} 
            className={`p-2 rounded border ${prodSeleccionado === p.id ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            {p.nombre_estandarizado}
          </button>
        ))}
      </div>

      {precios.length > 0 && (
        <table className="w-full text-left border rounded overflow-hidden">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="p-3">Proveedor</th>
              <th className="p-3">Nombre en Lista Original</th>
              <th className="p-3">Precio</th>
              <th className="p-3">Última Actualización</th>
            </tr>
          </thead>
          <tbody>
            {precios.map((item, i) => (
              <tr key={item.id} className={i === 0 ? "bg-green-100 font-bold" : "border-b"}>
                <td className="p-3">{i === 0 ? "👑 " : ""}{item.proveedores?.nombre}</td>
                <td className="p-3 text-sm text-gray-600">{item.nombre_original}</td>
                <td className="p-3 text-green-700 text-lg">${item.precio}</td>
                <td className="p-3 text-sm text-gray-500">{new Date(item.fecha_actualizacion).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
