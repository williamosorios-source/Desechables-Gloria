'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<any | null>(null);
  const [productosProveedor, setProductosProveedor] = useState<any[]>([]);
  const [cargandoProveedores, setCargandoProveedores] = useState(true);
  const [cargandoProductos, setCargandoProductos] = useState(false);

  // 1. Cargar proveedores por ID y Nombre
  useEffect(() => {
    async function obtenerProveedores() {
      try {
        const { data, error } = await supabase
          .from('proveedores')
          .select('id, nombre')
          .order('nombre', { ascending: true });

        if (error) throw error;

        const lista = data || [];
        setProveedores(lista);

        if (lista.length > 0) {
          seleccionarProveedor(lista[0]);
        }
      } catch (err) {
        console.error('Error cargando proveedores:', err);
      } finally {
        setCargandoProveedores(false);
      }
    }

    obtenerProveedores();
  }, []);

  // 2. Filtrar productos usando la llave foránea proveedor_id
  const seleccionarProveedor = async (prov: any) => {
    if (!prov || !prov.id) return;
    setProveedorSeleccionado(prov);
    setCargandoProductos(true);

    try {
      const { data, error } = await supabase
        .from('lista_precios')
        .select('id, nombre_estandarizado, nombre_original, precio')
        .eq('proveedor_id', prov.id)
        .order('nombre_estandarizado', { ascending: true });

      if (error) throw error;
      setProductosProveedor(data || []);
    } catch (err) {
      console.error('Error cargando productos del proveedor:', err);
      setProductosProveedor([]);
    } finally {
      setCargandoProductos(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Encabezado Superior */}
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Desechables Gloria</h1>
          <p className="text-xs text-gray-500">Gestión de Proveedores y Listas Asociadas</p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition"
          >
            ← Volver al Comparador
          </Link>
          <Link
            href="/cargar"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            + Cargar Lista de Precios
          </Link>
        </div>
      </header>

      {/* Cuerpo Dividido */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel Izquierdo: Lista de Proveedores */}
        <aside className="w-1/3 border-r bg-white overflow-y-auto p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Proveedores Registrados ({proveedores.length})
          </h2>

          {cargandoProveedores ? (
            <p className="text-gray-400 text-sm">Cargando proveedores...</p>
          ) : proveedores.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay proveedores registrados.</p>
          ) : (
            <div className="space-y-2">
              {proveedores.map((item) => (
                <button
                  key={item.id}
                  onClick={() => seleccionarProveedor(item)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    proveedorSeleccionado?.id === item.id
                      ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <p className="text-sm font-semibold">{item.nombre}</p>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Panel Derecho: Productos del Proveedor */}
        <main className="flex-1 bg-gray-50 overflow-y-auto p-8">
          {proveedorSeleccionado ? (
            <div>
              <div className="mb-6 bg-white p-6 rounded-lg border shadow-sm">
                <span className="text-xs font-semibold text-blue-600 uppercase">
                  Proveedor Seleccionado
                </span>
                <h2 className="text-2xl font-bold text-gray-800">
                  {proveedorSeleccionado.nombre}
                </h2>
              </div>

              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                Catálogo de Productos Ofertados ({productosProveedor.length})
              </h3>

              {cargandoProductos ? (
                <p className="text-gray-400 text-sm">Cargando catálogo del proveedor...</p>
              ) : productosProveedor.length === 0 ? (
                <div className="bg-white p-8 text-center rounded-lg border text-gray-500">
                  Este proveedor no tiene productos registrados en la lista de precios.
                </div>
              ) : (
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b text-xs font-semibold text-gray-600 uppercase">
                        <th className="p-4">Producto Estandarizado</th>
                        <th className="p-4">Nombre en Lista del Proveedor</th>
                        <th className="p-4 text-right">Precio Ofertado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {productosProveedor.map((fila) => (
                        <tr key={fila.id} className="hover:bg-gray-50">
                          <td className="p-4 font-semibold text-gray-800">
                            {fila.nombre_estandarizado}
                          </td>
                          <td className="p-4 text-gray-600">{fila.nombre_original}</td>
                          <td className="p-4 text-right font-bold text-gray-900">
                            ${Number(fila.precio).toLocaleString('es-CO')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              Selecciona un proveedor de la izquierda para ver sus productos.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
