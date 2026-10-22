'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function HomePage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any | null>(null);
  const [comparativa, setComparativa] = useState<any[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoComparativa, setCargandoComparativa] = useState(false);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);

  // 1. Cargar catálogo maestro desde Supabase
  useEffect(() => {
    async function obtenerCatalogo() {
      try {
        setErrorEstado(null);

        if (!supabase) {
          throw new Error('El cliente de Supabase no está inicializado.');
        }

        const { data, error } = await supabase
          .from('catalogo_maestro')
          .select('*')
          .order('nombre_estandarizado', { ascending: true });

        if (error) {
          throw new Error(`Supabase Error: ${error.message}`);
        }

        const listaProductos = Array.isArray(data) ? data : [];
        setProductos(listaProductos);

        if (listaProductos.length > 0) {
          seleccionarProducto(listaProductos[0]);
        }
      } catch (err: any) {
        console.error('Error al cargar catálogo:', err);
        setErrorEstado(err?.message || 'Error al conectar con Supabase.');
      } finally {
        setCargandoLista(false);
      }
    }

    obtenerCatalogo();
  }, []);

  // 2. Cargar precios comparativos asegurando la búsqueda por UUID
  const seleccionarProducto = async (prod: any) => {
    if (!prod || !prod.id) return;
    setProductoSeleccionado(prod);
    setCargandoComparativa(true);

    try {
      const { data, error } = await supabase
        .from('lista_precios')
        .select(`
          id,
          nombre_original,
          precio,
          fecha_actualizacion,
          proveedores!inner ( nombre, contacto, telefono )
        `)
        .eq('catalogo_id', prod.id)
        .order('precio', { ascending: true });

      if (error) throw error;
      setComparativa(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error cargando comparativa:', err);
      setComparativa([]);
    } finally {
      setCargandoComparativa(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Encabezado Principal */}
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Desechables Gloria</h1>
          <p className="text-xs text-gray-500">Gestión centralizada de compras y proveedores</p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/proveedores"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition"
          >
            Ver Proveedores
          </Link>
          <Link
            href="/cargar"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            + Cargar Lista de Precios
          </Link>
        </div>
      </header>

      {/* Alerta de Error de Conexión */}
      {errorEstado && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4 text-sm rounded shadow">
          <p className="font-bold">Error de conexión:</p>
          <p className="font-mono mt-1">{errorEstado}</p>
        </div>
      )}

      {/* Cuerpo Dividido */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel Izquierdo: Lista de Productos */}
        <aside className="w-1/3 border-r bg-white overflow-y-auto p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Artículos Estandarizados ({productos.length})
          </h2>

          {cargandoLista ? (
            <div className="p-4 text-gray-400 text-sm animate-pulse">
              Cargando catálogo maestro...
            </div>
          ) : productos.length === 0 ? (
            <div className="p-4 text-gray-500 text-sm border border-dashed rounded">
              No se encontraron artículos en el catálogo.
            </div>
          ) : (
            <div className="space-y-2">
              {productos.map((item) => (
                <button
                  key={item.id}
                  onClick={() => seleccionarProducto(item)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    productoSeleccionado?.id === item.id
                      ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <p className="text-sm font-semibold">{item.nombre_estandarizado}</p>
                  <span className="inline-block text-xs text-gray-500 mt-1">
                    Categoría: {item.categoria || 'General'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Panel Derecho: Comparativa de Precios */}
        <main className="flex-1 bg-gray-50 overflow-y-auto p-8">
          {productoSeleccionado ? (
            <div>
              <div className="mb-6 bg-white p-6 rounded-lg border shadow-sm">
                <span className="text-xs font-semibold text-blue-600 uppercase">Artículo Seleccionado</span>
                <h2 className="text-2xl font-bold text-gray-800">{productoSeleccionado.nombre_estandarizado}</h2>
              </div>

              <h3 className="text-lg font-semibold text-gray-700 mb-4">Comparativa de Proveedores</h3>

              {cargandoComparativa ? (
                <p className="text-gray-400 text-sm">Cargando precios comparativos...</p>
              ) : comparativa.length === 0 ? (
                <div className="bg-white p-8 text-center rounded-lg border text-gray-500">
                  No hay precios registrados para este producto.
                </div>
              ) : (
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b text-xs font-semibold text-gray-600 uppercase">
                        <th className="p-4">Proveedor</th>
                        <th className="p-4">Nombre en Lista del Proveedor</th>
                        <th className="p-4 text-right">Precio Registrado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {comparativa.map((fila, idx) => (
                        <tr key={fila.id} className={idx === 0 ? 'bg-green-50/50 font-medium' : ''}>
                          <td className="p-4">
                            <p className="font-semibold text-gray-800">
                              {fila.proveedores?.nombre || 'Proveedor Desconocido'}
                            </p>
                            <span className="text-xs text-gray-500">{fila.proveedores?.telefono}</span>
                          </td>
                          <td className="p-4 text-gray-600">{fila.nombre_original}</td>
                          <td className="p-4 text-right font-bold text-gray-900">
                            ${Number(fila.precio).toLocaleString('es-CO')}
                            {idx === 0 && (
                              <span className="block text-xs font-normal text-green-600">
                                Mejor Precio
                              </span>
                            )}
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
              Selecciona un producto de la izquierda para comparar precios.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
