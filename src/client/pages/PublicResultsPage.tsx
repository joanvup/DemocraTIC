import { useState, useEffect, useCallback } from 'react';
import { Election, ElectionStats, SchoolSettings } from '../../shared/types.js';
import { votingApi } from '../services/api.js';
import { useSSE } from '../hooks/useSSE.js';
import { useTheme } from '../hooks/useTheme.js';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Lock,
  Maximize2,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  TrendingUp,
  Trophy,
  Users,
  Vote
} from 'lucide-react';

export function PublicResultsPage({ onBack }: { onBack: () => void }) {
  const { isDark, toggleTheme } = useTheme();
  const [election, setElection] = useState<Election | null>(null);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [stats, setStats] = useState<ElectionStats | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [hiddenMsg, setHiddenMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      const res = await votingApi.getPublicResults();
      if (res.success) {
        setElection(res.election);
        setSettings(res.settings);
        setIsHidden(res.is_hidden);
        setHiddenMsg(res.message || null);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      console.error('Error cargando resultados públicos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // Suscripción en tiempo real vía SSE
  useSSE(election?.id, (newStats) => {
    setStats(newStats);
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors ${
        isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}>
        <RefreshCw className="w-12 h-12 text-sky-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold">Cargando Escrutinio en Tiempo Real...</h2>
      </div>
    );
  }

  const isFinished = election?.status === 'CLOSED' || election?.status === 'FINISHED';
  const winner = stats?.results && stats.results.length > 0 && stats.results[0].votes_count > 0 && !stats.results[0].is_blank
    ? stats.results[0]
    : null;

  return (
    <div className={`min-h-screen flex flex-col justify-between p-4 sm:p-8 transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Cabecera Proyector */}
      <header className={`flex items-center justify-between border-b pb-6 mb-8 transition-colors ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white flex items-center justify-center p-1.5 shadow-md border border-slate-200 overflow-hidden flex-shrink-0">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <ShieldCheck className="w-10 h-10 text-sky-900" />
            )}
          </div>
          <div>
            <span className={`text-xs font-bold uppercase tracking-widest ${
              isDark ? 'text-sky-400' : 'text-sky-700'
            }`}>
              {settings?.school_name || 'Colegio Bilingüe San Patricio'} • Escrutinio Oficial
            </span>
            <h1 className={`text-xl sm:text-3xl font-black tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {election?.name || 'Resultados de Elecciones de Personería 2026'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            EN VIVO
          </div>

          {/* Selector de Modo Claro / Oscuro */}
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 border cursor-pointer ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-800'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
            }`}
            title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-700" />}
            <span className="hidden md:inline">{isDark ? 'Claro' : 'Oscuro'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className={`p-2.5 rounded-xl transition-all border cursor-pointer ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-300 shadow-sm'
            }`}
            title="Pantalla Completa"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver</span>
          </button>
        </div>
      </header>

      {/* Si los resultados están configurados como ocultos hasta el cierre */}
      {isHidden ? (
        <div className="flex-grow flex items-center justify-center">
          <div className={`max-w-md w-full rounded-3xl p-10 text-center space-y-4 shadow-2xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="w-20 h-20 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-3xl flex items-center justify-center mx-auto">
              <Lock className="w-10 h-10" />
            </div>
            <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Resultados en Reserva</h3>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{hiddenMsg}</p>
          </div>
        </div>
      ) : (
        <main className="flex-grow space-y-8">
          {/* Tarjetas de Métricas Globales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className={`rounded-2xl p-5 shadow-lg border transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex items-center justify-between mb-2 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <span className="text-xs font-bold uppercase tracking-wider">Censo Habilitado</span>
                <Users className="w-5 h-5 text-sky-500" />
              </div>
              <p className={`text-3xl sm:text-4xl font-black font-mono ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {stats?.total_eligible_students?.toLocaleString() || 0}
              </p>
              <span className={`text-xs mt-1 block ${
                isDark ? 'text-slate-500' : 'text-slate-500'
              }`}>Estudiantes matriculados</span>
            </div>

            <div className={`rounded-2xl p-5 shadow-lg border transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex items-center justify-between mb-2 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <span className="text-xs font-bold uppercase tracking-wider">Votos Emitidos</span>
                <Vote className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-3xl sm:text-4xl font-black text-emerald-500 font-mono">
                {stats?.total_votes_cast?.toLocaleString() || 0}
              </p>
              <span className={`text-xs mt-1 block ${
                isDark ? 'text-slate-500' : 'text-slate-500'
              }`}>Urna electrónica</span>
            </div>

            <div className={`rounded-2xl p-5 shadow-lg border transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex items-center justify-between mb-2 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <span className="text-xs font-bold uppercase tracking-wider">Votantes Pendientes</span>
                <Users className="w-5 h-5 text-amber-500" />
              </div>
              <p className={`text-3xl sm:text-4xl font-black font-mono ${
                isDark ? 'text-amber-300' : 'text-amber-600'
              }`}>
                {stats?.total_pending_students?.toLocaleString() || 0}
              </p>
              <span className={`text-xs mt-1 block ${
                isDark ? 'text-slate-500' : 'text-slate-500'
              }`}>Por sufragar</span>
            </div>

            <div className={`rounded-2xl p-5 shadow-lg border transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex items-center justify-between mb-2 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <span className="text-xs font-bold uppercase tracking-wider">Participación</span>
                <TrendingUp className="w-5 h-5 text-indigo-500" />
              </div>
              <p className={`text-3xl sm:text-4xl font-black font-mono ${
                isDark ? 'text-indigo-300' : 'text-indigo-600'
              }`}>
                {stats?.participation_percentage || 0}%
              </p>
              <div className={`w-full h-2 rounded-full mt-2 overflow-hidden ${
                isDark ? 'bg-slate-800' : 'bg-slate-100 border border-slate-200'
              }`}>
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats?.participation_percentage || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Ganador Proyectado si está cerrado */}
          {isFinished && winner && (
            <div className={`border-2 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center gap-6 ${
              isDark
                ? 'bg-gradient-to-r from-amber-950/80 via-yellow-950/60 to-amber-950/80 border-amber-500/50 text-white'
                : 'bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 border-amber-400 text-slate-900'
            }`}>
              <div className="w-20 h-20 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black flex-shrink-0 shadow-lg">
                <Trophy className="w-12 h-12" />
              </div>
              <div className="space-y-1 text-center sm:text-left flex-grow">
                <span className={`text-xs font-black tracking-widest uppercase ${
                  isDark ? 'text-amber-300' : 'text-amber-800'
                }`}>
                  🏆 PERSONERO ELECTO 2026 (MAYORÍA DE VOTOS)
                </span>
                <h3 className={`text-2xl sm:text-3xl font-black ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  {winner.candidate_name}
                </h3>
                <p className={`text-sm ${
                  isDark ? 'text-amber-200' : 'text-amber-900 font-medium'
                }`}>
                  Lista #{winner.list_number} • Total Votos: <strong>{winner.votes_count}</strong> ({winner.percentage}%)
                </p>
              </div>
            </div>
          )}

          {/* Gráfico de Barras y Resultados por Candidato */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Columna Principal: Votos por Candidato */}
            <div className={`lg:col-span-2 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 border transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex items-center justify-between border-b pb-4 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-sky-500" />
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Resultados Electorales
                  </h3>
                </div>
                <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Total Válidos: {stats?.total_votes_cast || 0}
                </span>
              </div>

              <div className="space-y-5">
                {stats?.results.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-sm sm:text-base font-bold">
                      <div className="flex items-center gap-3">
                        {item.photo_url && (
                          <img
                            src={item.photo_url}
                            alt=""
                            className={`w-10 h-10 rounded-xl object-cover border ${
                              isDark ? 'border-slate-700' : 'border-slate-300'
                            }`}
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div>
                          <span className={isDark ? 'text-white' : 'text-slate-900'}>{item.candidate_name}</span>
                          {item.list_number && (
                            <span className={`ml-2 text-xs font-mono px-2 py-0.5 rounded border ${
                              isDark
                                ? 'text-sky-400 bg-sky-950 border-sky-800'
                                : 'text-sky-700 bg-sky-50 border-sky-200'
                            }`}>
                              Lista #{item.list_number}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {item.votes_count} votos
                        </span>
                        <span className={`text-sm ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          ({item.percentage}%)
                        </span>
                      </div>
                    </div>

                    <div className={`w-full h-5 rounded-xl overflow-hidden p-1 border ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <div
                        className={`h-full rounded-lg transition-all duration-700 ${
                          idx === 0 && item.votes_count > 0 && !item.is_blank
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : item.is_blank
                            ? isDark ? 'bg-slate-600' : 'bg-slate-400'
                            : 'bg-gradient-to-r from-sky-600 to-indigo-500'
                        }`}
                        style={{ width: `${Math.max(item.percentage, 1)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Columna Lateral: Participación por Cursos */}
            <div className={`rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 border transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className={`text-lg font-bold flex items-center gap-2 border-b pb-3 ${
                isDark ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'
              }`}>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Participación por Curso
              </h3>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {stats?.participation_by_course.map((c, i) => (
                  <div key={i} className={`p-3.5 rounded-xl border space-y-1.5 ${
                    isDark ? 'bg-slate-950 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={isDark ? 'text-sky-300' : 'text-sky-700'}>Curso {c.course}</span>
                      <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {c.voted} / {c.total} ({c.percentage}%)
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${
                      isDark ? 'bg-slate-900' : 'bg-slate-200'
                    }`}>
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${c.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Pie de Página */}
      <footer className={`mt-8 pt-4 border-t flex flex-col sm:flex-row items-center justify-between text-xs gap-2 transition-colors ${
        isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-500'
      }`}>
        <p>Transmisión de Escrutinio Escolar Cifrado • Actualización Continua</p>
        <span className={`font-mono ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          Sincronización activa con Urna Electrónica
        </span>
      </footer>
    </div>
  );
}

