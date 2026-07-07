import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api.js';

const POLL_MS = 15_000;

// Powers the small unread badges on the Friends/Ledger tabs. Polls rather
// than pushing over a socket — these counts change rarely enough that a
// live channel isn't worth the complexity yet.
export function useSocialCounts(userId) {
  const [counts, setCounts] = useState({ friendRequests: 0, unsettledFriends: 0 });

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;

    async function refresh() {
      try {
        const [requests, ledger] = await Promise.all([
          apiGet(`/api/friends/${userId}/requests`),
          apiGet(`/api/ledger/${userId}`),
        ]);
        if (cancelled) return;
        setCounts({
          friendRequests: requests.requests.length,
          unsettledFriends: ledger.friends.filter((f) => f.balanceCents !== 0).length,
        });
      } catch {
        // server unreachable — leave last-known counts
      }
    }

    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [userId]);

  return counts;
}
