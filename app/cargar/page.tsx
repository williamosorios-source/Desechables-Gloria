'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function CargarListaPage() {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');
  const [nuevoProveedor, setNuevoProveedor] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargandoIA, setCargandoIA] = useState(false);
  const [itemsProcesados, setItemsProcesados] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');

  const cargarDatos = async () => {
    const { data: provs } = await supabase.from('proveedores').select('*');
    const { data: cats } = await supabase.from('catalogo_maestro').select('*');
    if (provs) setProveedores(provs);
    if (cats) setCatalogo(cats);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

const handleCrearProveedor = async () => {
    if (!nuevoProveedor.trim()) return;
    
    const { data, error } = await supabase
      .from('proveedores')
      .insert([{ nombre: nuevoProveedor }])
      .select()
      .single();

    if (error) {
      alert('Error de Supabase: ' + error.message);
      return;
    }

    if (data) {
      setNuevoProveedor('');
      cargarDatos();
      setProveedorSeleccionado(data.id);
    }
  };

  const handleProcesar = async () => {
    if (!archivo || !proveedorSeleccionado) {
      alert('Por favor selecciona un proveedor y adjunta un archivo (PDF, Foto, Excel o TXT).');
      return;
    }

    setCargandoIA(true);
    setMensaje('');

    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('catalogoMaestro', JSON.stringify(catalogo));

      const res = await fetch('/api/procesar-lista', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.productos) {
        setItemsProcesados(data.productos);
      } else {
        alert(data.error || 'No se pudieron extraer productos del archivo.');
      }
    } catch (err) {
      alert('Error procesando el archivo con IA.');
    } finally {
      setCargandoIA(false);
    }
  };

  const handleGuardar = async () => {
    setMensaje('Guardando actualización en la base de datos...');
    try {
      for (const item of itemsProcesados) {
        let catId = item.catalogo_id;
        if (!catId) {
          const { data: nuevo } = await supabase
            .from('catalogo_maestro')
            .insert([{ nombre_estandarizado: item.nombre_estandarizado_sugerido }])
            .select().single();
          if (nuevo) catId = nuevo.id;
        }
        if (catId) {
          await supabase.from('precios_proveedores').insert([{
            proveedor_id: proveedorSeleccionado,
            catalogo_id: catId,
            nombre_original: item.nombre_original,
            precio: item.precio,
          }]);
        }
      }
      setMensaje('¡Precios procesados y guardados exitosamente!');
      setItemsProcesados([]);
      setArchivo(null);
    } catch (e) {
      setMensaje('Error al guardar en Supabase.');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto text-slate-900">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Cargar Lista de Proveedor</h1>
        <p className="text-slate-500 mt-1">Sube el documento oficial del proveedor (PDF, Foto/Imagen, Excel o TXT) para estructurarlo automáticamente.</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
        {/* Proveedores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              1. Seleccionar Proveedor
            </label>
            <select 
              value={proveedorSeleccionado} 
              onChange={(e) => setProveedorSeleccionado(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- Selecciona proveedor --</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              O Crear Proveedor Nuevo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre del proveedor..."
                value={nuevoProveedor}
                onChange={(e) => setNuevoProveedor(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button 
                onClick={handleCrearProveedor} 
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-3 rounded-xl transition-all"
              >
                + Crear
              </button>
            </div>
          </div>
        </div>

        {/* Carga de Archivo */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            2. Adjuntar Documento o Lista
          </label>
          
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50 transition-all cursor-pointer relative">
            <input 
              type="file" 
              accept=".pdf, .png, .jpg, .jpeg, .xlsx, .xls, .txt"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="space-y-2">
              <div className="text-4xl">📄</div>
              {archivo ? (
                <div>
                  <p className="font-bold text-blue-600 text-lg">{archivo.name}</p>
                  <p className="text-xs text-slate-400">{(archivo.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-slate-700">Haz clic para seleccionar o arrastra un archivo aquí</p>
                  <p className="text-xs text-slate-400 mt-1">Soporta PDFs, Imágenes (JPG/PNG), Excel (.xlsx) y Archivos de Texto</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <button 
          onClick={handleProcesar} 
          disabled={cargandoIA || !archivo} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {cargandoIA ? (
            <span>✨ Gemini está leyendo el archivo y extrayendo los datos...</span>
          ) : (
            <span>⚡ Leer Archivo y Procesar con IA</span>
          )}
        </button>
      </div>

      {/* Tabla de Resultados */}
      {itemsProcesados.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">3. Tabla de Productos Detectados</h2>
            <span className="bg-blue-50 text-blue-700 font-semibold text-xs px-3 py-1 rounded-full border border-blue-100">
              {itemsProcesados.length} Productos
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                  <th className="p-4">Nombre Original en Documento</th>
                  <th className="p-4">Estandarización Sugerida</th>
                  <th className="p-4 text-right">Precio Detectado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {itemsProcesados.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">{item.nombre_original}</td>
                    <td className="p-4 text-slate-600">
                      <span className="inline-block bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                        {item.nombre_estandarizado_sugerido}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-emerald-600 font-mono">
                      ${Number(item.precio).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button 
            onClick={handleGuardar} 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
          >
            ✓ Guardar Lista Convertida en Supabase
          </button>
        </div>
      )}

      {mensaje && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-medium text-center">
          {mensaje}
        </div>
      )}
    </div>
  );
}
