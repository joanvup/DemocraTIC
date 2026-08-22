import { useState, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { ShieldCheck, Lock, User, KeyRound, ArrowLeft } from 'lucide-react';

export function LoginPage({
  onSuccess,
  onCancel
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Por favor ingresa usuario y contraseña.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(username, password);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al autenticar.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-white">Acceso Administrativo</h2>
          <p className="text-xs text-slate-400">Ingreso exclusivo para jurados, monitores y administradores electorales.</p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-rose-200 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-300 block mb-1.5">Usuario</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin o monitor"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1.5">Contraseña</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm shadow-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Acceso Rápido Demo */}
        <div className="pt-3 border-t border-slate-800 space-y-2 text-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            Credenciales de Prueba Rápida
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'Admin2026!*')}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sky-300 font-bold border border-slate-700 transition-colors"
            >
              Superadmin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('monitor', 'Monitor2026!*')}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-emerald-300 font-bold border border-slate-700 transition-colors"
            >
              Monitor de Mesa
            </button>
          </div>
        </div>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a la Estación de Votación
          </button>
        </div>
      </div>
    </div>
  );
}
