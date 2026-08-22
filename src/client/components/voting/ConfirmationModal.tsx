import { Candidate } from '../../../shared/types.js';
import { Check, ShieldCheck, Undo2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  candidate: Candidate | null;
  isBlank: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ConfirmationModal({
  isOpen,
  candidate,
  isBlank,
  onConfirm,
  onCancel,
  isSubmitting
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-sky-900 to-indigo-900 text-white p-6 text-center relative">
          <div className="w-12 h-12 mx-auto mb-2 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <ShieldCheck className="w-7 h-7 text-sky-300" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Confirmación de Voto</h2>
          <p className="text-sky-200 text-xs mt-1">Por favor verifica cuidadosamente tu selección antes de emitir tu voto definitivo.</p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Has seleccionado:
            </p>

            {isBlank ? (
              <div className="py-3">
                <div className="inline-block px-4 py-1.5 rounded-full bg-slate-800 text-white font-bold text-sm mb-2">
                  OPCIÓN NEUTRAL
                </div>
                <h3 className="text-2xl font-black text-slate-900">VOTO EN BLANCO</h3>
                <p className="text-xs text-slate-500 mt-1">Tu voto será computado en el censo oficial como voto en blanco.</p>
              </div>
            ) : candidate ? (
              <div className="flex flex-col items-center py-2">
                {candidate.photo_url && (
                  <img
                    src={candidate.photo_url}
                    alt={candidate.full_name}
                    className="w-24 h-24 object-cover rounded-2xl border-2 border-sky-600 shadow-md mb-3"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="inline-block px-3 py-1 rounded-full bg-sky-900 text-white font-black text-xs mb-1 shadow-sm">
                  LISTA #{candidate.list_number}
                </span>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">
                  {candidate.full_name}
                </h3>
                <p className="text-sm font-semibold text-sky-700 mt-1">
                  Curso: {candidate.student_course}
                </p>
                {candidate.slogan && (
                  <p className="text-xs italic text-slate-600 mt-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    {candidate.slogan}
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <span>
              <strong>Recuerda:</strong> Tu voto es 100% secreto e irreversible. Una vez confirmado, no podrás volver a votar en esta elección.
            </span>
          </div>

          {/* Botones de acción táctiles grandes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onCancel}
              className="w-full py-4 px-4 rounded-xl border-2 border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-bold text-base transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Undo2 className="w-5 h-5" />
              Cambiar Elección
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={onConfirm}
              className="w-full py-4 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-base transition-all shadow-lg hover:shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Registrando Voto...</span>
              ) : (
                <>
                  <Check className="w-6 h-6 stroke-[3]" />
                  CONFIRMAR VOTO
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
