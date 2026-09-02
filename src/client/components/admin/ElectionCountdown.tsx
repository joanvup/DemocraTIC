import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Election } from '../../../shared/types.js';

interface Props {
  election: Election | null;
}

export function ElectionCountdown({ election }: Props) {
  const [timeLeft, setTimeLeft] = useState<string>('--:--:--');
  const [status, setStatus] = useState<'OPEN' | 'CLOSED' | 'SCHEDULED' | 'FINISHED'>('CLOSED');

  useEffect(() => {
    if (!election) {
      setTimeLeft('--:--:--');
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      
      if (election.status === 'SCHEDULED' && election.start_at) {
        const start = new Date(election.start_at).getTime();
        const diff = start - now;
        if (diff > 0) {
          setStatus('SCHEDULED');
          setTimeLeft(formatDiff(diff));
        } else {
          setStatus('OPEN');
          setTimeLeft('Iniciando...');
        }
      } else if (election.status === 'OPEN' && election.end_at) {
        const end = new Date(election.end_at).getTime();
        const diff = end - now;
        if (diff > 0) {
          setStatus('OPEN');
          setTimeLeft(formatDiff(diff));
        } else {
          setStatus('CLOSED');
          setTimeLeft('Finalizada');
        }
      } else {
        setStatus(election.status);
        setTimeLeft(election.status === 'CLOSED' || election.status === 'FINISHED' ? 'Finalizada' : '--:--:--');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [election]);

  const formatDiff = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isWarning = status === 'OPEN' && timeLeft.split(':').length === 3 && parseInt(timeLeft.split(':')[0]) === 0 && parseInt(timeLeft.split(':')[1]) < 30;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <span className="text-xs font-bold text-rose-500 uppercase flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {status === 'SCHEDULED' ? 'Inicia en' : 'Cierre en'}
        </span>
        <p className={`text-3xl font-black font-mono mt-1 ${isWarning ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
          {timeLeft}
        </p>
      </div>
      <span className="text-[11px] text-slate-400 mt-2 block">
        {status === 'SCHEDULED' ? 'Para apertura' : status === 'OPEN' ? 'Tiempo restante' : 'Elección cerrada'}
      </span>
    </div>
  );
}
