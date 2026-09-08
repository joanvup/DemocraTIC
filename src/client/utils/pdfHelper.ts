/**
 * Helper para abrir y visualizar documentos PDF (Data URL base64 o URLs web normales)
 * de forma segura y compatible con todos los navegadores modernos.
 */
export function openPdfDocument(pdfUrl: string, title = 'Propuestas del Candidato') {
  if (!pdfUrl) return;

  try {
    if (pdfUrl.startsWith('data:application/pdf;base64,')) {
      const base64Data = pdfUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (win) {
        win.document.title = title;
      }
    } else {
      window.open(pdfUrl, '_blank');
    }
  } catch (err) {
    console.error('Error al abrir visor PDF:', err);
    window.open(pdfUrl, '_blank');
  }
}
