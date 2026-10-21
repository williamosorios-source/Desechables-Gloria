import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

Responde ÚNICAMENTE en JSON con este formato exacto:
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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const resultado = JSON.parse(response.choices[0].message.content || '{}');
    return NextResponse.json(resultado);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
