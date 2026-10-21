import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Falta la variable de entorno GEMINI_API_KEY en Vercel' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('archivo') as File;
    const catalogoMaestroStr = formData.get('catalogoMaestro') as string;
    const catalogoMaestro = JSON.parse(catalogoMaestroStr || '[]');

    if (!file) {
      return NextResponse.json(
        { error: 'No se subió ningún archivo' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;
    const fileName = file.name.toLowerCase();

    let parts: any[] = [];

    // 1. EXTRAER CONTENIDO DEL ARCHIVO (Excel, PDF, Imagen, TXT)
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let contenidoExcel = '';
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        contenidoExcel += XLSX.utils.sheet_to_csv(sheet) + '\n';
      });

      parts.push({
        text: `CONTENIDO EXTRAÍDO DEL EXCEL:\n"""\n${contenidoExcel}\n"""`
      });
    } else if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
      parts.push({
        inline_data: {
          mime_type: mimeType === 'application/pdf' ? 'application/pdf' : mimeType,
          data: buffer.toString('base64'),
        },
      });
    } else {
      parts.push({
        text: `TEXTO DEL DOCUMENTO:\n"""\n${buffer.toString('utf-8')}\n"""`
      });
    }

    // 2. INSTRUCCIONES DE ESTANDARIZACIÓN
    const instrucciones = `
Analiza la lista de productos y precios adjunta en este documento o imagen.

CATÁLOGO MAESTRO EXISTENTE:
${JSON.stringify(catalogoMaestro, null, 2)}

INSTRUCCIONES DE ESTANDARIZACIÓN:
1. Extrae todos los productos con sus respectivos precios numéricos.
2. Compara cada producto extraído con el CATÁLOGO MAESTRO.
3. Si el producto coincide con alguno del catálogo, asigna su "catalogo_id".
4. Si NO coincide, asigna "catalogo_id" como null y provee un nombre limpio en "nombre_estandarizado_sugerido".

Responde ÚNICAMENTE con un objeto JSON válido (sin formato markdown ni bloques \`\`\`json):
{
  "productos": [
    {
      "nombre_original": "nombre exacto detectado en el archivo",
      "precio": 1234.56,
      "catalogo_id": "string o null",
      "nombre_estandarizado_sugerido": "nombre limpio y estándar"
    }
  ]
}
`;

    parts.push({ text: instrucciones });

    // 3. PETICIÓN HTTP DIRECTA AL MODELO gemini-3.8-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Error directo de Google API:', data);
      throw new Error(data?.error?.message || `Error ${res.status}: Fallo en la API de Gemini`);
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('Google Gemini no devolvió texto en la respuesta.');
    }

    // 4. PARSEO DE RESULTADOS
    const jsonLimpio = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const resultadoFinal = JSON.parse(jsonLimpio);

    return NextResponse.json(resultadoFinal);

  } catch (error: any) {
    console.error('Error en procesar-lista:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno procesando el archivo' },
      { status: 500 }
    );
  }
}
