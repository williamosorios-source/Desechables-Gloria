import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as XLSX from 'xlsx';

// Instanciamos el cliente especificando la versión de API 'v1' estable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
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

    let partesPrompt: any[] = [];

    // 1. EXTRAER CONTENIDO SEGÚN EL TIPO DE ARCHIVO (PDF, Imagen, Excel, TXT)
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let contenidoExcel = '';
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        contenidoExcel += XLSX.utils.sheet_to_csv(sheet) + '\n';
      });

      partesPrompt.push(
        `CONTENIDO EXTRAÍDO DEL EXCEL:\n"""\n${contenidoExcel}\n"""`
      );
    } else if (
      mimeType.startsWith('image/') ||
      mimeType === 'application/pdf'
    ) {
      partesPrompt.push({
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: mimeType === 'application/pdf' ? 'application/pdf' : mimeType,
        },
      });
    } else {
      partesPrompt.push(
        `TEXTO DEL DOCUMENTO:\n"""\n${buffer.toString('utf-8')}\n"""`
      );
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

    partesPrompt.push(instrucciones);

    // 3. REINTENTOS CON MANEJO DE SATURACIÓN (503) Y VERIFICACIÓN DE RESPUESTA
    let responseText = '';
    const maxReintentos = 4;
    let ultimoError: any = null;

    // Forzamos el uso de la versión v1 estable para evitar volatilidades de endpoints v1beta
    const model = genAI.getGenerativeModel(
      { model: 'gemini-3.8-flash' },
      { apiVersion: 'v1' }
    );

    for (let i = 0; i < maxReintentos; i++) {
      try {
        const result = await model.generateContent(partesPrompt);
        responseText = result.response.text();
        if (responseText) break;
      } catch (err: any) {
        console.warn(`Intento ${i + 1} en gemini-3.8-flash presentó saturación. Pausando...`, err);
        ultimoError = err;
        // Pausa incremental con tiempos de espera progresivos (3s, 6s, 9s, 12s)
        await new Promise((resolve) => setTimeout(resolve, (i + 1) * 3000));
      }
    }

    if (!responseText) {
      throw (
        ultimoError ||
        new Error(
          'Los servidores de Google se encuentran momentáneamente saturados. Por favor presiona el botón de procesar nuevamente.'
        )
      );
    }

    // 4. LIMPIEZA Y DEVOLUCIÓN DE DATOS EN FORMATO JSON
    const jsonLimpio = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const resultadoFinal = JSON.parse(jsonLimpio);

    return NextResponse.json(resultadoFinal);
  } catch (error: any) {
    console.error('Error procesando archivo:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar el archivo adjunto' },
      { status: 500 }
    );
  }
}
