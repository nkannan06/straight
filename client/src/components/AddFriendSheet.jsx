import { useEffect, useState } from 'react';
import { Sheet } from './Sheet.jsx';
import { Avatar } from './Avatar.jsx';
import { IconSearch, IconCopy, IconShare } from './icons.jsx';
import { initialsForName, colorForName } from '../hooks/useProfile.js';
import { apiGet, apiPost } from '../lib/api.js';
import { useToast } from './Toast.jsx';

function ResultRow({ person, onAdd, status }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-3">
        <Avatar name={person.displayName} initials={initialsForName(person.displayName)} color={colorForName(person.displayName)} size="sm" />
        <div>
          <p className="font-sans text-body font-medium text-text-primary">{person.displayName}</p>
          <p className="font-sans text-[12px] text-text-tertiary">@{person.username}</p>
        </div>
      </div>
      {status === 'requested' ? (
        <span className="rounded-btn border border-white/15 px-3 py-1.5 font-sans text-[13px] text-text-tertiary">Requested</span>
      ) : (
        <button
          type="button"
          onClick={() => onAdd(person.id)}
          className="rounded-btn bg-accent-gold px-4 py-1.5 font-sans text-[13px] font-semibold text-text-on-ivory"
        >
          Add
        </button>
      )}
    </div>
  );
}

export function AddFriendSheet({ open, onClose, userId, suggested, onSent }) {
  const showToast = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [requestedIds, setRequestedIds] = useState(new Set());

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    const id = setTimeout(() => {
      apiGet(`/api/users/search?q=${encodeURIComponent(query.trim())}&userId=${userId}`)
        .then((data) => !cancelled && setResults(data.results))
        .catch(() => {});
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query, userId]);

  async function handleAdd(recipientId) {
    try {
      await apiPost(`/api/friends/${userId}/request`, { recipientId });
      setRequestedIds((prev) => new Set(prev).add(recipientId));
      onSent?.();
    } catch (err) {
      showToast(err.message || 'Could not send request');
    }
  }

  const shareUrl = `${window.location.origin}/join-friend?ref=${userId}`;

  // navigator.clipboard requires a secure context (HTTPS or localhost) — it's
  // silently undefined when testing over a plain-HTTP LAN address (e.g. from
  // a phone during dev), so this falls back to the older execCommand copy,
  // which works everywhere a text selection does.
  function legacyCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
  }

  async function handleCopyLink() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copied');
        return;
      }
    } catch {
      // fall through to legacy copy
    }
    showToast(legacyCopy(shareUrl) ? 'Link copied' : "Couldn't copy — long-press the link above to copy it");
  }

  async function handleShareLink() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Add me on Straight', url: shareUrl });
      } catch {
        // cancelled
      }
    } else {
      handleCopyLink();
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add Friend">
      <div className="relative mb-4">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username"
          className="w-full rounded-btn border border-white/15 bg-bg-elevated-2 py-2.5 pl-9 pr-3 font-sans text-body text-text-primary outline-none focus:border-accent-gold"
        />
      </div>

      {results.length > 0 && (
        <div className="mb-2 divide-y divide-white/5">
          {results.map((r) => (
            <ResultRow key={r.id} person={r} onAdd={handleAdd} status={requestedIds.has(r.id) ? 'requested' : 'idle'} />
          ))}
        </div>
      )}

      <div className="mt-2">
        <p className="mb-2 font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Share your link</p>
        <div className="flex items-center gap-2 rounded-btn border border-white/15 bg-bg-elevated-2 px-3 py-2.5">
          <span className="flex-1 truncate font-sans text-[13px] text-text-secondary">{shareUrl}</span>
          <button type="button" onClick={handleCopyLink} aria-label="Copy link" className="text-accent-gold">
            <IconCopy className="h-4 w-4" />
          </button>
          <button type="button" onClick={handleShareLink} className="rounded-chip bg-accent-gold p-1.5 text-text-on-ivory" aria-label="Share link">
            <IconShare className="h-4 w-4" />
          </button>
        </div>
      </div>

      {suggested.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Suggested · Played together</p>
          <div className="divide-y divide-white/5">
            {suggested.map((s) => (
              <ResultRow key={s.id} person={s} onAdd={handleAdd} status={requestedIds.has(s.id) ? 'requested' : 'idle'} />
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
