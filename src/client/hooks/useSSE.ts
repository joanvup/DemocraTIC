import { useEffect, useState } from 'react';
import { ElectionStats } from '../../shared/types.js';

export function useSSE(activeElectionId?: string, onStatsUpdate?: (stats: ElectionStats) => void) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/v1/events');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.addEventListener('election_stats', (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (!activeElectionId || payload.electionId === activeElectionId) {
            onStatsUpdate?.(payload.stats);
          }
        } catch (err) {
          console.error('Error parsing SSE stats payload:', err);
        }
      });

      eventSource.onerror = () => {
        setIsConnected(false);
      };
    } catch (err) {
      console.error('SSE connection error:', err);
      setIsConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [activeElectionId, onStatsUpdate]);

  return { isConnected };
}
