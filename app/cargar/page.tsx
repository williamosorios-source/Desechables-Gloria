'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
    setMensaje('Guardando en Supabase...');
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
    setMensaje('¡Guardado con éxito!');
    setItemsProcesados([]);
    setTextoLista('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 text-black">
      <h1 className="text-2xl font-bold">1. Cargar Lista de Proveedor</h1>
      
      {/* Crear proveedor rapido */}
      <div className="flex gap-2 border p-3 rounded bg-gray-50">
        <input
          type="text"
          placeholder="¿Proveedor nuevo? Escribe el nombre..."
          value={nuevoProveedor}
          onChange={(e) => setNuevoProveedor(e.target.value)}
          className="border p-2 rounded flex-1"
        />
        <button onClick={handleCrearProveedor} className="bg-gray-800 text-white px-4 py-2 rounded">
          + Agregar Proveedor
        </button>
      </div>

      {/* Seleccionar Proveedor */}
      <select 
        value={proveedorSeleccionado} 
        onChange={(e) => setProveedorSeleccionado(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="">-- Selecciona Proveedor Existente --</option>
        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>

      {/* Texto de la lista */}
      <textarea
        rows={6}
        value={textoLista}
        onChange={(e) => setTextoLista(e.target.value)}
        placeholder="Pega aquí la lista enviada por el proveedor..."
        className="w-full border p-2 rounded"
      />

      <button onClick={handleProcesar} disabled={cargandoIA} className="bg-blue-600 text-white px-4 py-2 rounded w-full font-bold">
        {cargandoIA ? 'Procesando con IA...' : 'Procesar Lista con IA'}
      </button>

      {/* Revision Humana */}
      {itemsProcesados.length > 0 && (
        <div className="space-y-4 border-t pt-4">
          <h2 className="text-xl font-semibold">Validación Humana</h2>
          {itemsProcesados.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center border p-2 rounded bg-white">
              <span>{item.nombre_original}</span>
              <span className="font-bold text-green-700">${item.precio}</span>
            </div>
          ))}
          <button onClick={handleGuardar} className="bg-green-600 text-white px-4 py-2 rounded w-full font-bold text-lg">
            Confirmar y Guardar en Base de Datos
          </button>
        </div>
      )}
      {mensaje && <p className="text-green-600 font-bold text-center">{mensaje}</p>}
    </div>
  );
}
