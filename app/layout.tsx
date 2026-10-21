import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Comparador de Precios',
  description: 'Sistema de estandarización y comparación de precios',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-white text-black min-h-screen">
        {children}
      </body>
    </html>
  );
}
