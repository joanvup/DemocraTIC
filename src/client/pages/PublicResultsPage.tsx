import { useState, useEffect, useCallback } from 'react';
import { Election, ElectionStats, SchoolSettings } from '../../shared/types.js';
import { votingApi } from '../services/api.js';
import { useSSE } from '../hooks/useSSE.js';
import {
  BarChart3,
  CheckCircle2,
  Maximize2,
  RefreshCw,
  Trophy,
  Users,
  Vote,
  TrendingUp,
  ShieldCheck,
  Lock
} from 'lucide-react';

export function PublicResultsPage({ onBack }: { onBack: () => void }) {
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <RefreshCw className="w-12 h-12 text-sky-400 animate-spin mb-4" />
        <h2 className="text-xl font-bold">Cargando Escrutinio en Tiempo Real...</h2>
      </div>
    );
  }

  const isFinished = election?.status === 'CLOSED' || election?.status === 'FINISHED';
  const winner = stats?.results && stats.results.length > 0 && stats.results[0].votes_count > 0 && !stats.results[0].is_blank
    ? stats.results[0]
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Cabecera Proyector */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center p-1.5 shadow-lg overflow-hidden">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <ShieldCheck className="w-10 h-10 text-sky-900" />
            )}
          </div>
          <div>
            <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">
              {settings?.school_name || 'Colegio Bilingüe San Patricio'} • Escrutinio Oficial
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {election?.name || 'Resultados de Elecciones de Personería 2026'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            EN VIVO
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
            title="Pantalla Completa"
          >
            <Maximize2 className="w-5 h-5" />
          </button>

          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Volver
          </button>
        </div>
      </header>

      {/* Si los resultados están configurados como ocultos hasta el cierre */}
      {isHidden ? (
        <div className="flex-grow flex items-center justify-center">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-4 shadow-2xl">
            <div className="w-20 h-20 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-3xl flex items-center justify-center mx-auto">
              <Lock className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white">Resultados en Reserva</h3>
            <p className="text-slate-400 text-sm">{hiddenMsg}</p>
          </div>
        </div>
      ) : (
        <main className="flex-grow space-y-8">
          {/* Tarjetas de Métricas Globales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Censo Habilitado</span>
                <Users className="w-5 h-5 text-sky-400" />
              </div>
              <p className="text-3xl sm:text-4xl font-black text-white font-mono">
                {stats?.total_eligible_students?.toLocaleString() || 0}
              </p>
              <span className="text-xs text-slate-500 mt-1 block">Estudiantes matriculados</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Votos Emitidos</span>
                <Vote className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">
                {stats?.total_votes_cast?.toLocaleString() || 0}
              </p>
              <span className="text-xs text-slate-500 mt-1 block">Urna electrónica</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Votantes Pendientes</span>
                <Users className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-3xl sm:text-4xl font-black text-amber-300 font-mono">
                {stats?.total_pending_students?.toLocaleString() || 0}
              </p>
              <span className="text-xs text-slate-500 mt-1 block">Por sufragar</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Participación</span>
                <TrendingUp className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-3xl sm:text-4xl font-black text-indigo-300 font-mono">
                {stats?.participation_percentage || 0}%
              </p>
              <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats?.participation_percentage || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Ganador Proyectado si está cerrado */}
          {isFinished && winner && (
            <div className="bg-gradient-to-r from-amber-950/80 via-yellow-950/60 to-amber-950/80 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black flex-shrink-0 shadow-lg">
                <Trophy className="w-12 h-12" />
              </div>
              <div className="space-y-1 text-center sm:text-left flex-grow">
                <span className="text-xs font-black tracking-widest text-amber-300 uppercase">
                  🏆 PERSONERO ELECTO 2026 (MAYORÍA DE VOTOS)
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  {winner.candidate_name}
                </h3>
                <p className="text-sm text-amber-200">
                  Lista #{winner.list_number} • Total Votos: <strong>{winner.votes_count}</strong> ({winner.percentage}%)
                </p>
              </div>
            </div>
          )}

          {/* Gráfico de Barras y Resultados por Candidato */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Columna Principal: Votos por Candidato */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-sky-400" />
                  <h3 className="text-xl font-bold text-white">Resultados Electorales</h3>
                </div>
                <span className="text-xs font-mono text-slate-400">Total Válidos: {stats?.total_votes_cast || 0}</span>
              </div>

              <div className="space-y-5">
                {stats?.results.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-sm sm:text-base font-bold">
                      <div className="flex items-center gap-3">
                        {item.photo_url && (
                          <img src={item.photo_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-700" referrerPolicy="no-referrer" />
                        )}
                        <div>
                          <span className="text-white">{item.candidate_name}</span>
                          {item.list_number && (
                            <span className="ml-2 text-xs font-mono text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                              Lista #{item.list_number}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-white text-lg font-black">{item.votes_count} votos</span>
                        <span className="text-slate-400 text-sm ml-2">({item.percentage}%)</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-950 h-5 rounded-xl overflow-hidden p-1 border border-slate-800">
                      <div
                        className={`h-full rounded-lg transition-all duration-700 ${
                          idx === 0 && item.votes_count > 0 && !item.is_blank
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : item.is_blank
                            ? 'bg-slate-600'
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
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Participación por Curso
              </h3>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {stats?.participation_by_course.map((c, i) => (
                  <div key={i} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-sky-300">Curso {c.course}</span>
                      <span className="font-mono text-white">{c.voted} / {c.total} ({c.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
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
      <footer className="mt-8 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <p>Transmisión de Escrutinio Escolar Cifrado • Actualización Continua</p>
        <span className="font-mono text-slate-600">Sincronización activa con Urna Electrónica</span>
      </footer>
    </div>
  );
}
