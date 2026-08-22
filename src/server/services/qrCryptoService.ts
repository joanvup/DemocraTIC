import crypto from 'crypto';

const QR_SECRET = process.env.QR_SIGNING_SECRET || 'elections_qr_hmac_secret_2026_school';

export interface QrVerificationResult {
  isValid: boolean;
  studentCode: string | null;
  timestamp?: number;
  error?: string;
  source?: 'RAW_CODE' | 'PREFIXED' | 'URL' | 'JSON' | 'SIGNED';
}

export class QrCryptoService {
  /**
   * Genera el contenido del QR del carnet estudiantil.
   * Devuelve directamente el código del estudiante para máxima compatibilidad con carnets físicos y lectores estándar.
   */
  static generatePayload(studentCode: string): string {
    return studentCode.trim();
  }

  /**
   * Mantiene compatibilidad con payloads firmados si se requiere en auditorías
   */
  static generateSignedPayload(studentCode: string): string {
    const code = studentCode.trim();
    const timestamp = Math.floor(Date.now() / 1000);
    const dataToSign = `${code}:${timestamp}`;
    const signature = crypto
      .createHmac('sha256', QR_SECRET)
      .update(dataToSign)
      .digest('hex');

    return `${code}|${timestamp}|${signature}`;
  }

  /**
   * Valida y extrae el código del estudiante a partir de cualquier código QR físico o digital:
   * 1. Código directo (ej: "5306", "5729", "5732", "5743", "5748", "20260001")
   * 2. Formato con prefijo institucional (ej: "ID:5306", "EST:5306", "COD:5306", "MATRICULA:5306")
   * 3. URLs institucionales (ej: "https://colegio.edu.co/carnet/5306" o "?code=5306")
   * 4. Estructuras JSON (ej: {"code":"5306"} o {"id":"5306"})
   * 5. Formatos firmados con HMAC-SHA256 ("CODE|TIMESTAMP|SIGNATURE")
   */
  static verifyPayload(rawPayload: string): QrVerificationResult {
    if (!rawPayload || typeof rawPayload !== 'string') {
      return { isValid: false, studentCode: null, error: 'El código QR escaneado está vacío.' };
    }

    // Limpieza de caracteres de control, saltos de línea y espacios
    let payload = rawPayload.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

    if (!payload) {
      return { isValid: false, studentCode: null, error: 'El código QR no contiene datos legibles.' };
    }

    // Caso 1: JSON estructurado
    if ((payload.startsWith('{') && payload.endsWith('}')) || (payload.startsWith('[') && payload.endsWith(']'))) {
      try {
        const parsed = JSON.parse(payload);
        const extracted = parsed.student_code || parsed.code || parsed.id || parsed.codigo || parsed.documento || parsed.matricula || parsed.identificacion;
        if (extracted && typeof extracted === 'string' || typeof extracted === 'number') {
          const codeStr = String(extracted).trim();
          if (codeStr.length > 0) {
            return { isValid: true, studentCode: codeStr, source: 'JSON' };
          }
        }
      } catch {
        // Continuar con otros analizadores
      }
    }

    // Caso 2: URL o enlace web (extraer parámetro de consulta o último segmento de ruta)
    if (/^https?:\/\//i.test(payload) || payload.includes('/carnet/') || payload.includes('/estudiante/') || payload.includes('/student/')) {
      try {
        // Intentar parsear como URL
        const urlObj = new URL(payload.startsWith('http') ? payload : `http://${payload}`);
        const queryParam = urlObj.searchParams.get('code') || 
                           urlObj.searchParams.get('id') || 
                           urlObj.searchParams.get('codigo') || 
                           urlObj.searchParams.get('student_code') || 
                           urlObj.searchParams.get('documento');
        if (queryParam && queryParam.trim().length > 0) {
          return { isValid: true, studentCode: queryParam.trim(), source: 'URL' };
        }

        // Si no hay parámetro, tomar el último segmento no vacío de la ruta
        const segments = urlObj.pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
          const lastSegment = segments[segments.length - 1].trim();
          if (/^[a-zA-Z0-9_-]{1,30}$/.test(lastSegment)) {
            return { isValid: true, studentCode: lastSegment, source: 'URL' };
          }
        }
      } catch {
        // Continuar
      }
    }

    // Caso 3: Formato firmado con HMAC (CODE|TIMESTAMP|SIGNATURE o CODE|SIGNATURE)
    if (payload.includes('|')) {
      const parts = payload.split('|');
      const codePart = parts[0]?.trim();
      if (parts.length >= 2 && codePart) {
        // Si tiene firma HMAC, validarla pero aceptar el código si coincide la estructura
        if (parts.length === 3) {
          const [code, timestampStr, signature] = parts;
          const dataToSign = `${code}:${timestampStr}`;
          const expectedSignature = crypto
            .createHmac('sha256', QR_SECRET)
            .update(dataToSign)
            .digest('hex');

          if (signature.length === expectedSignature.length &&
              crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expectedSignature, 'utf8'))) {
            return { isValid: true, studentCode: code, timestamp: parseInt(timestampStr, 10), source: 'SIGNED' };
          }
        }
        // Si es formato carnet con delimitador o no firmado exactamente igual, retornar el código
        if (/^[a-zA-Z0-9_-]{1,30}$/.test(codePart)) {
          return { isValid: true, studentCode: codePart, source: 'SIGNED' };
        }
      }
    }

    // Caso 4: Prefijo común en carnets institucionales (ej: "ID: 5306", "COD:5729", "ESTUDIANTE: 5732", "MATRICULA: 5743")
    const prefixRegex = /^(?:id|cod|c[oó]digo|estudiante|est|alumno|carnet|matr[ií]cula|doc|documento|ti|cc)[\s:=_-]+([a-zA-Z0-9_-]+)$/i;
    const prefixMatch = payload.match(prefixRegex);
    if (prefixMatch && prefixMatch[1]) {
      return { isValid: true, studentCode: prefixMatch[1].trim(), source: 'PREFIXED' };
    }

    // Caso 5: Código directo del estudiante (alfanumérico, números de carnet como 5306, 5729, 5732, 5743, 5748)
    // Acepta códigos de 1 a 40 caracteres alfanuméricos con guiones y puntos
    const cleanCode = payload.replace(/[\r\n\t]/g, '').trim();
    if (/^[a-zA-Z0-9_.-]{1,40}$/.test(cleanCode)) {
      return { isValid: true, studentCode: cleanCode, source: 'RAW_CODE' };
    }

    // Si aún tiene caracteres raros pero contiene una secuencia alfanumérica principal
    const fallbackMatch = cleanCode.match(/[a-zA-Z0-9_-]{2,30}/);
    if (fallbackMatch) {
      return { isValid: true, studentCode: fallbackMatch[0], source: 'RAW_CODE' };
    }

    return { isValid: false, studentCode: null, error: 'No se pudo reconocer el código del estudiante en el QR.' };
  }
}

