import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css'; // <-- ESTA LÍNEA ES INDISPENSABLE

export const metadata: Metadata = {
  title: 'Cotizador & Comparador Inteligente',
  description: 'Sistema de estandarización de precios con IA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans antialiased">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-xl font-bold text-lg shadow-blue-200 shadow-md">
                📊
              </div>
              <span className="font-bold text-slate-800 text-lg tracking-tight">
                PriceMatch <span className="text-blue-600 font-normal">AI</span>
              </span>
            </div>
            
            <nav className="flex gap-2">
              <Link
                href="/cargar"
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-all"
              >
                1. Cargar Listas
              </Link>
              <Link
                href="/comparador"
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-all"
              >
                2. Comparador
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
