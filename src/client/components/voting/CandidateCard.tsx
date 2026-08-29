import { Candidate } from '../../../shared/types.js';
import { CheckCircle2, User } from 'lucide-react';

interface CandidateCardProps {
  key?: string;
  candidate: Candidate;
  onSelect: (candidate: Candidate) => void;
  isSelected?: boolean;
}

export function CandidateCard({ candidate, onSelect, isSelected }: CandidateCardProps) {
  return (
    <div
      onClick={() => onSelect(candidate)}
      className={`group relative rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-xl ${
        isSelected
          ? 'border-emerald-500 ring-4 ring-emerald-500/20 bg-emerald-500/10 -translate-y-1'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 hover:-translate-y-1'
      }`}
    >
      {/* Badge Número de Lista */}
      <div className="absolute top-4 left-4 z-10">
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-black bg-sky-800 text-white shadow-md">
          TARJETÓN #{candidate.list_number}
        </span>
      </div>

      {isSelected && (
        <div className="absolute top-4 right-4 z-10">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow">
            <CheckCircle2 className="w-4 h-4" /> SELECCIONADO
          </span>
        </div>
      )}

      {/* Foto del Candidato */}
      <div className="mt-8 mb-4 relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
        {candidate.photo_url ? (
          <img
            src={candidate.photo_url}
            alt={candidate.full_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <User className="w-16 h-16 stroke-1 mb-2" />
            <span className="text-xs font-medium">Foto oficial</span>
          </div>
        )}
      </div>

      {/* Datos del Candidato */}
      <div className="space-y-2 flex-grow">
        <h3 className="font-bold text-xl text-slate-900 dark:text-white leading-tight">
          {candidate.full_name}
        </h3>
        <p className="text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
          Curso: {candidate.student_course}
        </p>

        {candidate.slogan && (
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
            {candidate.slogan}
          </p>
        )}

        {candidate.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {candidate.description}
          </p>
        )}
      </div>

      {/* Botón táctil */}
      <div className="mt-5">
        <button
          type="button"
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2 ${
            isSelected
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-slate-900 dark:bg-slate-800 group-hover:bg-sky-700 dark:group-hover:bg-sky-600 text-white shadow-md'
          }`}
        >
          {isSelected ? 'Candidato Elegido' : 'Elegir esta Opción'}
        </button>
      </div>
    </div>
  );
}

export function BlankVoteCard({
  onSelect,
  isSelected
}: {
  onSelect: () => void;
  isSelected?: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-xl ${
        isSelected
          ? 'border-slate-800 dark:border-slate-400 ring-4 ring-slate-800/20 bg-slate-200/50 dark:bg-slate-800/50 -translate-y-1'
          : 'bg-white dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-500 hover:-translate-y-1'
      }`}
    >
      <div className="text-center mt-6 mb-4">
        <div className="w-24 h-24 mx-auto bg-slate-100 dark:bg-slate-950 rounded-full flex items-center justify-center border-2 border-slate-300 dark:border-slate-700 text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-800 transition-colors">
          <span className="font-mono text-3xl font-bold">Ø</span>
        </div>
      </div>

      <div className="text-center space-y-2 flex-grow">
        <h3 className="font-bold text-xl text-slate-900 dark:text-white">
          VOTO EN BLANCO
        </h3>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Opción Institucional Oficial
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 italic p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
          Ejerce tu derecho democrático manifestando neutralidad o disconformidad con las propuestas.
        </p>
      </div>

      <div className="mt-5">
        <button
          type="button"
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-base transition-colors ${
            isSelected
              ? 'bg-slate-800 text-white shadow-lg'
              : 'bg-slate-200 dark:bg-slate-800 group-hover:bg-slate-800 dark:group-hover:bg-slate-700 group-hover:text-white text-slate-700 dark:text-slate-300'
          }`}
        >
          {isSelected ? 'Voto en Blanco Marcado' : 'Votar en Blanco'}
        </button>
      </div>
    </div>
  );
}

