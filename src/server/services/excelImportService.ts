import * as XLSX from 'xlsx';
import { IStudentRepository } from '../repositories/interfaces.js';
import { Student } from '../../shared/types.js';

export interface ColumnMapping {
  codeCol: string;
  nameCol: string;
  gradeCol: string;
  courseCol: string;
  statusCol?: string;
}

export interface ImportPreviewItem {
  rowNumber: number;
  studentCode: string;
  fullName: string;
  grade: string;
  course: string;
  status: string;
  isValid: boolean;
  errors: string[];
}

export interface ImportAnalysisResult {
  fileName: string;
  sheetNames: string[];
  totalRows: number;
  headers: string[];
  sampleRows: Record<string, string | number>[];
  suggestedMapping: ColumnMapping;
}

export class ExcelImportService {
  constructor(private studentRepo: IStudentRepository) {}

  /**
   * Analiza un archivo Excel/CSV y extrae columnas y filas de muestra
   */
  analyzeBuffer(fileBuffer: Buffer, fileName: string): ImportAnalysisResult {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0] || 'Sheet1';
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet, { defval: '' });

    if (rawData.length === 0) {
      throw new Error('El archivo no contiene filas con datos legibles.');
    }

    const headers = Object.keys(rawData[0]);

    // Detección automática de columnas
    const suggestedMapping: ColumnMapping = {
      codeCol: headers.find(h => /id|c[oó]digo|identificaci[oó]n|documento|carnet/i.test(h)) || headers[0] || '',
      nameCol: headers.find(h => /nombre|estudiante|alumno|nombres|apellidos/i.test(h)) || headers[1] || '',
      gradeCol: headers.find(h => /grado|nivel|grade/i.test(h)) || headers[2] || '',
      courseCol: headers.find(h => /curso|grupo|secci[oó]n|aula|course/i.test(h)) || headers[3] || '',
      statusCol: headers.find(h => /estado|status|activo/i.test(h)) || ''
    };

    return {
      fileName,
      sheetNames: workbook.SheetNames,
      totalRows: rawData.length,
      headers,
      sampleRows: rawData.slice(0, 10),
      suggestedMapping
    };
  }

  /**
   * Genera una previsualización validada del mapeo antes de insertar
   */
  async previewData(
    fileBuffer: Buffer,
    mapping: ColumnMapping,
    sheetIndex = 0
  ): Promise<{
    items: ImportPreviewItem[];
    validCount: number;
    invalidCount: number;
    duplicateCount: number;
  }> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[sheetIndex] || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet, { defval: '' });

    const seenCodes = new Set<string>();
    const items: ImportPreviewItem[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const errors: string[] = [];

      const rawCode = String(row[mapping.codeCol] || '').trim();
      const rawName = String(row[mapping.nameCol] || '').trim();
      const rawGrade = String(row[mapping.gradeCol] || '').trim();
      const rawCourse = String(row[mapping.courseCol] || '').trim();
      const rawStatus = mapping.statusCol && row[mapping.statusCol]
        ? String(row[mapping.statusCol]).trim()
        : 'ACTIVE';

      if (!rawCode) {
        errors.push('Falta el código/ID del estudiante');
      }

      if (!rawName) {
        errors.push('Falta el nombre completo');
      }

      if (!rawGrade && !rawCourse) {
        errors.push('Debe especificar grado o curso');
      }

      // Duplicados dentro del archivo
      if (rawCode) {
        if (seenCodes.has(rawCode)) {
          errors.push('Código duplicado en este mismo archivo');
          duplicateCount++;
        } else {
          seenCodes.add(rawCode);
        }
      }

      const isValid = errors.length === 0;
      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      const normalizedStatus = /inactivo|inactive|no|0/i.test(rawStatus) ? 'INACTIVE' : 'ACTIVE';

      items.push({
        rowNumber: i + 2, // Fila Excel considerando cabecera
        studentCode: rawCode,
        fullName: rawName,
        grade: rawGrade || (rawCourse.match(/\d+/) ? rawCourse.match(/\d+/)![0] : '1'),
        course: rawCourse || `${rawGrade}A`,
        status: normalizedStatus,
        isValid,
        errors
      });
    }

    return {
      items,
      validCount,
      invalidCount,
      duplicateCount
    };
  }

  /**
   * Ejecuta la importación atómica de estudiantes validados
   */
  async executeImport(
    fileBuffer: Buffer,
    mapping: ColumnMapping,
    sheetIndex = 0
  ): Promise<{ inserted: number; updated: number; total: number }> {
    const preview = await this.previewData(fileBuffer, mapping, sheetIndex);
    const validItems = preview.items.filter(item => item.isValid);

    const studentsToImport: Array<Omit<Student, 'id' | 'created_at' | 'updated_at'>> = validItems.map(item => ({
      student_code: item.studentCode,
      full_name: item.fullName,
      grade: item.grade,
      course: item.course,
      status: item.status as 'ACTIVE' | 'INACTIVE'
    }));

    const result = await this.studentRepo.createBatch(studentsToImport);

    return {
      inserted: result.created,
      updated: result.skipped,
      total: validItems.length
    };
  }
}
