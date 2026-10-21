'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function CargarListaPage() {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');
  const [nuevoProveedor, setNuevoProveedor] = useState('');
  const [textoLista, setTextoLista] = useState('');
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
    const { data } = await supabase.from('proveedores').insert([{ nombre: nuevoProveedor }]).select().single();
    if (data) {
      setNuevoProveedor('');
      cargarDatos();
      setProveedorSeleccionado(data.id);
    }
  };

  const handleProcesar = async () => {
    if (!textoLista || !proveedorSeleccionado) return alert('Selecciona proveedor y escribe la lista');
    setCargandoIA(true);

    const res = await fetch('/api/procesar-lista', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ textoDocumento: textoLista, catalogoMaestro: catalogo }),
    });

    const data = await res.json();
    if (data.productos) setItemsProcesados(data.productos);
    setCargandoIA(false);
  };

  const handleGuardar = async () => {
    setMensaje('Guardando en la base de datos...');
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
    setMensaje('¡Precios actualizados exitosamente!');
    setItemsProcesados([]);
    setTextoLista('');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Cargar Lista de Proveedor</h1>
        <p className="text-slate-500 mt-1">Pega el texto crudo enviado por tu proveedor para extraer y estandarizar precios automáticamente.</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
        {/* Proveedor selector / creador */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              1. Seleccionar Proveedor
            </label>
            <select 
              value={proveedorSeleccionado} 
              onChange={(e) => setProveedorSeleccionado(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            >
              <option value="">-- Elige un proveedor --</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              O Crear un Nuevo Proveedor
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

        {/* Textarea */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            2. Contenido de la Lista
          </label>
          <textarea
            rows={6}
            value={textoLista}
            onChange={(e) => setTextoLista(e.target.value)}
            placeholder="Pega la lista del proveedor en texto (ej. Vaso 7oz blanco x 100u $12.500)..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
          />
        </div>

        <button 
          onClick={handleProcesar} 
          disabled={cargandoIA} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {cargandoIA ? (
            <span>✨ Gemini está procesando la lista...</span>
          ) : (
            <span>⚡ Procesar Lista con Inteligencia Artificial</span>
          )}
        </button>
      </div>

      {/* Tabla de Validación Humana */}
      {itemsProcesados.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">3. Validación y Estandarización Sugerida</h2>
            <span className="bg-blue-50 text-blue-700 font-semibold text-xs px-3 py-1 rounded-full border border-blue-100">
              {itemsProcesados.length} Productos detectados
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                  <th className="p-4">Nombre Original</th>
                  <th className="p-4">Sugerencia Estándar</th>
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
            ✓ Confirmar y Guardar en Supabase
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
