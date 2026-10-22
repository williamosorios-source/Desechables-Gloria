'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function HomePage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<any | null>(null);
  const [comparativa, setComparativa] = useState<any[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoComparativa, setCargandoComparativa] = useState(false);

  const detalleRef = useRef<HTMLDivElement>(null);

  // 1. Cargar el catálogo maestro estandarizado
  useEffect(() => {
    async function obtenerCatalogo() {
      try {
        const { data, error } = await supabase
          .from('catalogo_maestro')
          .select('id, nombre_estandarizado')
          .order('nombre_estandarizado', { ascending: true });

        if (error) throw error;

        const lista = data || [];
        setProductos(lista);

        if (lista.length > 0) {
          seleccionarProducto(lista[0], false);
        }
      } catch (err) {
        console.error('Error al cargar catálogo:', err);
      } finally {
        setCargandoLista(false);
      }
    }

    obtenerCatalogo();
  }, []);

  // 2. Filtrar productos en tiempo real según el buscador
  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos;
    return productos.filter((item) =>
      item.nombre_estandarizado.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [productos, busqueda]);

  // 3. Cargar precios comparativos filtrando por catalogo_id
  const seleccionarProducto = async (prod: any, hacerScrollMovil = true) => {
    if (!prod || !prod.id) return;
    setProductoSeleccionado(prod);
    setCargandoComparativa(true);

    try {
      const { data, error } = await supabase
        .from('lista_precios')
        .select('id, nombre_proveedor, nombre_original, nombre_estandarizado, precio')
        .eq('catalogo_id', prod.id)
        .order('precio', { ascending: true });

      if (error) throw error;
      setComparativa(data || []);

      // Si es un celular y el usuario hizo clic, desplaza automáticamente a la tabla de precios
      if (hacerScrollMovil && window.innerWidth < 768 && detalleRef.current) {
        detalleRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error cargando precios:', err);
      setComparativa([]);
    } finally {
      setCargandoComparativa(false);
    }
  };

  return (
    <div className="min-h-screen md:h-[calc(100vh-4rem)] bg-gray-50 flex flex-col overflow-x-hidden md:overflow-hidden">
      {/* Encabezado Superior Responsivo */}
      <header className="bg-white border-b px-4 md:px-8 py-3 md:py-4 flex flex-col sm:flex-row justify-between items-center shrink-0 shadow-sm gap-3">
        <div className="text-center sm:text-left">
          <h1 className="text-lg md:text-xl font-bold text-gray-800">Mercadeo Institucional</h1>
          <p className="text-xs text-gray-500">Gestión centralizada de compras y proveedores</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-center">
          <Link
            href="/proveedores"
            className="flex-1 sm:flex-initial text-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs md:text-sm font-medium rounded-lg transition"
          >
            Ver Proveedores
          </Link>
          <Link
            href="/cargar"
            className="flex-1 sm:flex-initial text-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-medium rounded-lg transition"
          >
            + Cargar Lista
          </Link>
        </div>
      </header>

      {/* Cuerpo Dividido (Apilado en móvil, 2 columnas en desktop) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Panel Izquierdo: Catálogo Maestro con Buscador y Scroll Propio */}
        <aside className="w-full md:w-1/3 border-b md:border-b-0 md:border-r bg-white flex flex-col max-h-[50vh] md:max-h-none md:h-full shrink-0">
          {/* Cabecera Fija del Panel */}
          <div className="p-3 md:p-4 border-b shrink-0 bg-white">
            <h2 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 md:mb-3">
              Artículos Estandarizados ({productosFiltrados.length})
            </h2>

            {/* Campo Buscador */}
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs md:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-2 top-2 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Lista Scrolleable Independiente */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
            {cargandoLista ? (
              <p className="text-gray-400 text-xs md:text-sm">Cargando catálogo...</p>
            ) : productosFiltrados.length === 0 ? (
              <p className="text-gray-500 text-xs md:text-sm py-4 text-center">
                No se encontraron productos coincidentes.
              </p>
            ) : (
              productosFiltrados.map((item) => (
                <button
                  key={item.id}
                  onClick={() => seleccionarProducto(item)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    productoSeleccionado?.id === item.id
                      ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium shadow-sm'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <p className="text-xs md:text-sm font-semibold">{item.nombre_estandarizado}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Panel Derecho: Tabla Comparativa de Precios */}
        <main ref={detalleRef} className="flex-1 bg-gray-50 overflow-y-auto p-4 md:p-8 md:h-full">
          {productoSeleccionado ? (
            <div>
              <div className="mb-4 md:mb-6 bg-white p-4 md:p-6 rounded-lg border shadow-sm">
                <span className="text-[10px] md:text-xs font-semibold text-blue-600 uppercase">
                  Artículo Estandarizado Seleccionado
                </span>
                <h2 className="text-lg md:text-2xl font-bold text-gray-800">
                  {productoSeleccionado.nombre_estandarizado}
                </h2>
              </div>

              <h3 className="text-sm md:text-lg font-semibold text-gray-700 mb-3 md:mb-4">
                Comparativa de Precios
              </h3>

              {cargandoComparativa ? (
                <p className="text-gray-400 text-xs md:text-sm">Cargando precios comparativos...</p>
              ) : comparativa.length === 0 ? (
                <div className="bg-white p-6 md:p-8 text-center rounded-lg border text-gray-500 text-xs md:text-sm">
                  No hay precios registrados para este producto.
                </div>
              ) : (
                <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px] md:min-w-0">
                    <thead>
                      <tr className="bg-gray-100 border-b text-[10px] md:text-xs font-semibold text-gray-600 uppercase">
                        <th className="p-3 md:p-4">Proveedor</th>
                        <th className="p-3 md:p-4">Nombre Original en Lista</th>
                        <th className="p-3 md:p-4 text-right">Precio Registrado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs md:text-sm">
                      {comparativa.map((fila, idx) => (
                        <tr key={fila.id} className={idx === 0 ? 'bg-green-50/50 font-medium' : ''}>
                          <td className="p-3 md:p-4 font-semibold text-gray-800">
                            {fila.nombre_proveedor}
                          </td>
                          <td className="p-3 md:p-4 text-gray-600">{fila.nombre_original}</td>
                          <td className="p-3 md:p-4 text-right font-bold text-gray-900">
                            ${Number(fila.precio).toLocaleString('es-CO')}
                            {idx === 0 && (
                              <span className="block text-[10px] md:text-xs font-normal text-green-600">
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
            <div className="flex h-full items-center justify-center text-gray-400 py-12 text-xs md:text-sm">
              Selecciona un producto de la lista para ver sus precios.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
