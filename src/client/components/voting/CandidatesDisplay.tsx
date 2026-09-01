import React, { useState, useEffect, useCallback } from 'react';
import { Candidate } from '../../../shared/types.js';
import { votingApi } from '../../services/api.js';
import { useTheme } from '../../hooks/useTheme.js';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Info,
  Layers,
  Quote,
  RefreshCw,
  Sparkles,
  User,
  X
} from 'lucide-react';

export interface CandidatesDisplayProps {
  electionId?: string;
  initialCandidates?: Candidate[];
  onSelectCandidate?: (candidate: Candidate) => void;
  className?: string;
  showTitle?: boolean;
}

export function CandidatesDisplay({
  electionId,
  initialCandidates,
  className = '',
  showTitle = true
}: CandidatesDisplayProps) {
  const { isDark } = useTheme();
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates || []);
  const [loading, setLoading] = useState(!initialCandidates || initialCandidates.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [selectedForModal, setSelectedForModal] = useState<Candidate | null>(null);

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await votingApi.getCandidates(electionId);
      if (res.success && res.candidates) {
        setCandidates(res.candidates);
      } else {
        setCandidates([]);
      }
    } catch (err) {
      console.error('Error fetching candidates for display:', err);
      setError('No se pudieron cargar los candidatos desde la base de datos.');
    } finally {
      setLoading(false);
    }
  }, [electionId]);

  useEffect(() => {
    if (!initialCandidates || initialCandidates.length === 0) {
      fetchCandidates();
    } else {
      setCandidates(initialCandidates);
      setLoading(false);
    }
  }, [electionId, initialCandidates, fetchCandidates]);

  return (
    <div className={`w-full ${className}`}>
      {/* Encabezado del Bloque */}
      {showTitle && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                isDark
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'bg-sky-100 text-sky-800 border border-sky-200'
              }`}>
                <Award className="w-3.5 h-3.5" /> Tarjetón Oficial
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
              }`}>
                {candidates.length} {candidates.length === 1 ? 'Candidato' : 'Candidatos'}
              </span>
            </div>
            <h3 className={`text-xl sm:text-2xl font-black tracking-tight mt-1.5 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Candidatos a la Personería Estudiantil
            </h3>
            <p className={`text-xs sm:text-sm ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Conoce las propuestas, el lema y el número de lista de cada candidato antes de ingresar a votar.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchCandidates}
            className={`self-start sm:self-auto p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-300 shadow-sm'
            }`}
            title="Actualizar lista de candidatos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-500' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      )}

      {/* Estado de Carga */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`rounded-2xl p-5 border animate-pulse space-y-4 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                <div className="space-y-2 flex-grow">
                  <div className={`h-4 w-3/4 rounded ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                  <div className={`h-3 w-1/2 rounded ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                </div>
              </div>
              <div className={`h-12 w-full rounded-xl ${isDark ? 'bg-slate-800/80' : 'bg-slate-100'}`} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={`p-4 rounded-2xl border text-center ${
          isDark ? 'bg-rose-950/40 border-rose-800/50 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <p className="text-xs font-bold">{error}</p>
          <button
            onClick={fetchCandidates}
            className="mt-2 px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700"
          >
            Reintentar
          </button>
        </div>
      ) : candidates.length === 0 ? (
        <div className={`rounded-2xl p-8 border text-center space-y-3 ${
          isDark ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
        }`}>
          <Layers className="w-10 h-10 mx-auto opacity-40 text-sky-500" />
          <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            No hay candidatos registrados
          </h4>
          <p className="text-xs max-w-sm mx-auto">
            El administrador o jurado electoral aún no ha configurado candidatos para la elección actual.
          </p>
        </div>
      ) : (
        /* Cuadrícula Visual de Candidatos */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {candidates.map((cand) => (
            <div
              key={cand.id}
              className={`group relative rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 ${
                isDark
                  ? 'bg-slate-900 border-slate-800 hover:border-sky-500/50 hover:bg-slate-900/90'
                  : 'bg-white border-slate-200 hover:border-sky-400 hover:bg-sky-50/20'
              }`}
            >
              {/* Badge Número de Tarjetón */}
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md">
                  <Sparkles className="w-3 h-3 text-sky-200" />
                  TARJETÓN #{cand.list_number}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}>
                  Curso {cand.student_course}
                </span>
              </div>

              {/* Foto y Nombre */}
              <div className="flex items-start gap-4 mb-3">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 shadow-inner relative flex items-center justify-center ${
                  isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-100 border-slate-300'
                }`}>
                  {cand.photo_url ? (
                    <img
                      src={cand.photo_url}
                      alt={cand.full_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <User className="w-8 h-8 opacity-60" />
                    </div>
                  )}
                </div>

                <div className="flex-grow min-w-0">
                  <h4 className={`text-base sm:text-lg font-black leading-snug truncate ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`} title={cand.full_name}>
                    {cand.full_name}
                  </h4>
                  <p className={`text-xs font-bold uppercase tracking-wider mt-0.5 ${
                    isDark ? 'text-sky-400' : 'text-sky-700'
                  }`}>
                    Candidato(a) a Personero
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-500 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Inscripción Oficial</span>
                  </div>
                </div>
              </div>

              {/* Slogan de Campaña */}
              {cand.slogan && (
                <div className={`mb-3 p-3 rounded-2xl border flex items-start gap-2 text-xs italic ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <Quote className="w-3.5 h-3.5 text-sky-500 flex-shrink-0 mt-0.5" />
                  <p className="line-clamp-2">"{cand.slogan}"</p>
                </div>
              )}

              {/* Breve descripción o propuesta */}
              {cand.description && (
                <p className={`text-xs line-clamp-2 mb-4 ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {cand.description}
                </p>
              )}

              {/* Botón para ver detalles / propuestas completas */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-auto">
                <button
                  type="button"
                  onClick={() => setSelectedForModal(cand)}
                  className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white'
                      : 'bg-slate-100 hover:bg-sky-600 text-slate-800 hover:text-white shadow-xs'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Ver Propuestas y Perfil</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Informativo Detallado del Candidato */}
      {selectedForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-sky-800 to-indigo-900 text-white p-6 relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs uppercase font-black tracking-widest text-sky-300">
                    Ficha de Candidatura
                  </span>
                  <h3 className="text-xl font-black">Tarjetón #{selectedForModal.list_number}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedForModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center gap-4">
                <div className={`w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 shadow-md ${
                  isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-100 border-slate-300'
                }`}>
                  {selectedForModal.photo_url ? (
                    <img
                      src={selectedForModal.photo_url}
                      alt={selectedForModal.full_name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <User className="w-10 h-10 opacity-60" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {selectedForModal.full_name}
                  </h4>
                  <p className="text-xs font-bold text-sky-500 uppercase tracking-wider mt-0.5">
                    Curso: {selectedForModal.student_course}
                  </p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                    Tarjetón Oficial #{selectedForModal.list_number}
                  </span>
                </div>
              </div>

              {selectedForModal.slogan && (
                <div className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[11px] font-bold text-sky-500 uppercase tracking-wider block mb-1">
                    Lema de Campaña
                  </span>
                  <p className={`text-sm italic font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    "{selectedForModal.slogan}"
                  </p>
                </div>
              )}

              {selectedForModal.description ? (
                <div className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                }`}>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Propuestas & Compromisos
                  </span>
                  <div className={`text-xs sm:text-sm whitespace-pre-line leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    {selectedForModal.description}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  Sin descripción adicional registrada en la plataforma.
                </div>
              )}

              <div className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs ${
                isDark ? 'bg-sky-950/30 border-sky-800/40 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-800'
              }`}>
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>
                  Para votar por este u otro candidato, escanea tu código QR o escribe tu código estudiantil.
                </span>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className={`p-4 border-t flex justify-end ${
              isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => setSelectedForModal(null)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
