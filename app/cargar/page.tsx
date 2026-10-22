'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';

interface ItemCarga {
  idTemp: string;
  nombre_original: string;
  precio: number;
}

export default function CargarPage() {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [proveedorId, setProveedorId] = useState('');
  const [nuevoProveedorNombre, setNuevoProveedorNombre] = useState('');
  const [modoCrearProveedor, setModoCrearProveedor] = useState(false);

  const [items, setItems] = useState<ItemCarga[]>([]);
  const [nombreManual, setNombreManual] = useState('');
  const [precioManual, setPrecioManual] = useState('');

  const [cargandoProveedores, setCargandoProveedores] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoTodo, setEliminandoTodo] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Cargar lista de proveedores al iniciar
  useEffect(() => {
    obtenerProveedores();
  }, []);

  async function obtenerProveedores() {
    setCargandoProveedores(true);
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setProveedores(data || []);
      if (data && data.length > 0 && !proveedorId) {
        setProveedorId(data[0].id);
      }
    } catch (err: any) {
      console.error('Error cargando proveedores:', err);
    } finally {
      setCargandoProveedores(false);
    }
  }

  // 2. Procesar archivo Excel / CSV
  const manejarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const dataJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (dataJson.length === 0) {
          setMensaje({ tipo: 'error', texto: 'El archivo subido está vacío.' });
          return;
        }

        const nuevosItems: ItemCarga[] = dataJson.map((row, index) => {
          // Detectar columnas de forma flexible (mayúsculas, minúsculas, etc.)
          const keys = Object.keys(row);
          const keyNombre = keys.find(k => /nombre|producto|articulo|descripcion/i.test(k)) || keys[0];
          const keyPrecio = keys.find(k => /precio|costo|valor/i.test(k)) || keys[1];

          const nombreVal = row[keyNombre] ? String(row[keyNombre]).trim() : '';
          const precioNum = Number(String(row[keyPrecio] || 0).replace(/[^0-9.]/g, '')) || 0;

          return {
            idTemp: `${Date.now()}-${index}`,
            nombre_original: nombreVal,
            precio: precioNum
          };
        }).filter(item => item.nombre_original !== '');

        setItems(prev => [...prev, ...nuevosItems]);
        setMensaje({ tipo: 'exito', texto: `Se cargaron ${nuevosItems.length} registros desde el archivo.` });
      } catch (error) {
        setMensaje({ tipo: 'error', texto: 'Error al procesar el archivo Excel/CSV.' });
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 3. Agregar fila manualmente a la lista
  const agregarItemManual = () => {
    if (!nombreManual.trim()) {
      setMensaje({ tipo: 'error', texto: 'Escribe el nombre del producto.' });
      return;
    }
    const precioNum = Number(precioManual) || 0;

    setItems(prev => [
      ...prev,
      {
        idTemp: `${Date.now()}`,
        nombre_original: nombreManual.trim(),
        precio: precioNum
      }
    ]);

    setNombreManual('');
    setPrecioManual('');
    setMensaje(null);
  };

  // 4. Eliminar fila individual de la previsualización
  const eliminarItemTemp = (idTemp: string) => {
    setItems(prev => prev.filter(i => i.idTemp !== idTemp));
  };

  // 5. Guardar todo en Supabase
  const guardarLista = async () => {
    setMensaje(null);

    if (items.length === 0) {
      setMensaje({ tipo: 'error', texto: 'No hay registros en la lista para guardar.' });
      return;
    }

    setGuardando(true);

    try {
      let idProvFinal = proveedorId;
      let nombreProvFinal = '';

      // A. Crear proveedor si está en modo creación
      if (modoCrearProveedor) {
        if (!nuevoProveedorNombre.trim()) {
          throw new Error('Ingresa el nombre del nuevo proveedor.');
        }

        const { data: newProv, error: errProv } = await supabase
          .from('proveedores')
          .insert({ nombre: nuevoProveedorNombre.trim() })
          .select()
          .single();

        if (errProv) throw errProv;
        idProvFinal = newProv.id;
        nombreProvFinal = newProv.nombre;
      } else {
        const provEncontrado = proveedores.find(p => p.id === proveedorId);
        if (!provEncontrado) throw new Error('Selecciona un proveedor válido.');
        nombreProvFinal = provEncontrado.nombre;
      }

      // B. Preparar inserción masiva en lista_precios
      const registrosAInsertar = items.map(item => ({
        proveedor_id: idProvFinal,
        nombre_proveedor: nombreProvFinal,
        nombre_original: item.nombre_original,
        nombre_estandarizado: item.nombre_original, // Asignado por defecto hasta estandarizar
        precio: item.precio
      }));

      const { error: errPrecios } = await supabase
        .from('lista_precios')
        .insert(registrosAInsertar);

      if (errPrecios) throw errPrecios;

      setMensaje({ tipo: 'exito', texto: `¡Se guardaron ${items.length} productos correctamente!` });
      setItems([]);
      setNuevoProveedorNombre('');
      setModoCrearProveedor(false);
      await obtenerProveedores();

    } catch (err: any) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: err.message || 'Error al guardar en la base de datos.' });
    } finally {
      setGuardando(false);
    }
  };

  // 6. Eliminar todos los productos de un proveedor en la Base de Datos
  const eliminarTodoDelProveedor = async () => {
    if (modoCrearProveedor || !proveedorId) return;

    const provObj = proveedores.find(p => p.id === proveedorId);
    const confirmacion = window.confirm(
      `¿Estás seguro de que deseas ELIMINAR TODOS los precios cargados del proveedor "${provObj?.nombre}"? Esta acción no se puede deshacer.`
    );

    if (!confirmacion) return;

    setEliminandoTodo(true);
    setMensaje(null);

    try {
      const { error } = await supabase
        .from('lista_precios')
        .delete()
        .eq('proveedor_id', proveedorId);

      if (error) throw error;

      setMensaje({ tipo: 'exito', texto: `Se borraron todos los registros de ${provObj?.nombre}.` });
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar los registros del proveedor.' });
    } finally {
      setEliminandoTodo(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Encabezado */}
      <header className="bg-white border-b px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-gray-800">Mercadeo Institucional</h1>
          <p className="text-xs text-gray-500">Carga y Gestión de Listas de Precios</p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/"
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs md:text-sm font-medium rounded-lg transition"
          >
            ← Comparador
          </Link>
          <Link
            href="/proveedores"
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs md:text-sm font-medium rounded-lg transition"
          >
            Ver Proveedores
          </Link>
        </div>
      </header>

      {/* Contenido Principal */}
      <div className="max-w-5xl w-full mx-auto p-4 md:p-8 space-y-6">

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

        {/* SECCIÓN 1: Selección / Creación de Proveedor */}
        <section className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-800 border-b pb-2">
            1. Definir Proveedor
          </h2>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {!modoCrearProveedor ? (
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Seleccionar Proveedor Existente
                </label>
                <select
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  disabled={cargandoProveedores}
                  className="w-full p-2.5 text-sm border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500"
                >
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Nombre del Nuevo Proveedor
                </label>
                <input
                  type="text"
                  placeholder="Ej: Distribuidora Central S.A.S."
                  value={nuevoProveedorNombre}
                  onChange={(e) => setNuevoProveedorNombre(e.target.value)}
                  className="w-full p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => setModoCrearProveedor(!modoCrearProveedor)}
              className="mt-5 sm:mt-0 px-4 py-2.5 text-xs font-semibold rounded-lg border border-gray-300 hover:bg-gray-100 transition whitespace-nowrap"
            >
              {modoCrearProveedor ? '← Seleccionar Existente' : '+ Crear Nuevo Proveedor'}
            </button>
          </div>

          {/* Opción de Borrado Masivo */}
          {!modoCrearProveedor && proveedorId && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={eliminarTodoDelProveedor}
                disabled={eliminandoTodo}
                className="text-xs text-red-600 hover:text-red-800 underline font-medium"
              >
                {eliminandoTodo ? 'Eliminando...' : '⚠️ Eliminar todos los productos existentes de este proveedor'}
              </button>
            </div>
          )}
        </section>

        {/* SECCIÓN 2: Métodos de Carga (Excel o Manual) */}
        <section className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
          <h2 className="text-base font-bold text-gray-800 border-b pb-2">
            2. Agregar Productos a la Lista
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Opción A: Cargar por Documento */}
            <div className="border-2 border-dashed border-gray-300 p-6 rounded-xl text-center bg-gray-50 flex flex-col items-center justify-center">
              <span className="text-3xl mb-2">📁</span>
              <p className="text-sm font-semibold text-gray-700">Cargar Archivo Excel o CSV</p>
              <p className="text-xs text-gray-400 mb-4">Detecta automáticamente Nombre y Precio</p>

              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls, .csv"
                onChange={manejarArchivo}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg cursor-pointer transition"
              >
                Seleccionar Documento
              </label>
            </div>

            {/* Opción B: Formulario Registro a Registro */}
            <div className="bg-gray-50 p-4 rounded-xl border space-y-3">
              <p className="text-xs font-bold text-gray-700 uppercase">Agregar Registro Uno a Uno</p>

              <div>
                <input
                  type="text"
                  placeholder="Nombre del producto (ej: Vaso 7oz)"
                  value={nombreManual}
                  onChange={(e) => setNombreManual(e.target.value)}
                  className="w-full p-2 text-xs border rounded bg-white"
                />
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Precio ($)"
                  value={precioManual}
                  onChange={(e) => setPrecioManual(e.target.value)}
                  className="w-full p-2 text-xs border rounded bg-white"
                />
                <button
                  type="button"
                  onClick={agregarItemManual}
                  className="px-4 py-2 bg-gray-800 hover:bg-black text-white text-xs font-medium rounded transition shrink-0"
                >
                  + Incluir
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN 3: Previsualización y Confirmación */}
        <section className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-base font-bold text-gray-800">
              3. Previsualización ({items.length} registros listos)
            </h2>

            {items.length > 0 && (
              <button
                onClick={() => setItems([])}
                className="text-xs text-gray-500 hover:text-red-600"
              >
                Limpiar lista
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No has agregado productos. Sube un documento o incluye registros manualmente.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto border rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 sticky top-0 border-b font-semibold text-gray-600 uppercase">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Nombre Original del Producto</th>
                    <th className="p-3 text-right">Precio Ofertado</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, idx) => (
                    <tr key={item.idTemp} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-400">{idx + 1}</td>
                      <td className="p-3 font-medium text-gray-800">{item.nombre_original}</td>
                      <td className="p-3 text-right font-bold text-gray-900">
                        ${item.precio.toLocaleString('es-CO')}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => eliminarItemTemp(item.idTemp)}
                          className="text-red-500 hover:text-red-700 font-bold px-2 py-1 text-xs"
                          title="Eliminar de la lista"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Botón Principal de Guardado */}
          <div className="pt-4 flex justify-end">
            <button
              onClick={guardarLista}
              disabled={guardando || items.length === 0}
              className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold text-sm rounded-xl transition shadow-md"
            >
              {guardando ? 'Guardando en la Base de Datos...' : `Guardar ${items.length} Registros`}
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
