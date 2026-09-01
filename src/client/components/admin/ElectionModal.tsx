import { useState, useEffect, FormEvent } from 'react';
import { Election, ElectionStatus } from '../../../shared/types.js';
import { X, Calendar, Check, AlertCircle, RefreshCw, Vote, Eye, Layers, Clock, Sparkles } from 'lucide-react';

interface ElectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (electionData: Partial<Election>) => Promise<void>;
  election?: Election | null;
}

function toDatetimeLocal(isoStr?: string | null, defaultHour = 8): string {
  if (!isoStr) {
    const d = new Date();
    d.setHours(defaultHour, 0, 0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  }
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) {
      const now = new Date();
      now.setHours(defaultHour, 0, 0, 0);
      return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  } catch {
    const now = new Date();
    now.setHours(defaultHour, 0, 0, 0);
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
}

function fromDatetimeLocalToISO(localStr: string): string {
  if (!localStr) return new Date().toISOString();
  const d = new Date(localStr);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

export function ElectionModal({
  isOpen,
  onClose,
  onSave,
  election
}: ElectionModalProps) {
  const isEditing = Boolean(election);

  const currentYear = new Date().getFullYear();
  const defaultYearString = `${currentYear}-${currentYear + 1}`;

  const [name, setName] = useState('');
  const [year, setYear] = useState(defaultYearString);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ElectionStatus>('DRAFT');
  const [startAt, setStartAt] = useState(() => toDatetimeLocal(null, 8));
  const [endAt, setEndAt] = useState(() => toDatetimeLocal(null, 15));
  const [allowBlankVote, setAllowBlankVote] = useState(true);
  const [showLiveResults, setShowLiveResults] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (election) {
        setName(election.name || '');
        setYear(String(election.year || defaultYearString));
        setDescription(election.description || '');
        setStatus(election.status || 'DRAFT');
        setStartAt(toDatetimeLocal(election.start_at, 8));
        setEndAt(toDatetimeLocal(election.end_at, 15));
        setAllowBlankVote(election.allow_blank_vote !== 0);
        setShowLiveResults(election.show_live_results !== 0);
      } else {
        setName(`Elección de Personero Estudiantil ${defaultYearString}`);
        setYear(defaultYearString);
        setDescription('Jornada democrática institucional para la elección de personería estudiantil.');
        setStatus('OPEN');
        setStartAt(toDatetimeLocal(null, 8));
        setEndAt(toDatetimeLocal(null, 15));
        setAllowBlankVote(true);
        setShowLiveResults(true);
      }
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, election]);

  if (!isOpen) return null;

  // Presets rápidos de fecha y hora
  const setPreset = (daysFromNow: number, startH: number, endH: number) => {
    const dStart = new Date();
    dStart.setDate(dStart.getDate() + daysFromNow);
    dStart.setHours(startH, 0, 0, 0);

    const dEnd = new Date();
    dEnd.setDate(dEnd.getDate() + daysFromNow);
    dEnd.setHours(endH, 0, 0, 0);

    const tzStart = dStart.getTimezoneOffset() * 60000;
    const tzEnd = dEnd.getTimezoneOffset() * 60000;

    setStartAt(new Date(dStart.getTime() - tzStart).toISOString().slice(0, 16));
    setEndAt(new Date(dEnd.getTime() - tzEnd).toISOString().slice(0, 16));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre de la jornada electoral es obligatorio.');
      return;
    }
    const cleanYear = year.trim();
    if (!cleanYear) {
      setError('Por favor ingresa un año lectivo válido (ej. 2026-2027).');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await onSave({
        name: name.trim(),
        year: cleanYear,
        description: description.trim(),
        status,
        start_at: fromDatetimeLocalToISO(startAt),
        end_at: fromDatetimeLocalToISO(endAt),
        allow_blank_vote: allowBlankVote ? 1 : 0,
        show_live_results: showLiveResults ? 1 : 0
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la elección.';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                {isEditing ? 'Editar Jornada Electoral' : 'Crear Nueva Jornada Electoral'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing ? 'Modifica los parámetros y la fecha programada del proceso electoral' : 'Define el nombre, fecha, año y reglas del tarjetón oficial'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nombre de la Elección *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Elecciones de Personero Estudiantil 2026"
              className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Año Lectivo (Calendario B) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Año Lectivo (Calendario B) *
                </label>
                <span className="text-[10px] text-blue-600 font-semibold">Ej. 2026-2027</span>
              </div>
              <input
                type="text"
                required
                placeholder="2026-2027"
                value={year}
                onChange={e => setYear(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-all outline-none font-mono"
              />
              <div className="flex gap-1.5 mt-1.5">
                {[`${currentYear}-${currentYear + 1}`, `${currentYear - 1}-${currentYear}`, `${currentYear + 1}-${currentYear + 2}`].map(yPreset => (
                  <button
                    key={yPreset}
                    type="button"
                    onClick={() => setYear(yPreset)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                      year === yPreset
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                    }`}
                  >
                    {yPreset}
                  </button>
                ))}
              </div>
            </div>

            {/* Estado de la Jornada */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Estado de la Jornada *
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ElectionStatus)}
                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all outline-none ${
                  status === 'SCHEDULED'
                    ? 'bg-sky-50 border-sky-500 text-sky-900 focus:ring-2 focus:ring-sky-500/20'
                    : status === 'OPEN'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 focus:ring-2 focus:ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-600'
                }`}
              >
                <option value="SCHEDULED">🔵 PROGRAMADA (Apertura con fecha/hora)</option>
                <option value="OPEN">🟢 ABIERTA (Votación Habilitada Inmediata)</option>
                <option value="DRAFT">🟡 BORRADOR (En Configuración)</option>
                <option value="CLOSED">🔴 CERRADA (Mesas Finalizadas)</option>
              </select>
            </div>
          </div>

          {/* ===================================================================
             SECCIÓN DE PROGRAMACIÓN DE FECHA Y HORARIO
             =================================================================== */}
          <div className={`p-4 rounded-2xl border transition-all space-y-3 ${
            status === 'SCHEDULED'
              ? 'bg-gradient-to-br from-sky-50 to-indigo-50/50 border-sky-300 shadow-sm'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${status === 'SCHEDULED' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    Fecha y Horario de la Elección
                    {status === 'SCHEDULED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-500 text-white uppercase tracking-wider">
                        Requerido para Programada
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Define cuándo iniciará y finalizará la jornada democrática.
                  </p>
                </div>
              </div>
            </div>

            {/* Presets Rápidos */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Atajos:</span>
              <button
                type="button"
                onClick={() => setPreset(0, 8, 15)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                Hoy 8:00 AM - 3:00 PM
              </button>
              <button
                type="button"
                onClick={() => setPreset(1, 8, 15)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                Mañana 8:00 AM - 3:00 PM
              </button>
              <button
                type="button"
                onClick={() => setPreset(7, 8, 15)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                En 1 Semana
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Fecha y Hora de Apertura */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  Fecha y Hora de Apertura (Inicio) *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startAt}
                  onChange={e => setStartAt(e.target.value)}
                  className="w-full bg-white border border-slate-300 focus:border-sky-600 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 transition-all outline-none font-mono"
                />
              </div>

              {/* Fecha y Hora de Cierre */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Fecha y Hora de Cierre (Finalización) *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={endAt}
                  onChange={e => setEndAt(e.target.value)}
                  className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 transition-all outline-none font-mono"
                />
              </div>
            </div>

            {status === 'SCHEDULED' && (
              <div className="p-2.5 rounded-xl bg-sky-100/80 border border-sky-200 text-sky-900 text-[11px] flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-sky-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Visible en Estación:</strong> La fecha de inicio ({new Date(startAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}) se mostrará en el banner principal de la pantalla de votación (<code>VotingStationPage</code>) y en la pantalla de resultados públicos.
                </span>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Descripción / Objetivo
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalles sobre el proceso de elección..."
              className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-800 transition-all outline-none resize-none"
            />
          </div>

          {/* Opciones Electorales */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              Configuraciones del Tarjetón y Escrutinio
            </h4>

            <label className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={allowBlankVote}
                onChange={e => setAllowBlankVote(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Vote className="w-3.5 h-3.5 text-slate-600" />
                  Incluir casilla de Voto en Blanco
                </span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Muestra la opción de Voto en Blanco en la urna electrónica conforme al reglamento electoral.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={showLiveResults}
                onChange={e => setShowLiveResults(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  Permitir visualización de resultados en vivo
                </span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Permite transmitir el escrutinio en tiempo real en la pantalla pública institucional.
                </p>
              </div>
            </label>
          </div>

          {/* Botones de Acción */}
          <div className="pt-4 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isEditing ? 'Guardar Cambios' : 'Crear Elección'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
