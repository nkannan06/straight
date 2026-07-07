import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../lib/api.js';

// Shared data-fetching for the Friends tab and its sub-screens: friends
// list (with presence), pending requests, suggested friends, and a small
// activity preview. Exposes `refresh` so actions (accept/decline/add) can
// trigger a refetch without a full page reload.
export function useFriends(userId) {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const [f, r, s, a] = await Promise.all([
        apiGet(`/api/friends/${userId}`),
        apiGet(`/api/friends/${userId}/requests`),
        apiGet(`/api/friends/${userId}/suggested`),
        apiGet(`/api/activity/${userId}`),
      ]);
      setFriends(f.friends);
      setRequests(r.requests);
      setSuggested(s.suggested);
      setActivity(a.events);
    } catch {
      // server unreachable — leave last-known state
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { friends, requests, suggested, activity, loading, refresh };
}
