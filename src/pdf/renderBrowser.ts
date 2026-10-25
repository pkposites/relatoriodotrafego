import type { TDocumentDefinitions } from 'pdfmake/interfaces';

/** Download do PDF no navegador. pdfmake e fontes só carregam quando chamados. */
export async function downloadPdf(doc: TDocumentDefinitions, filename: string) {
  const [{ default: pdfMake }, fonts] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]);
  const vfs = (fonts as unknown as { default?: Record<string, string> }).default ?? (fonts as unknown as Record<string, string>);
  (pdfMake as unknown as { vfs: Record<string, string> }).vfs = (vfs as { pdfMake?: { vfs: Record<string, string> } }).pdfMake?.vfs ?? vfs;
  (pdfMake as unknown as { fonts: unknown }).fonts = {
    Roboto: { normal: 'Roboto-Regular.ttf', bold: 'Roboto-Medium.ttf', italics: 'Roboto-Italic.ttf', bolditalics: 'Roboto-MediumItalic.ttf' },
  };
  pdfMake.createPdf(doc).download(filename);
}
