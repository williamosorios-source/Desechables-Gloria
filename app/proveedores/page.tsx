'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<any | null>(null);
  const [productosProveedor, setProductosProveedor] = useState<any[]>([]);

  useEffect(() => {
    async function obtenerProveedores() {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data, error } = await supabase.from('proveedores').select('*').order('nombre');
        if (error) throw error;
        setProveedores(data || []);
        if (data && data.length > 0) {
          cargarProductosProveedor(data[0]);
        }
      } catch (err) {
        console.error('Error cargando proveedores:', err);
      }
    }
    obtenerProveedores();
  }, []);

  const cargarProductosProveedor = async (prov: any) => {
    setProveedorSeleccionado(prov);
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase
        .from('lista_precios')
        .select(`
          id,
          nombre_original,
          precio,
          catalogo_maestro ( nombre_estandarizado )
        `)
        .eq('proveedor_id', prov.id);

      if (error) throw error;
      setProductosProveedor(data || []);
    } catch (err) {
      console.error('Error cargando productos del proveedor:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Directorio de Proveedores</h1>
            <p className="text-sm text-gray-500">Consulta los artículos cargados por cada proveedor</p>
          </div>
          <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
            ← Volver al Comparador
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            {proveedores.map((p) => (
              <button
                key={p.id}
                onClick={() => cargarProductosProveedor(p)}
                className={`w-full text-left p-4 rounded-lg border bg-white transition ${
                  proveedorSeleccionado?.id === p.id ? 'border-blue-500 ring-2 ring-blue-100' : 'hover:bg-gray-50'
                }`}
              >
                <h3 className="font-bold text-gray-800">{p.nombre}</h3>
                <p className="text-xs text-gray-500">{p.contacto || 'Sin contacto'}</p>
                <p className="text-xs text-gray-400 mt-1">{p.telefono}</p>
              </button>
            ))}
          </div>

          <div className="md:col-span-2 bg-white border rounded-lg p-6 shadow-sm">
            {proveedorSeleccionado ? (
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">{proveedorSeleccionado.nombre}</h2>
                <p className="text-xs text-gray-500 mb-6">Lista de productos registrados</p>

                {productosProveedor.length === 0 ? (
                  <p className="text-gray-400 text-sm">Este proveedor no tiene productos registrados.</p>
                ) : (
                  <div className="space-y-3">
                    {productosProveedor.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{item.nombre_original}</p>
                          <span className="text-xs text-blue-600">
                            Estandarizado como: {item.catalogo_maestro?.nombre_estandarizado || 'Sin mapear'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          ${Number(item.precio).toLocaleString('es-CO')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-center">Selecciona un proveedor.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
