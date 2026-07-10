import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar.jsx';
import { IconChevronLeft } from '../components/icons.jsx';
import { useProfile, initialsForName, colorForName } from '../hooks/useProfile.js';
import { apiGet, apiPost } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';

// Landing screen for the "share your link" invite from AddFriendSheet —
// /join-friend?ref=<userId>. Looks up who sent it and sends the friend
// request in one tap once the visitor (already signed in, since this route
// only renders inside the authed app) confirms.
export function JoinFriendScreen() {
  const [searchParams] = useSearchParams();
  const referrerId = searchParams.get('ref');
  const navigate = useNavigate();
  const profile = useProfile();
  const showToast = useToast();
  const [referrer, setReferrer] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | sending | sent

  useEffect(() => {
    if (!referrerId) {
      setNotFound(true);
      return;
    }
    apiGet(`/api/users/${referrerId}`)
      .then(setReferrer)
      .catch(() => setNotFound(true));
  }, [referrerId]);

  async function handleAdd() {
    setStatus('sending');
    try {
      await apiPost(`/api/friends/${profile.playerId}/request`, { recipientId: referrerId });
      setStatus('sent');
    } catch (err) {
      showToast(err.message || 'Could not send request');
      setStatus('idle');
    }
  }

  if (referrerId === profile.playerId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="font-display text-title text-text-primary">That's your own link</p>
        <p className="font-sans text-subheadline text-text-secondary">Share it with someone else to add them as a friend.</p>
        <button
          type="button"
          onClick={() => navigate('/friends', { replace: true })}
          className="mt-2 rounded-btn bg-accent-gold px-6 py-3 font-sans font-semibold text-text-on-ivory"
        >
          Go to Friends
        </button>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="font-display text-title text-text-primary">Link not valid</p>
        <p className="font-sans text-subheadline text-text-secondary">This invite link is missing or no longer works.</p>
        <button
          type="button"
          onClick={() => navigate('/friends', { replace: true })}
          className="mt-2 rounded-btn bg-accent-gold px-6 py-3 font-sans font-semibold text-text-on-ivory"
        >
          Go to Friends
        </button>
      </div>
    );
  }

  if (!referrer) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5">
        <p className="font-sans text-subheadline text-text-tertiary">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col px-5 safe-top">
      <button type="button" onClick={() => navigate('/friends', { replace: true })} className="mb-4 p-1 text-text-primary">
        <IconChevronLeft className="h-6 w-6" />
      </button>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <Avatar
          name={referrer.displayName}
          initials={initialsForName(referrer.displayName)}
          color={colorForName(referrer.displayName)}
          size="lg"
        />
        <div>
          <p className="font-display text-title text-text-primary">{referrer.displayName}</p>
          <p className="font-sans text-subheadline text-text-tertiary">@{referrer.username}</p>
        </div>
        <p className="max-w-[240px] font-sans text-subheadline text-text-secondary">
          {status === 'sent' ? 'Friend request sent.' : 'Sent you a link to add them as a friend on Straight.'}
        </p>
      </div>

      <div className="pb-8">
        {status === 'sent' ? (
          <button
            type="button"
            onClick={() => navigate('/friends', { replace: true })}
            className="w-full rounded-btn bg-accent-gold py-4 text-center font-sans font-semibold text-text-on-ivory active:scale-[0.99]"
          >
            Go to Friends
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={status === 'sending'}
            className="w-full rounded-btn bg-accent-gold py-4 text-center font-sans font-semibold text-text-on-ivory shadow-glow-gold active:scale-[0.99] disabled:opacity-60"
          >
            {status === 'sending' ? 'Sending…' : `Add ${referrer.displayName}`}
          </button>
        )}
      </div>
    </div>
  );
}
