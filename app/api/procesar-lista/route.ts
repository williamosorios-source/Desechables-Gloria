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
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;
    const fileName = file.name.toLowerCase();

    let partesPrompt: any[] = [];

    // PROCESAMIENTO SEGÚN TIPO DE ARCHIVO
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Si es Excel, convertimos las hojas a texto CSV para Gemini
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let contenidoExcel = '';
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        contenidoExcel += XLSX.utils.sheet_to_csv(sheet) + '\n';
      });

      partesPrompt.push(`CONTENIDO EXTRAÍDO DEL EXCEL:\n"""\n${contenidoExcel}\n"""`);
    } else if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
      // Si es PDF o Imagen, se lo enviamos como archivo binario directo a Gemini
      partesPrompt.push({
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: mimeType === 'application/pdf' ? 'application/pdf' : mimeType,
        },
      });
    } else {
      // Si es TXT u otro formato de texto
      partesPrompt.push(`TEXTO DEL DOCUMENTO:\n"""\n${buffer.toString('utf-8')}\n"""`);
    }

    // PROMPT DE ESTANDARIZACIÓN
    const instucciones = `
Analiza la lista de productos y precios adjunta en este documento o imagen.

CATÁLOGO MAESTRO EXISTENTE:
${JSON.stringify(catalogoMaestro, null, 2)}

INSTRUCCIONES:
1. Extrae todos los productos y sus precios numéricos.
2. Compara cada producto con el CATÁLOGO MAESTRO.
3. Si el producto coincide con uno del catálogo, asigna su "catalogo_id".
4. Si NO coincide, deja "catalogo_id" como null y da una propuesta limpia en "nombre_estandarizado_sugerido".

Responde ÚNICAMENTE en JSON plano válido (sin markdown ni código \`\`\`json) con este formato:
{
  "productos": [
    {
      "nombre_original": "nombre exacto detectado",
      "precio": 1234.56,
      "catalogo_id": "string o null",
      "nombre_estandarizado_sugerido": "nombre limpio y estándar"
    }
  ]
}
`;

    partesPrompt.push(instucciones);

    // Llamada a Gemini 1.5 Flash (soporta imágenes, PDFs y texto)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(partesPrompt);
    const responseText = result.response.text();

    const jsonLimpio = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const resultado = JSON.parse(jsonLimpio);

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('Error procesando archivo:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar el archivo' }, { status: 500 });
  }
}
