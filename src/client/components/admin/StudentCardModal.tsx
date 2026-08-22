import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Student } from '../../../shared/types.js';
import { Download, Printer, ShieldCheck, X } from 'lucide-react';

interface StudentCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: (Student & { signed_qr_payload?: string }) | null;
  schoolName?: string;
}

export function StudentCardModal({ isOpen, onClose, student, schoolName }: StudentCardModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!student || !isOpen) return;

    // Codifica directamente el código del estudiante para coincidir con los carnets físicos existentes
    const payload = student.student_code.trim();
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 250,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating QR:', err));
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 print:shadow-none print:border-none">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-base">Carnet Electoral Estudiantil</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tarjeta de Carnet Físico Imprimible */}
        <div className="p-6">
          <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-sky-800/40 relative overflow-hidden">
            {/* Cabecera institucional */}
            <div className="flex items-center justify-between border-b border-sky-800/50 pb-3 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-sky-300">
                  {schoolName || 'COLEGIO BILINGÜE SAN PATRICIO'}
                </span>
                <h4 className="text-sm font-black text-white">CARNET DE VOTACIÓN 2026</h4>
              </div>
              <span className="bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[10px] font-black px-2 py-0.5 rounded">
                OFICIAL
              </span>
            </div>

            {/* Contenido QR y Datos */}
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="bg-white p-2.5 rounded-xl shadow-inner flex-shrink-0">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR del Carnet" className="w-32 h-32" />
                ) : (
                  <div className="w-32 h-32 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                    Generando QR...
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-center sm:text-left flex-grow">
                <div>
                  <span className="text-[10px] text-sky-300 font-semibold uppercase">Estudiante</span>
                  <p className="text-base font-bold text-white leading-tight">{student.full_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-sky-300 font-semibold uppercase">Código ID</span>
                    <p className="font-mono text-xs font-bold text-sky-100">{student.student_code}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-sky-300 font-semibold uppercase">Curso / Grado</span>
                    <p className="text-xs font-bold text-sky-100">{student.course} (Grado {student.grade})</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="inline-block text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                    ✓ CÓDIGO QR INSTITUCIONAL
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-sky-800/40 text-[9px] text-sky-300/80 text-center">
              Presenta este código en la estación de votación táctil. Este carnet es personal e intransferible.
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="mt-6 flex items-center justify-end gap-3 print:hidden">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir Carnet
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
