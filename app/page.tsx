import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto p-8 text-center space-y-6">
      <h1 className="text-3xl font-bold">Sistema Comparador de Precios</h1>
      <div className="flex justify-center gap-4">
        <Link href="/cargar" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold">
          1. Cargar Lista de Proveedor
        </Link>
        <Link href="/comparador" className="bg-green-600 text-white px-4 py-2 rounded font-semibold">
          2. Ver Comparador
        </Link>
      </div>
    </div>
  );
}
