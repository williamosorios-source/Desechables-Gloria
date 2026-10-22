'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<any | null>(null);
  const [productosProveedor, setProductosProveedor] = useState<any[]>([]);
  const [cargandoProveedores, setCargandoProveedores] = useState(true);
  const [cargandoProductos, setCargandoProductos] = useState(false);

  const detalleRef = useRef<HTMLDivElement>(null);

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
          seleccionarProveedor(lista[0], false);
        }
      } catch (err) {
        console.error('Error cargando proveedores:', err);
      } finally {
        setCargandoProveedores(false);
      }
    }

    obtenerProveedores();
  }, []);

  // 2. Filtrar proveedores en tiempo real según la búsqueda
  const proveedoresFiltrados = useMemo(() => {
    if (!busqueda.trim()) return proveedores;
    return proveedores.filter((item) =>
      item.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [proveedores, busqueda]);

  // 3. Filtrar productos usando la llave foránea proveedor_id
  const seleccionarProveedor = async (prov: any, hacerScrollMovil = true) => {
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

      // Si es pantalla móvil, hace scroll suave hasta la tabla de productos
      if (hacerScrollMovil && window.innerWidth < 768 && detalleRef.current) {
        detalleRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error cargando productos del proveedor:', err);
      setProductosProveedor([]);
    } finally {
      setCargandoProductos(false);
    }
  };

  return (
    <div className="min-h-screen md:h-[calc(100vh-4rem)] bg-gray-50 flex flex-col overflow-x-hidden md:overflow-hidden">
      {/* Encabezado Superior Responsivo */}
      <header className="bg-white border-b px-4 md:px-8 py-3 md:py-4 flex flex-col sm:flex-row justify-between items-center shrink-0 shadow-sm gap-3">
        <div className="text-center sm:text-left">
          <h1 className="text-lg md:text-xl font-bold text-gray-800">Mercadeo Institucional</h1>
          <p className="text-xs text-gray-500">Gestión de Proveedores y Listas Asociadas</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-center">
          <Link
            href="/"
            className="flex-1 sm:flex-initial text-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs md:text-sm font-medium rounded-lg transition"
          >
            ← Volver al Comparador
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
        {/* Panel Izquierdo: Lista de Proveedores con Buscador */}
        <aside className="w-full md:w-1/3 border-b md:border-b-0 md:border-r bg-white flex flex-col max-h-[50vh] md:max-h-none md:h-full shrink-0">
          {/* Cabecera Fija del Panel */}
          <div className="p-3 md:p-4 border-b shrink-0 bg-white">
            <h2 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 md:mb-3">
              Proveedores Registrados ({proveedoresFiltrados.length})
            </h2>

            {/* Campo Buscador */}
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Buscar proveedor..."
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
            {cargandoProveedores ? (
              <p className="text-gray-400 text-xs md:text-sm">Cargando proveedores...</p>
            ) : proveedoresFiltrados.length === 0 ? (
              <p className="text-gray-500 text-xs md:text-sm py-4 text-center">
                No se encontraron proveedores coincidentes.
              </p>
            ) : (
              proveedoresFiltrados.map((item) => (
                <button
                  key={item.id}
                  onClick={() => seleccionarProveedor(item)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    proveedorSeleccionado?.id === item.id
                      ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium shadow-sm'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <p className="text-xs md:text-sm font-semibold">{item.nombre}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Panel Derecho: Productos del Proveedor */}
        <main ref={detalleRef} className="flex-1 bg-gray-50 overflow-y-auto p-4 md:p-8 md:h-full">
          {proveedorSeleccionado ? (
            <div>
              <div className="mb-4 md:mb-6 bg-white p-4 md:p-6 rounded-lg border shadow-sm">
                <span className="text-[10px] md:text-xs font-semibold text-blue-600 uppercase">
                  Proveedor Seleccionado
                </span>
                <h2 className="text-lg md:text-2xl font-bold text-gray-800">
                  {proveedorSeleccionado.nombre}
                </h2>
              </div>

              <h3 className="text-sm md:text-lg font-semibold text-gray-700 mb-3 md:mb-4">
                Catálogo de Productos Ofertados ({productosProveedor.length})
              </h3>

              {cargandoProductos ? (
                <p className="text-gray-400 text-xs md:text-sm">Cargando catálogo del proveedor...</p>
              ) : productosProveedor.length === 0 ? (
                <div className="bg-white p-6 md:p-8 text-center rounded-lg border text-gray-500 text-xs md:text-sm">
                  Este proveedor no tiene productos registrados en la lista de precios.
                </div>
              ) : (
                <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px] md:min-w-0">
                    <thead>
                      <tr className="bg-gray-100 border-b text-[10px] md:text-xs font-semibold text-gray-600 uppercase">
                        <th className="p-3 md:p-4">Producto Estandarizado</th>
                        <th className="p-3 md:p-4">Nombre en Lista del Proveedor</th>
                        <th className="p-3 md:p-4 text-right">Precio Ofertado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs md:text-sm">
                      {productosProveedor.map((fila) => (
                        <tr key={fila.id} className="hover:bg-gray-50">
                          <td className="p-3 md:p-4 font-semibold text-gray-800">
                            {fila.nombre_estandarizado}
                          </td>
                          <td className="p-3 md:p-4 text-gray-600">{fila.nombre_original}</td>
                          <td className="p-3 md:p-4 text-right font-bold text-gray-900">
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
            <div className="flex h-full items-center justify-center text-gray-400 py-12 text-xs md:text-sm">
              Selecciona un proveedor de la lista para ver sus productos.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
