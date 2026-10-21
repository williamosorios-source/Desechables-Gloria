import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { textoDocumento, catalogoMaestro } = await req.json();

    if (!textoDocumento) {
      return NextResponse.json({ error: 'Falta el texto del documento' }, { status: 400 });
    }

    const prompt = `
Analiza la siguiente lista de productos de un proveedor con sus precios.

CATÁLOGO MAESTRO EXISTENTE:
${JSON.stringify(catalogoMaestro, null, 2)}

LISTA DEL PROVEEDOR:
"""
${textoDocumento}
"""

Extrae los productos y sus precios. Si el producto coincide con alguno del CATÁLOGO MAESTRO, asigna su catalogo_id.
Si NO coincide, deja "catalogo_id" como null y da una propuesta en "nombre_estandarizado_sugerido".

Responde ÚNICAMENTE en JSON plano sin formato Markdown ni bloques de código, con este formato exacto:
{
  "productos": [
    {
      "nombre_original": "string",
      "precio": 1234.56,
      "catalogo_id": "string o null",
      "nombre_estandarizado_sugerido": "string"
    }
  ]
}
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Limpieza por si Gemini responde envuelto en markdown json
    const jsonLimpio = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const resultado = JSON.parse(jsonLimpio);

    return NextResponse.json(resultado);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
