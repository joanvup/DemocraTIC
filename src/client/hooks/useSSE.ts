import { useEffect, useRef, useState } from 'react';
import { ElectionStats } from '../../shared/types.js';
import { adminApi, votingApi } from '../services/api.js';

export function useSSE(activeElectionId?: string, onStatsUpdate?: (stats: ElectionStats) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const callbackRef = useRef(onStatsUpdate);
  callbackRef.current = onStatsUpdate;

  const electionIdRef = useRef(activeElectionId);
  electionIdRef.current = activeElectionId;

  useEffect(() => {
    if (!activeElectionId) {
      setIsConnected(false);
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;
    let isCleanedUp = false;
    let consecutiveErrors = 0;

    // Función auxiliar para obtener estadísticas vía HTTP (fallback o al volver a primer plano)
    const fetchFreshStats = async () => {
      const currentId = electionIdRef.current;
      if (!currentId || isCleanedUp) return;
      try {
        const res = await adminApi.getStats(currentId);
        if (res.success && res.stats) {
          callbackRef.current?.(res.stats);
        }
      } catch {
        // En caso de que sea una vista pública o token expirado, intentar public-results
        try {
          const publicRes = await votingApi.getPublicResults();
          if (publicRes.success && publicRes.stats) {
            callbackRef.current?.(publicRes.stats);
          }
        } catch {
          // Silencioso para no saturar consola
        }
      }
    };

    // Iniciar conexión SSE
    const connectSSE = () => {
      if (isCleanedUp || typeof window === 'undefined') return;

      // Si la pestaña está oculta, no abrir conexión innecesaria
      if (document.visibilityState === 'hidden') return;

      // Si ya hay una abierta, cerrarla primero
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      try {
        eventSource = new EventSource('/api/v1/events');

        eventSource.onopen = () => {
          if (isCleanedUp) return;
          setIsConnected(true);
          consecutiveErrors = 0;
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
        };

        eventSource.addEventListener('election_stats', (event) => {
          if (isCleanedUp) return;
          try {
            const payload = JSON.parse(event.data);
            const currentId = electionIdRef.current;
            if (!currentId || payload.electionId === currentId) {
              callbackRef.current?.(payload.stats);
            }
          } catch (err) {
            console.error('Error parsing SSE stats payload:', err);
          }
        });

        eventSource.onerror = () => {
          if (isCleanedUp) return;
          setIsConnected(false);
          consecutiveErrors++;

          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }

          // Si el servidor falla repetidamente o corta SSE (común en hosting compartido),
          // activar fallback de polling liviano cada 15 segundos en vez de reconectar agresivamente
          if (consecutiveErrors >= 2) {
            if (!pollingInterval) {
              fetchFreshStats();
              pollingInterval = setInterval(fetchFreshStats, 15000);
            }
            // Reintentar SSE tras 30 segundos
            reconnectTimeout = setTimeout(connectSSE, 30000);
          } else {
            // Reintento rápido controlado (3s)
            reconnectTimeout = setTimeout(connectSSE, 3000);
          }
        };
      } catch (err) {
        console.error('SSE connection error:', err);
        setIsConnected(false);
        if (!pollingInterval) {
          pollingInterval = setInterval(fetchFreshStats, 15000);
        }
      }
    };

    // Manejar visibilidad de la pestaña: si el usuario minimiza la pestaña,
    // liberamos la conexión para no consumir workers en Hostinger.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
        setIsConnected(false);
      } else if (document.visibilityState === 'visible') {
        // Al regresar a la pestaña, obtener datos frescos y reconectar
        fetchFreshStats();
        connectSSE();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Iniciar conexión inicial
    connectSSE();

    return () => {
      isCleanedUp = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [activeElectionId]);

  return { isConnected };
}
