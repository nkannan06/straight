import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../lib/api.js';

export function useSchedule(userId) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await apiGet(`/api/schedule/${userId}`);
      setGames(data.games);
    } catch {
      // server unreachable — leave last-known state
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { games, loading, refresh };
}
