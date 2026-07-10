import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar.jsx';
import { IconChevronLeft } from '../components/icons.jsx';
import { useProfile, initialsForName, colorForName } from '../hooks/useProfile.js';
import { useFriends } from '../hooks/useFriends.js';
import { apiPost } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';

export function FriendRequestsScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const showToast = useToast();
  const { requests, refresh } = useFriends(profile.playerId);

  async function handleAccept(friendshipId) {
    try {
      await apiPost(`/api/friends/requests/${friendshipId}/accept`, { userId: profile.playerId });
      refresh();
    } catch (err) {
      showToast(err.message || 'Could not accept');
    }
  }

  async function handleDecline(friendshipId) {
    try {
      await apiPost(`/api/friends/requests/${friendshipId}/decline`, { userId: profile.playerId });
      refresh();
    } catch (err) {
      showToast(err.message || 'Could not decline');
    }
  }

  return (
    <div className="flex h-full flex-col px-5 safe-top">
      <div className="mb-2 flex items-center">
        <button type="button" onClick={() => navigate(-1)} className="p-1 text-text-primary">
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-center font-display text-title text-text-primary">Requests</h1>
        <div className="w-8" />
      </div>

      {requests.length === 0 ? (
        <p className="mt-10 text-center font-sans text-subheadline text-text-tertiary">No pending requests</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {requests.map((r) => (
            <div key={r.friendshipId} className="flex items-center justify-between rounded-card border border-white/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={r.displayName} initials={initialsForName(r.displayName)} color={colorForName(r.displayName)} size="sm" />
                <div>
                  <p className="font-sans text-body font-medium text-text-primary">{r.displayName}</p>
                  <p className="font-sans text-[12px] text-text-tertiary">@{r.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleAccept(r.friendshipId)}
                  className="rounded-btn bg-accent-gold px-3 py-1.5 font-sans text-[13px] font-semibold text-text-on-ivory"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => handleDecline(r.friendshipId)}
                  className="font-sans text-[13px] text-text-tertiary"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
