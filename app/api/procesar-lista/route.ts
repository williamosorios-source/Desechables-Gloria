import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as XLSX from 'xlsx';

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

    // 1. PROCESAMIENTO Y LECTURA SEGÚN EL TIPO DE ARCHIVO
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Procesa hojas de cálculo convirtiéndolas a texto plano CSV
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
      // Envío de binarios directamente (PDFs o Imágenes PNG/JPG)
      partesPrompt.push({
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: mimeType === 'application/pdf' ? 'application/pdf' : mimeType,
        },
      });
    } else {
      // Para archivos de texto plano (.txt, .csv)
      partesPrompt.push(
        `TEXTO DEL DOCUMENTO:\n"""\n${buffer.toString('utf-8')}\n"""`
      );
    }

    // 2. PROMPT CON REGLAS Y ESTRUCTURA DE SALIDA JSON
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

    // 3. ESTRATEGIA DE REINTENTO Y FALLBACK ANTE SATURACIÓN DE MODELOS
    let result = null;
    const listaModelos = [
      'gemini-1.5-flash',
      'gemini-2.5-flash',
      'gemini-3.8-flash',
      'gemini-1.5-pro',
    ];
    let ultimoError = null;

    for (const nombreModelo of listaModelos) {
      try {
        const model = genAI.getGenerativeModel({ model: nombreModelo });
        result = await model.generateContent(partesPrompt);
        if (result) break; // Si responde con éxito, salimos del bucle
      } catch (err: any) {
        console.warn(
          `El modelo ${nombreModelo} presentó fallos o alta demanda. Reintentando con siguiente modelo...`
        );
        ultimoError = err;
      }
    }

    if (!result) {
      throw (
        ultimoError ||
        new Error(
          'Los modelos de procesamiento están experimentando alta demanda. Intenta nuevamente en unos instantes.'
        )
      );
    }

    // 4. LIMPIEZA Y DEVOLUCIÓN DE LA RESPUESTA
    const responseText = result.response.text();
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
