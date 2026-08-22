import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { INSTITUTIONAL_LOGO_SVG } from '../assets/institutionalLogo';
import { Election, ElectionStats, SchoolSettings } from '../../shared/types';

/**
 * Carga y rasteriza una imagen (URL, SVG o Base64) a un Canvas de alta resolución
 * listo para ser insertado en jsPDF sin problemas de CORS o formato.
 */
async function loadLogoForPdf(logoSrc?: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  const sourcesToTry = [
    logoSrc,
    INSTITUTIONAL_LOGO_SVG,
    '/logo_fcbv.svg',
    'https://colegiobilingue.edu.co/src/assets/images/Logo_FCBV.svg'
  ].filter(Boolean) as string[];

  for (const src of sourcesToTry) {
    try {
      const res = await new Promise<{ dataUrl: string; width: number; height: number } | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const targetW = img.naturalWidth || 300;
            const targetH = img.naturalHeight || 300;
            canvas.width = targetW * 2;
            canvas.height = targetH * 2;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(null);
            
            // Fondo blanco para nitidez
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            resolve({ dataUrl, width: canvas.width, height: canvas.height });
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = src;
      });

      if (res && res.dataUrl) {
        return res;
      }
    } catch {
      // Intentar con la siguiente fuente
    }
  }

  // Fallback: Dibujar escudo institucional vectorial en Canvas
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 400, 400);
      
      // Círculo azul marino
      ctx.fillStyle = '#1E3A8A';
      ctx.beginPath();
      ctx.arc(200, 200, 180, 0, Math.PI * 2);
      ctx.fill();

      // Borde dorado
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#D97706';
      ctx.stroke();

      // Texto institucional
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 50px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FCBV', 200, 215);

      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('COLEGIO BILINGÜE', 200, 260);

      return { dataUrl: canvas.toDataURL('image/png'), width: 400, height: 400 };
    }
  } catch {
    // Si falla el canvas, continuar sin imagen
  }

  return null;
}

export interface GenerateActaOptions {
  election: Election | undefined;
  stats: ElectionStats;
  settings: SchoolSettings | null;
}

/**
 * Genera y descarga el Acta Oficial de Escrutinio Electoral en formato PDF
 * con encabezado institucional, logo oficial, tablas de resultados,
 * estadísticas de participación por curso y campos para firmas oficiales.
 */
export async function generateActaPDF({ election, stats, settings }: GenerateActaOptions): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Cargar el logo institucional
  const logoData = await loadLogoForPdf(settings?.logo_url);

  // 2. Encabezado Institucional
  const headerHeight = 38;
  doc.setFillColor(30, 58, 138); // Azul institucional #1E3A8A
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Franja decorativa dorada inferior
  doc.setFillColor(217, 119, 6); // Dorado #D97706
  doc.rect(0, headerHeight, pageWidth, 2.5, 'F');

  // 3. Renderizar el Logo Institucional en el encabezado
  let textStartX = 14;
  if (logoData && logoData.dataUrl) {
    const logoBoxSize = 28;
    const logoX = 14;
    const logoY = 5;

    // Contenedor blanco con esquinas redondeadas para el logo
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(logoX, logoY, logoBoxSize, logoBoxSize, 3, 3, 'F');
    
    // Insertar imagen del logo centrada en el contenedor
    try {
      doc.addImage(
        logoData.dataUrl,
        'PNG',
        logoX + 1.5,
        logoY + 1.5,
        logoBoxSize - 3,
        logoBoxSize - 3,
        undefined,
        'FAST'
      );
    } catch (e) {
      console.warn('Error al estampar logo en PDF:', e);
    }

    textStartX = logoX + logoBoxSize + 8;
  }

  // 4. Textos del Encabezado
  const schoolName = settings?.school_name || 'FUNDACIÓN COLEGIO BILINGÜE DE VALLEDUPAR';
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName.toUpperCase(), textStartX, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(254, 240, 138); // Amarillo claro
  doc.text('ACTA OFICIAL DE ESCRUTINIO ELECTORAL • ELECCIÓN DE PERSONERO', textStartX, 20);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  const electionName = election?.name || 'Elecciones de Personero Estudiantil 2026';
  const electionYear = election?.year || new Date().getFullYear();
  doc.text(`Proceso: ${electionName} | Año Lectivo: ${electionYear}`, textStartX, 27);

  const nowFormatted = new Date().toLocaleString('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short'
  });
  doc.text(`Fecha y hora de emisión del acta: ${nowFormatted}`, textStartX, 33);

  // 5. SECCIÓN 1: Consolidado General de Votación
  let currentY = headerHeight + 10;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('1. CONSOLIDADO GENERAL DE VOTACIÓN Y CENSO ELECTORAL', 14, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Métrica Electoral Oficial', 'Cifra Registrada']],
    body: [
      ['Censo Electoral Total (Estudiantes Habilitados)', `${stats.total_eligible_students} estudiantes`],
      ['Total Votos Emitidos en Urna Electrónica', `${stats.total_votes_cast} votos`],
      ['Estudiantes Pendientes por Ejercer el Voto', `${stats.total_pending_students} estudiantes`],
      ['Porcentaje Total de Participación Democrática', `${stats.participation_percentage}%`],
      ['Estado de la Jornada Electoral', `${election?.status === 'OPEN' ? 'ABIERTA (EN CURSO)' : election?.status === 'CLOSED' ? 'CERRADA (FINALIZADA)' : 'EN PREPARACIÓN'}`]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [15, 23, 42]
    },
    columnStyles: {
      0: { cellWidth: 130, fontStyle: 'bold' },
      1: { cellWidth: 'auto', halign: 'right' }
    }
  });

  // 6. SECCIÓN 2: Resultados Detallados por Candidato
  const lastY1 = (doc as any).lastAutoTable.finalY || 105;
  currentY = lastY1 + 8;

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. RESULTADOS DETALLADOS DEL ESCRUTINIO POR CANDIDATO', 14, currentY);

  const candidatesTableBody = stats.results.map((r, i) => [
    `${i + 1}º`,
    r.candidate_name,
    r.list_number ? `Lista #${r.list_number}` : 'Voto Institucional',
    `${r.votes_count} votos`,
    `${r.percentage}%`
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Pos.', 'Candidato / Opción', 'Identificación Tarjetón', 'Votos Obtenidos', 'Porcentaje Oficial']],
    body: candidatesTableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [15, 23, 42]
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      1: { fontStyle: 'bold' },
      2: { cellWidth: 42 },
      3: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
    }
  });

  // 7. SECCIÓN 3: Participación por Curso
  const lastY2 = (doc as any).lastAutoTable.finalY || 175;
  currentY = lastY2 + 8;

  // Si queda muy poco espacio para la tabla y las firmas, añadir nueva página
  if (currentY > pageHeight - 90) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. DISPERSIÓN DE PARTICIPACIÓN POR GRADO Y CURSO', 14, currentY);

  const courseTableBody = stats.participation_by_course.map(c => [
    c.grade,
    c.course,
    `${c.total}`,
    `${c.voted}`,
    `${c.pending}`,
    `${c.percentage}%`
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Grado', 'Curso', 'Censo Habilitado', 'Votaron', 'Pendientes', '% Participación']],
    body: courseTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 25, halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' }
    }
  });

  // 8. SECCIÓN 4: Firmas Oficiales de Cierre y Validación
  let lastY3 = (doc as any).lastAutoTable.finalY || 220;
  if (lastY3 > pageHeight - 55) {
    doc.addPage();
    lastY3 = 20;
  }

  const signY = lastY3 + 22;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  // Línea 1: Rectoría
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(20, signY, 85, signY);
  doc.setFont('helvetica', 'bold');
  doc.text('Rectoría / Dirección General', 26, signY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Delegado Comisión Electoral', 29, signY + 9);

  // Línea 2: Jurado / Presidente de Mesa
  doc.line(125, signY, 190, signY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Presidente de Mesa Electoral', 133, signY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Jurado de Votación Escolar', 137, signY + 9);

  // Pie de Página de Seguridad y Auditoría
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const footerText = `Documento oficial emitido por el Sistema de Votación Electrónica Escolar • ${settings?.school_name || 'Colegio Bilingüe'}`;
  doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: 'center' });

  // Descargar el archivo PDF
  const filename = `Acta_Oficial_Escrutinio_${election?.year || 2026}_${(election?.name || 'Personero').replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}
