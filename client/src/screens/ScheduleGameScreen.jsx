import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar.jsx';
import { IconClose, IconCalendar } from '../components/icons.jsx';
import { useProfile, initialsForName, colorForName } from '../hooks/useProfile.js';
import { useFriends } from '../hooks/useFriends.js';
import { apiPost } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';

const REPEAT_OPTIONS = [
  { key: 'none', label: 'Off' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Biweekly' },
  { key: 'monthly', label: 'Monthly' },
];

function defaultDateTimeLocal() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

export function ScheduleGameScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const showToast = useToast();
  const { friends } = useFriends(profile.playerId);
  const [name, setName] = useState('');
  const [when, setWhen] = useState(defaultDateTimeLocal());
  const [repeat, setRepeat] = useState('none');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  function toggleFriend(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSchedule() {
    const scheduledAt = new Date(when).getTime();
    if (!Number.isFinite(scheduledAt)) {
      showToast('Pick a valid date and time');
      return;
    }
    setSubmitting(true);
    try {
      await apiPost('/api/schedule', {
        name: name.trim() || null,
        scheduledAt,
        repeatRule: repeat,
        createdBy: profile.playerId,
        inviteeIds: [...selectedIds],
      });
      setSuccess({ count: selectedIds.size, when: new Date(scheduledAt) });
    } catch {
      showToast('Could not schedule game');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <p className="font-display text-title text-text-primary">Scheduled!</p>
        <p className="mt-2 font-sans text-subheadline text-text-secondary">
          {success.when.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
          {success.when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} — {success.count} invited
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-6 rounded-btn bg-accent-gold px-6 py-3 font-sans font-semibold text-text-on-ivory"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col px-5 safe-top">
      <div className="mb-4 flex items-center">
        <button type="button" onClick={() => navigate(-1)} className="p-1 text-text-primary">
          <IconClose className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center font-display text-title text-text-primary">Schedule</h1>
        <div className="w-7" />
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <label className="mb-1.5 block font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Game Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Friday Night Poker"
          className="mb-5 w-full rounded-btn border border-white/15 bg-bg-elevated-2 px-4 py-3 font-sans text-body text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent-gold"
        />

        <label className="mb-1.5 block font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">When</label>
        <div className="mb-5 flex items-center gap-2 rounded-btn border border-white/15 bg-bg-elevated-2 px-4 py-3">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="flex-1 bg-transparent font-sans text-body text-text-primary outline-none [color-scheme:dark]"
          />
          <IconCalendar className="h-4 w-4 shrink-0 text-accent-gold" />
        </div>

        <label className="mb-1.5 block font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Repeats</label>
        <div className="mb-5 grid grid-cols-4 gap-2">
          {REPEAT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRepeat(opt.key)}
              className={
                'rounded-btn border py-2.5 font-sans text-[13px] font-medium ' +
                (repeat === opt.key ? 'border-accent-gold text-accent-gold' : 'border-white/15 text-text-secondary')
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mb-2 flex items-center justify-between">
          <label className="font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Invite Friends</label>
          <span className="font-sans text-[12px] text-accent-gold">{selectedIds.size} selected</span>
        </div>
        <div className="flex flex-col divide-y divide-white/5">
          {friends.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => toggleFriend(f.id)}
              className="flex items-center justify-between py-2.5 text-left"
            >
              <div className="flex items-center gap-3">
                <Avatar name={f.displayName} initials={initialsForName(f.displayName)} color={colorForName(f.displayName)} size="sm" />
                <span className="font-sans text-body text-text-primary">{f.displayName}</span>
              </div>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                  selectedIds.has(f.id) ? 'border-accent-olive bg-accent-olive text-text-on-ivory' : 'border-white/25'
                }`}
              >
                {selectedIds.has(f.id) && '✓'}
              </span>
            </button>
          ))}
          {friends.length === 0 && <p className="py-4 font-sans text-subheadline text-text-tertiary">Add friends first to invite them.</p>}
        </div>
      </div>

      <div className="safe-bottom pb-6">
        <button
          type="button"
          onClick={handleSchedule}
          disabled={submitting}
          className="w-full rounded-btn bg-accent-gold py-4 text-center font-sans font-semibold text-text-on-ivory shadow-glow-gold disabled:opacity-60"
        >
          {submitting ? 'Scheduling…' : 'Schedule Game'}
        </button>
      </div>
    </div>
  );
}
