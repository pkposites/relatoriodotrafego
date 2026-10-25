import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { createRequire } from 'node:module';

/** Renderização no servidor (funções Netlify e scripts). Fontes Roboto embutidas → acentos corretos e texto selecionável. */
const require = createRequire(import.meta.url);

export async function renderPdfNode(doc: TDocumentDefinitions): Promise<Buffer> {
  const PdfPrinter = require('pdfmake');
  const vfs: Record<string, string> = require('pdfmake/build/vfs_fonts.js');
  const font = (name: string) => Buffer.from(vfs[name], 'base64');
  const printer = new PdfPrinter({
    Roboto: { normal: font('Roboto-Regular.ttf'), bold: font('Roboto-Medium.ttf'), italics: font('Roboto-Italic.ttf'), bolditalics: font('Roboto-MediumItalic.ttf') },
  });
  const pdf = printer.createPdfKitDocument(doc);
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    pdf.on('data', (c: Buffer) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
    pdf.end();
  });
}
