'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function EstandarizarPage() {
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [pendientes, setPendientes] = useState<any[]>([]);
  
  // Estado para gestión del catálogo maestro
  const [nuevoMasterNombre, setNuevoMasterNombre] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNombre, setEditandoNombre] = useState('');

  // Estados para asignación / homologación
  const [asociaciones, setAsociaciones] = useState<{ [key: string]: string }>({});
  const [nuevosNombresDirectos, setNuevosNombresDirectos] = useState<{ [key: string]: string }>({});

  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    try {
      // A. Cargar catálogo maestro
      const { data: catData, error: catErr } = await supabase
        .from('catalogo_maestro')
        .select('id, nombre_estandarizado')
        .order('nombre_estandarizado', { ascending: true });

      if (catErr) throw catErr;
      setCatalogo(catData || []);

      // B. Cargar ítems pendientes en lista_precios (donde catalogo_id sea NULL)
      const { data: pendData, error: pendErr } = await supabase
        .from('lista_precios')
        .select('id, nombre_original, nombre_proveedor, precio')
        .is('catalogo_id', null)
        .order('nombre_original', { ascending: true });

      if (pendErr) throw pendErr;
      setPendientes(pendData || []);

    } catch (err: any) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: 'Error al cargar los datos desde Supabase.' });
    } finally {
      setCargando(false);
    }
  }

  // --- MÉTODOS DEL CATÁLOGO MAESTRO ---

  const crearProductoMaster = async () => {
    if (!nuevoMasterNombre.trim()) return;
    setMensaje(null);
    try {
      const { error } = await supabase
        .from('catalogo_maestro')
        .insert({ nombre_estandarizado: nuevoMasterNombre.trim() });

      if (error) throw error;

      setMensaje({ tipo: 'exito', texto: 'Producto estandarizado creado en el catálogo maestro.' });
      setNuevoMasterNombre('');
      await cargarDatos();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al crear en catálogo maestro.' });
    }
  };

  const guardarEdicionMaster = async (id: string) => {
    if (!editandoNombre.trim()) return;
    try {
      const { error } = await supabase
        .from('catalogo_maestro')
        .update({ nombre_estandarizado: editandoNombre.trim() })
        .eq('id', id);

      if (error) throw error;

      setEditandoId(null);
      setMensaje({ tipo: 'exito', texto: 'Producto actualizado en el catálogo maestro.' });
      await cargarDatos();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: 'Error al actualizar el producto.' });
    }
  };

  const eliminarProductoMaster = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Eliminar "${nombre}" del catálogo maestro?`)) return;
    try {
      const { error } = await supabase
        .from('catalogo_maestro')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMensaje({ tipo: 'exito', texto: 'Producto eliminado del catálogo maestro.' });
      await cargarDatos();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar el producto.' });
    }
  };

  // --- MÉTODOS DE ESTANDARIZACIÓN Y HOMOLOGACIÓN ---

  const asignarExistente = async (itemPendiente: any) => {
    const selectedMasterId = asociaciones[itemPendiente.id];
    if (!selectedMasterId) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un producto del catálogo maestro.' });
      return;
    }

    const masterObj = catalogo.find(c => c.id === selectedMasterId);
    if (!masterObj) return;

    setProcesandoId(itemPendiente.id);
    setMensaje(null);

    try {
      const { error } = await supabase
        .from('lista_precios')
        .update({
          catalogo_id: masterObj.id,
          nombre_estandarizado: masterObj.nombre_estandarizado
        })
        .eq('id', itemPendiente.id);

      if (error) throw error;

      setMensaje({ tipo: 'exito', texto: `"${itemPendiente.nombre_original}" fue estandarizado como "${masterObj.nombre_estandarizado}".` });
      await cargarDatos();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: 'Error al homologar el registro.' });
    } finally {
      setProcesandoId(null);
    }
  };

  const crearYAsignarNuevo = async (itemPendiente: any) => {
    const nuevoNombre = nuevosNombresDirectos[itemPendiente.id] || itemPendiente.nombre_original;

    if (!nuevoNombre.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ingresa un nombre estandarizado válido.' });
      return;
    }

    setProcesandoId(itemPendiente.id);
    setMensaje(null);

    try {
      // 1. Crear el producto en el catálogo maestro
      const { data: newMaster, error: errMaster } = await supabase
        .from('catalogo_maestro')
        .insert({ nombre_estandarizado: nuevoNombre.trim() })
        .select()
        .single();

      if (errMaster) throw errMaster;

      // 2. Asignar inmediatamente al registro de lista_precios
      const { error: errUpdate } = await supabase
        .from('lista_precios')
        .update({
          catalogo_id: newMaster.id,
          nombre_estandarizado: newMaster.nombre_estandarizado
        })
        .eq('id', itemPendiente.id);

      if (errUpdate) throw errUpdate;

      setMensaje({ tipo: 'exito', texto: `Se creó "${newMaster.nombre_estandarizado}" y se asignó correctamente.` });
      await cargarDatos();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al crear y asignar el nuevo producto.' });
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-gray-800">Mercadeo Institucional</h1>
          <p className="text-xs text-gray-500">Módulo de Estandarización de Precios</p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/"
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs md:text-sm font-medium rounded-lg transition"
          >
            ← Comparador
          </Link>
          <Link
            href="/cargar"
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs md:text-sm font-medium rounded-lg transition"
          >
            + Cargar Lista
          </Link>
        </div>
      </header>

      <div className="max-w-6xl w-full mx-auto p-4 md:p-8 space-y-8">

        {/* Notificaciones */}
        {mensaje && (
          <div
            className={`p-4 rounded-lg text-sm font-medium ${
              mensaje.tipo === 'exito'
                ? 'bg-green-100 border border-green-300 text-green-800'
                : 'bg-red-100 border border-red-300 text-red-800'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* BLOQUE 1: Administración del Catálogo Maestro */}
        <section className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-800 border-b pb-2">
            1. Catálogo Maestro de Productos ({catalogo.length})
          </h2>

          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              placeholder="Nombre del nuevo producto estandarizado..."
              value={nuevoMasterNombre}
              onChange={(e) => setNuevoMasterNombre(e.target.value)}
              className="flex-1 p-2 text-xs border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={crearProductoMaster}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition"
            >
              + Crear Estandarizado
            </button>
          </div>

          {/* Tabla scrolleable de productos en el catálogo */}
          <div className="max-h-48 overflow-y-auto border rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-100 sticky top-0 font-semibold text-gray-600">
                <tr>
                  <th className="p-3">Nombre Estandarizado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {catalogo.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-gray-400">
                      No hay productos en el catálogo maestro.
                    </td>
                  </tr>
                ) : (
                  catalogo.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        {editandoId === item.id ? (
                          <input
                            type="text"
                            value={editandoNombre}
                            onChange={(e) => setEditandoNombre(e.target.value)}
                            className="p-1 border rounded w-full max-w-xs text-xs"
                          />
                        ) : (
                          <span className="font-medium text-gray-800">{item.nombre_estandarizado}</span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {editandoId === item.id ? (
                          <>
                            <button
                              onClick={() => guardarEdicionMaster(item.id)}
                              className="text-green-600 font-bold hover:underline"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditandoId(null)}
                              className="text-gray-400 hover:underline"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditandoId(item.id);
                                setEditandoNombre(item.nombre_estandarizado);
                              }}
                              className="text-blue-600 hover:underline"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => eliminarProductoMaster(item.id, item.nombre_estandarizado)}
                              className="text-red-600 hover:underline"
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* BLOQUE 2: Homologación de Productos Pendientes */}
        <section className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-800 border-b pb-2">
            2. Productos Pendientes de Estandarización ({pendientes.length})
          </h2>

          {cargando ? (
            <p className="text-gray-400 text-xs">Cargando registros pendientes...</p>
          ) : pendientes.length === 0 ? (
            <div className="p-8 text-center text-green-700 bg-green-50 rounded-lg border border-green-200 text-sm">
              ¡Excelente! Todos los productos están homologados y asociados a un catálogo estandarizado.
            </div>
          ) : (
            <div className="space-y-4">
              {pendientes.map((item) => (
                <div key={item.id} className="p-4 border rounded-xl bg-gray-50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-purple-600 uppercase">
                      {item.nombre_proveedor}
                    </span>
                    <h3 className="text-sm font-bold text-gray-800">
                      {item.nombre_original}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      Precio Ofertado: ${Number(item.precio).toLocaleString('es-CO')}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    {/* Opción A: Asociar a existente */}
                    <div className="flex gap-1">
                      <select
                        value={asociaciones[item.id] || ''}
                        onChange={(e) => setAsociaciones({ ...asociaciones, [item.id]: e.target.value })}
                        className="p-2 text-xs border rounded-lg bg-white"
                      >
                        <option value="">-- Seleccionar Estandarizado --</option>
                        {catalogo.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.nombre_estandarizado}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => asignarExistente(item)}
                        disabled={procesandoId === item.id}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
                      >
                        Asignar
                      </button>
                    </div>

                    <span className="text-center text-xs text-gray-400 self-center">o</span>

                    {/* Opción B: Crear y asignar directamente */}
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder={item.nombre_original}
                        value={nuevosNombresDirectos[item.id] || ''}
                        onChange={(e) => setNuevosNombresDirectos({ ...nuevosNombresDirectos, [item.id]: e.target.value })}
                        className="p-2 text-xs border rounded-lg bg-white w-48"
                      />
                      <button
                        onClick={() => crearYAsignarNuevo(item)}
                        disabled={procesandoId === item.id}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition whitespace-nowrap"
                      >
                        Crear y Estandarizar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
