import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Candidate,
  Election,
  SchoolSettings
} from '../../shared/types.js';
import { votingApi } from '../services/api.js';
import { CandidateCard, BlankVoteCard } from '../components/voting/CandidateCard.js';
import { CandidatesDisplay } from '../components/voting/CandidatesDisplay.js';
import { ConfirmationModal } from '../components/voting/ConfirmationModal.js';
import { QrScannerModal } from '../components/voting/QrScannerModal.js';
import { useTheme } from '../hooks/useTheme.js';
import {
  BarChart3,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Delete,
  Info,
  Lock,
  LogOut,
  Moon,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  UserCheck
} from 'lucide-react';

export function VotingStationPage({
  onNavigateToAdmin,
  onNavigateToPublicResults
}: {
  onNavigateToAdmin: () => void;
  onNavigateToPublicResults?: () => void;
}) {
  const { isDark, toggleTheme } = useTheme();

  // Estado General de la Jornada
  const [election, setElection] = useState<Election | null>(null);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);


  // Flujo de Votación: 'IDENTIFY' | 'SELECT' | 'CONFIRM' | 'SUCCESS'
  const [step, setStep] = useState<'IDENTIFY' | 'SELECT' | 'SUCCESS'>('IDENTIFY');

  // Datos de Identificación
  const [studentCodeInput, setStudentCodeInput] = useState('');
  const [identifying, setIdentifying] = useState(false);
  const [identError, setIdentError] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Sesión de Voto Activa
  const [studentInfo, setStudentInfo] = useState<{ full_name: string; course: string; grade: string } | null>(null);
  const [votingToken, setVotingToken] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [allowBlankVote, setAllowBlankVote] = useState(true);
  const [timeLeft, setTimeLeft] = useState(120);

  // Selección de Candidato
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isBlankSelected, setIsBlankSelected] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isCastingVote, setIsCastingVote] = useState(false);
  const [voteReceipt, setVoteReceipt] = useState<string | null>(null);

  // Reset countdown tras voto exitoso
  const [resetCountdown, setResetCountdown] = useState(6);
  const [isIpRestricted, setIsIpRestricted] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar información de la jornada electoral activa
  const loadActiveElection = useCallback(async () => {
    try {
      setLoading(true);
      const res = await votingApi.getActiveElection() as any;
      if (res.is_ip_restricted) {
        setIsIpRestricted(true);
      } else if (res.success) {
        setElection(res.election);
        setSettings(res.settings);
      }
    } catch (err) {
      console.error('Error cargando jornada electoral:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActiveElection();
  }, [loadActiveElection]);


  if (isIpRestricted) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4">Acceso Denegado</h1>
        <p className="text-lg text-slate-300 max-w-lg mb-8">
          Las votaciones están restringidas por seguridad. <strong>Solo puedes votar conectado a la red Wi-Fi o en los computadores oficiales de la institución.</strong>
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all"
        >
          Reintentar Conexión
        </button>
      </div>
    );
  }

  // Reset total al inicio
  const resetToIdentification = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStep('IDENTIFY');
    setStudentCodeInput('');
    setIdentError(null);
    setStudentInfo(null);
    setVotingToken(null);
    setSelectedCandidate(null);
    setIsBlankSelected(false);
    setIsConfirmModalOpen(false);
    setIsCastingVote(false);
    setVoteReceipt(null);
    setTimeLeft(120);
    setResetCountdown(6);
  }, []);

  // Temporizador de inactividad durante la selección
  useEffect(() => {
    if (step === 'SELECT' && votingToken) {
      setTimeLeft(120);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            resetToIdentification();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, votingToken, resetToIdentification]);

  // Manejo de Identificación
  const handleIdentify = useCallback(async (code?: string, qrPayload?: string) => {
    const targetCode = code || studentCodeInput;
    if (!targetCode && !qrPayload) {
      setIdentError('Por favor ingresa tu código de carnet o escanea el código QR.');
      return;
    }

    try {
      setIdentifying(true);
      setIdentError(null);

      const res = await votingApi.identifyStudent({
        student_code: targetCode ? targetCode.trim() : undefined,
        qr_payload: qrPayload,
        election_id: election?.id
      });

      if (!res.success) {
        setIdentError(res.message || 'No fue posible validar tu identidad.');
        return;
      }

      // Estudiante validado y habilitado
      setStudentInfo(res.student || null);
      setVotingToken(res.voting_token || null);
      setCandidates(res.candidates || []);
      setAllowBlankVote(res.allow_blank_vote ?? true);
      setStep('SELECT');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de comunicación con el servidor.';
      setIdentError(msg);
    } finally {
      setIdentifying(false);
    }
  }, [studentCodeInput, election?.id]);

  // Detección de lector físico USB/Bluetooth de código de barras/QR (pistola óptica)
  useEffect(() => {
    if (step !== 'IDENTIFY' || isQrModalOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está interactuando en otros modales
      if (isConfirmModalOpen) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Si el lector presiona Enter
      if (e.key === 'Enter') {
        if (buffer.length >= 2) {
          const scannedCode = buffer.trim();
          buffer = '';
          setStudentCodeInput(scannedCode);
          handleIdentify(scannedCode);
        }
        return;
      }

      // Si las teclas vienen a alta velocidad (<50ms entre caracteres típicamente en lectores de pistola)
      if (e.key.length === 1) {
        if (timeDiff > 250) {
          buffer = ''; // Reiniciar buffer si fue tipeado manual pausado
        }
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [step, isQrModalOpen, isConfirmModalOpen, handleIdentify]);

  // Selección de Candidato o Voto en Blanco
  const handleSelectCandidate = (cand: Candidate) => {
    setSelectedCandidate(cand);
    setIsBlankSelected(false);
    setIsConfirmModalOpen(true);
  };

  const handleSelectBlank = () => {
    setSelectedCandidate(null);
    setIsBlankSelected(true);
    setIsConfirmModalOpen(true);
  };

  // Emisión Definitiva del Voto
  const handleConfirmVote = async () => {
    if (!votingToken) return;

    try {
      setIsCastingVote(true);
      const res = await votingApi.castVote({
        voting_token: votingToken,
        candidate_id: selectedCandidate ? selectedCandidate.id : null,
        is_blank: isBlankSelected
      });

      if (!res.success) {
        setIdentError(res.message);
        setIsConfirmModalOpen(false);
        setStep('IDENTIFY');
        return;
      }

      setVoteReceipt(res.receipt_id || 'OK');
      setIsConfirmModalOpen(false);
      setStep('SUCCESS');

      // Animación de confeti de celebración democrática
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {}

      // Iniciar cuenta regresiva para reiniciar la estación
      let count = 6;
      const countInterval = setInterval(() => {
        count--;
        setResetCountdown(count);
        if (count <= 0) {
          clearInterval(countInterval);
          resetToIdentification();
        }
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el voto.';
      alert(msg);
      resetToIdentification();
    } finally {
      setIsCastingVote(false);
    }
  };

  // Teclado numérico en pantalla táctil
  const handleKeypadPress = (val: string) => {
    if (studentCodeInput.length < 15) {
      setStudentCodeInput(prev => prev + val);
    }
  };

  const handleKeypadBackspace = () => {
    setStudentCodeInput(prev => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setStudentCodeInput('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-16 h-16 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold">Iniciando Estación de Votación</h2>
        <p className="text-slate-400 text-sm mt-1">Conectando con el servidor electoral...</p>
      </div>
    );
  }

  const isElectionOpen = election && election.status === 'OPEN';
  const isElectionScheduled = election && election.status === 'SCHEDULED';
  const isElectionActiveOrScheduled = isElectionOpen || isElectionScheduled;

  return (
    <div className={`min-h-screen flex flex-col justify-between select-none transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* 1. Barra Superior Institucional */}
      <header className={`px-4 sm:px-6 py-4 flex items-center justify-between shadow-md transition-colors ${
        isDark ? 'bg-slate-900 border-b border-slate-800' : 'bg-white border-b border-slate-200'
      }`}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white flex items-center justify-center p-1 shadow-inner overflow-hidden border border-slate-200 flex-shrink-0">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo Colegio" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-sky-900" />
            )}
          </div>
          <div>
            <h1 className={`font-black text-base sm:text-xl tracking-tight leading-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {settings?.school_name || 'Colegio Bilingüe San Patricio'}
            </h1>
            <p className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
              isDark ? 'text-sky-400' : 'text-sky-700'
            }`}>
              <span>🗳️</span> {election?.name || 'Elecciones de Personería Estudiantil 2026'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Badge de Estado */}
          {isElectionOpen ? (
            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              JORNADA ABIERTA
            </div>
          ) : isElectionScheduled ? (
            <div className="hidden sm:flex items-center gap-2 bg-sky-500/20 text-sky-400 border border-sky-500/30 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              JORNADA PROGRAMADA
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 bg-amber-500/20 text-amber-500 border border-amber-500/30 px-3 py-1.5 rounded-full text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              ELECCIÓN CERRADA
            </div>
          )}

          {/* Enlace Directo a Proyección de Resultados en Vivo */}
          {onNavigateToPublicResults && (
            <button
              onClick={onNavigateToPublicResults}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 active:scale-95 text-white transition-all text-xs font-black flex items-center gap-1.5 shadow-md hover:shadow-sky-500/20 cursor-pointer"
              title="Ver Proyección de Resultados en Vivo"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="inline">Resultados en Vivo</span>
            </button>
          )}

          {/* Conmutador Modo Claro / Modo Oscuro */}
          <button
            onClick={toggleTheme}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 border cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-700" />}
            <span className="hidden md:inline">{isDark ? 'Claro' : 'Oscuro'}</span>
          </button>

          {/* Acceso a Admin */}
          <button
            onClick={onNavigateToAdmin}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl transition-colors text-xs font-bold flex items-center gap-1.5 border cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-300'
            }`}
            title="Panel de Administración"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>
      </header>

      {/* 2. Cuerpo Principal según el Paso */}
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 md:p-8">
        {!isElectionActiveOrScheduled ? (
          /* Estado de Elección No Disponible (Borrador o Finalizada) */
          <div className={`max-w-md w-full rounded-3xl p-8 text-center shadow-2xl space-y-4 border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="w-20 h-20 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-3xl flex items-center justify-center mx-auto">
              <Lock className="w-10 h-10" />
            </div>
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Estación No Disponible</h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              La jornada de votación se encuentra en estado{' '}
              <strong className="text-amber-500 font-bold">{election?.status || 'CERRADA / FINALIZADA'}</strong>.
              El jurado electoral abrirá las mesas en el horario programado.
            </p>
            <div className="pt-2">
              <button
                onClick={loadActiveElection}
                className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 mx-auto cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Actualizar Estado
              </button>
            </div>
          </div>
        ) : step === 'IDENTIFY' ? (
          /* =================================================================
             PASO 1: IDENTIFICACIÓN DEL ESTUDIANTE Y MUESTRA DE CANDIDATOS
             ================================================================= */
          <div className="w-full max-w-7xl space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Columna Izquierda / Panel de Identificación */}
              <div className="lg:col-span-5 w-full">
                <div className={`w-full rounded-3xl p-6 sm:p-8 shadow-2xl border ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="text-center space-y-2 mb-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${
                      isElectionOpen 
                        ? 'bg-sky-500/20 text-sky-500 border-sky-500/30' 
                        : 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                    }`}>
                      {isElectionOpen ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5" /> Identificación del Votante
                        </>
                      ) : (
                        <>
                          <Calendar className="w-3.5 h-3.5" /> Jornada Programada
                        </>
                      )}
                    </span>
                    <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {isElectionOpen ? 'Bienvenido a la Votación' : 'Estación Electoral Preparada'}
                    </h2>
                    <p className={`text-xs sm:text-sm max-w-md mx-auto ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {isElectionOpen 
                        ? 'Escanea el código QR de tu carnet estudiantil o escribe tu código ID para votar.'
                        : 'Esta elección está programada. Conoce aquí los candidatos oficiales antes de la apertura de mesas.'}
                    </p>
                  </div>

                  {/* Banner informativo si la elección está PROGRAMADA */}
                  {isElectionScheduled && (
                    <div className="mb-6 p-4 rounded-2xl bg-sky-950/60 border-2 border-sky-500/40 text-sky-200 flex items-start gap-3 animate-in fade-in">
                      <Info className="w-6 h-6 text-sky-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs sm:text-sm space-y-1">
                        <h4 className="font-bold text-sky-100 flex items-center gap-1.5">
                          Jornada Programada
                        </h4>
                        <p className="text-slate-300">
                          {election?.start_at 
                            ? `Apertura oficial programada para: ${new Date(election.start_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}.`
                            : 'La jornada comenzará en cuanto el jurado electoral active las mesas de votación.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mensaje de Error si ya votó o código no existe */}
                  {identError && (
                    <div className="mb-6 p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-500/50 text-rose-200 flex items-start gap-3 animate-in fade-in">
                      <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm text-rose-100">Atención</h4>
                        <p className="text-xs sm:text-sm mt-0.5">{identError}</p>
                      </div>
                    </div>
                  )}

                  {/* Opciones de Identificación */}
                  <div className="space-y-5">
                    {/* Botón Escanear QR */}
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(true)}
                      className="w-full py-4 sm:py-5 px-6 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-black text-base sm:text-lg shadow-xl hover:shadow-sky-500/20 transition-all flex items-center justify-center gap-3 cursor-pointer group"
                    >
                      <Camera className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      <span>Escanear QR de Carnet</span>
                    </button>

                    <div className="relative flex py-1 items-center">
                      <div className={`flex-grow border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}></div>
                      <span className={`flex-shrink mx-4 text-xs font-bold uppercase tracking-widest ${
                        isDark ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        O escribe tu código ID
                      </span>
                      <div className={`flex-grow border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}></div>
                    </div>

                    {/* Input Código Manual */}
                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type="text"
                          value={studentCodeInput}
                          onChange={e => setStudentCodeInput(e.target.value.toUpperCase())}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleIdentify();
                          }}
                          placeholder="Ej. 5306, 5729, 5732..."
                          className={`w-full text-center text-2xl sm:text-3xl font-mono font-bold tracking-widest py-3.5 px-4 border-2 rounded-2xl focus:outline-none focus:ring-4 transition-all uppercase ${
                            isDark
                              ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus:border-sky-500 focus:ring-sky-500/20'
                              : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:ring-sky-500/20'
                          }`}
                          autoFocus
                        />
                        {studentCodeInput && (
                          <button
                            onClick={handleKeypadClear}
                            className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 ${
                              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                            }`}
                            title="Limpiar"
                          >
                            <Delete className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      {/* Teclado Táctil en Pantalla */}
                      <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(key => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              if (key === 'C') handleKeypadClear();
                              else if (key === '⌫') handleKeypadBackspace();
                              else handleKeypadPress(key);
                            }}
                            className={`py-3 sm:py-3.5 rounded-xl active:scale-95 font-mono font-bold text-base sm:text-lg border shadow-sm transition-all flex items-center justify-center cursor-pointer ${
                              isDark
                                ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700/60'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
                            }`}
                          >
                            {key}
                          </button>
                        ))}
                      </div>

                      {/* Botón Ingresar */}
                      <button
                        type="button"
                        disabled={identifying || !studentCodeInput.trim()}
                        onClick={() => handleIdentify()}
                        className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-base sm:text-lg shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {identifying ? (
                          <span>Verificando Identidad...</span>
                        ) : (
                          <>
                            <UserCheck className="w-5 h-5" />
                            <span>Ingresar a Votar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha / Muestra Visual de Candidatos */}
              <div className="lg:col-span-7 w-full">
                <CandidatesDisplay electionId={election?.id} />
              </div>
            </div>
          </div>
        ) : step === 'SELECT' ? (
          /* =================================================================
             PASO 2: SELECCIÓN DE CANDIDATO EN TARJETÓN ELECTORAL
             ================================================================= */
          <div className="w-full max-w-6xl space-y-6">
            {/* Banner del Votante y Temporizador */}
            <div className={`rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-500 border border-sky-500/30 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs text-sky-500 font-bold uppercase tracking-wider">Estudiante Habilitado</span>
                  <h3 className={`text-xl sm:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {studentInfo?.full_name}
                  </h3>
                  <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Curso: <span className={isDark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>{studentInfo?.course}</span> (Grado {studentInfo?.grade})
                  </p>
                </div>
              </div>

              {/* Temporizador de seguridad */}
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-mono font-bold text-sm ${
                  timeLeft <= 20
                    ? 'bg-rose-500/20 text-rose-500 border-rose-500/40 animate-pulse'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  <Clock className="w-4 h-4 text-sky-500" />
                  <span>Tiempo: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                </div>

                <button
                  type="button"
                  onClick={resetToIdentification}
                  className={`p-2.5 rounded-xl transition-colors border cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-300'
                  }`}
                  title="Cancelar y Salir"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Título de Instrucción */}
            <div className="text-center">
              <h2 className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Elige tu opción en el tarjetón oficial
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Toca la tarjeta del candidato de tu preferencia o la opción de voto en blanco.
              </p>
            </div>

            {/* Grid de Candidatos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {candidates.map(candidate => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  isSelected={selectedCandidate?.id === candidate.id}
                  onSelect={handleSelectCandidate}
                />
              ))}

              {allowBlankVote && (
                <BlankVoteCard
                  isSelected={isBlankSelected}
                  onSelect={handleSelectBlank}
                />
              )}
            </div>
          </div>
        ) : (
          /* =================================================================
             PASO 3: PANTALLA DE ÉXITO & REINICIO AUTOMÁTICO
             ================================================================= */
          <div className={`max-w-lg w-full rounded-3xl p-8 sm:p-12 text-center shadow-2xl space-y-6 border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 border-2 border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-14 h-14" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                ¡Voto Registrado con Éxito!
              </span>
              <h2 className={`text-3xl sm:text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Gracias por Participar
              </h2>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Tu voto ha sido depositado de forma 100% anónima en la urna electrónica del colegio.
              </p>
            </div>

            {voteReceipt && (
              <div className={`p-4 rounded-2xl border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Código de Recibo Electoral Anónimo
                </span>
                <span className="font-mono text-xl font-black text-sky-500 tracking-widest">
                  REC-{voteReceipt}
                </span>
              </div>
            )}

            <div className={`pt-4 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
              <p className="text-xs text-slate-500">
                La pantalla se reiniciará automáticamente en{' '}
                <strong className="text-sky-500 font-bold">{resetCountdown} segundos</strong>...
              </p>
              <button
                type="button"
                onClick={resetToIdentification}
                className={`mt-4 px-6 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer border ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
              >
                Reiniciar Ahora
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 3. Pie de Página */}
      <footer className={`border-t px-6 py-3 text-center text-xs flex flex-col sm:flex-row items-center justify-between gap-2 transition-colors ${
        isDark
          ? 'bg-slate-900/80 border-slate-800/80 text-slate-500'
          : 'bg-white border-slate-200 text-slate-500 shadow-sm'
      }`}>
        <p>{settings?.footer_text || 'Sistema de Elecciones Escolares • Secreto de Voto Garantizado'}</p>
        <span className="font-mono text-[11px] text-slate-400">Terminal ID: ESTACION-01 • Versión 2026.1</span>
      </footer>

      {/* Modal de Escaneo QR */}
      <QrScannerModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onScanSuccess={(decodedText) => {
          setIsQrModalOpen(false);
          handleIdentify(undefined, decodedText);
        }}
      />

      {/* Modal de Confirmación Definitiva */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        candidate={selectedCandidate}
        isBlank={isBlankSelected}
        onConfirm={handleConfirmVote}
        onCancel={() => setIsConfirmModalOpen(false)}
        isSubmitting={isCastingVote}
      />
    </div>
  );
}
