import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar.jsx';
import { Sheet } from '../components/Sheet.jsx';
import { IconTrophy, IconSpade, IconGem, IconShield, IconBell, IconCrown, IconChevronLeft } from '../components/icons.jsx';
import { useProfile } from '../hooks/useProfile.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { checkUsernameAvailable } from '../lib/auth.js';
import { apiGet } from '../lib/api.js';
import { formatMoney } from '../lib/money.js';
import { Capacitor } from '@capacitor/core';

const ACHIEVEMENT_ICON = { trophy: IconTrophy, spade: IconSpade, gem: IconGem, shield: IconShield };

function UsernameField({ profile, auth }) {
  const [value, setValue] = useState(profile.username || '');
  const [status, setStatus] = useState('idle'); // idle | checking | available | taken | saved
  const [reason, setReason] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const clean = value.trim().toLowerCase();
    if (!clean || clean === profile.username) {
      setStatus('idle');
      return;
    }
    setStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailable(clean, profile.playerId);
        setStatus(result.available ? 'available' : 'taken');
        setReason(result.reason || '');
      } catch {
        setStatus('idle');
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleSave = async () => {
    const clean = value.trim().toLowerCase();
    if (status !== 'available') return;
    try {
      await auth.claimUsername(clean);
      setStatus('saved');
    } catch (err) {
      setStatus('taken');
      setReason(err.message);
    }
  };

  return (
    <div className="mb-5">
      <label className="mb-1.5 block font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">
        Username
      </label>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center rounded-btn border border-white/15 bg-bg-elevated-2 px-4 py-3">
          <span className="font-sans text-body text-text-tertiary">@</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
            maxLength={20}
            className="w-full bg-transparent font-sans text-body text-text-primary outline-none"
          />
        </div>
        {status === 'available' && (
          <button
            type="button"
            onClick={handleSave}
            className="shrink-0 rounded-btn bg-accent-gold px-3 py-3 font-sans text-[13px] font-semibold text-text-on-ivory"
          >
            Save
          </button>
        )}
      </div>
      {status === 'checking' && <p className="mt-1 font-sans text-[12px] text-text-tertiary">Checking availability…</p>}
      {status === 'available' && <p className="mt-1 font-sans text-[12px] text-accent-olive">@{value} is available</p>}
      {status === 'taken' && <p className="mt-1 font-sans text-[12px] text-fold">{reason || 'Already taken'}</p>}
      {status === 'saved' && <p className="mt-1 font-sans text-[12px] text-accent-olive">Username updated</p>}
    </div>
  );
}

function SettingsSheet({ open, onClose, profile, auth }) {
  const [name, setName] = useState(profile.name);

  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <label className="mb-1.5 block font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">
        Display name
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && profile.updateProfile({ name: name.trim() })}
        maxLength={20}
        className="mb-5 w-full rounded-btn border border-white/15 bg-bg-elevated-2 px-4 py-3 font-sans text-body text-text-primary outline-none focus:border-accent-gold"
      />
      <UsernameField profile={profile} auth={auth} />
      <div className="flex items-center justify-between">
        <span className="font-sans text-body text-text-primary">Haptics</span>
        <button
          type="button"
          role="switch"
          aria-checked={profile.haptics}
          onClick={() => profile.updateProfile({ haptics: !profile.haptics })}
          className={`relative h-7 w-12 rounded-full transition-colors ${profile.haptics ? 'bg-accent-olive' : 'bg-white/15'}`}
        >
          <span
            className="absolute top-0.5 h-6 w-6 rounded-full bg-ivory transition-transform"
            style={{ transform: profile.haptics ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </button>
      </div>
    </Sheet>
  );
}

function NotificationsSheet({ open, onClose }) {
  const isNative = Capacitor.isNativePlatform();
  return (
    <Sheet open={open} onClose={onClose} title="Notifications">
      <p className="font-sans text-subheadline text-text-secondary">
        {isNative
          ? 'Push notifications are enabled for friend requests, invites, your turn, and achievements.'
          : "Push notifications only run in the installed iOS app — this browser preview can't receive them."}
      </p>
    </Sheet>
  );
}

export function ProfileScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const auth = useAuth();
  const [stats, setStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    apiGet(`/api/stats/${profile.playerId}`).then(setStats).catch(() => {});
    apiGet(`/api/achievements/${profile.playerId}`).then((d) => setAchievements(d.achievements)).catch(() => {});
  }, [profile.playerId]);

  return (
    <div className="flex h-full flex-col px-5 pt-4">
      <div className="flex flex-col items-center">
        <button type="button" onClick={() => setSettingsOpen(true)} className="relative">
          <Avatar name={profile.name} initials={profile.initials} color={profile.color} size="lg" />
        </button>
        <h1 className="mt-3 font-display text-title text-text-primary">{profile.name}</h1>
        <p className="font-sans text-subheadline text-text-tertiary">@{profile.username || '…'}</p>
      </div>

      {stats && (
        <div className="mt-5 grid grid-cols-3 gap-2 rounded-card border border-white/10 bg-bg-elevated px-2 py-4 text-center">
          <div>
            <p className="tabular-money font-display text-headline text-text-primary">{stats.handsPlayed.toLocaleString()}</p>
            <p className="font-sans text-[11px] text-text-tertiary">Hands played</p>
          </div>
          <div className="border-x border-white/10">
            <p className="tabular-money font-display text-headline text-text-primary">{Math.round(stats.winRate * 100)}%</p>
            <p className="font-sans text-[11px] text-text-tertiary">Win rate</p>
          </div>
          <div>
            <p className="tabular-money font-display text-headline text-accent-gold">{formatMoney(stats.biggestPotCents)}</p>
            <p className="font-sans text-[11px] text-text-tertiary">Biggest pot</p>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-2 font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Achievements</h2>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {achievements.map((a) => {
            const Icon = ACHIEVEMENT_ICON[a.icon] || IconTrophy;
            const unlocked = !!a.unlockedAt;
            return (
              <div key={a.key} className="flex shrink-0 flex-col items-center gap-1.5" title={a.description}>
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-btn ${
                    unlocked ? 'bg-accent-gold text-text-on-ivory' : 'border border-white/10 bg-bg-elevated text-text-tertiary/40'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span className="max-w-[64px] text-center font-sans text-[11px] text-text-secondary">{a.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-col divide-y divide-white/5">
        <button type="button" onClick={() => navigate('/hands')} className="flex items-center justify-between py-3 text-left">
          <span className="font-sans text-body text-text-primary">Stats &amp; Hand History</span>
          <IconChevronLeft className="h-4 w-4 rotate-180 text-text-tertiary" />
        </button>
        <button type="button" onClick={() => setNotificationsOpen(true)} className="flex items-center justify-between py-3 text-left">
          <span className="flex items-center gap-2 font-sans text-body text-text-primary">
            <IconBell className="h-4 w-4 text-text-tertiary" /> Notifications
          </span>
          <IconChevronLeft className="h-4 w-4 rotate-180 text-text-tertiary" />
        </button>
        <button type="button" onClick={() => setSettingsOpen(true)} className="flex items-center justify-between py-3 text-left">
          <span className="font-sans text-body text-text-primary">Haptics</span>
          <IconChevronLeft className="h-4 w-4 rotate-180 text-text-tertiary" />
        </button>
      </div>

      <div className="mt-4 rounded-card border border-accent-gold/30 bg-bg-elevated px-4 py-3">
        <div className="flex items-center gap-2">
          <IconCrown className="h-4 w-4 text-accent-gold" />
          <span className="font-sans font-semibold text-accent-gold">Straight Plus</span>
        </div>
        <p className="mt-0.5 font-sans text-[12px] text-text-tertiary">Deeper stats, custom tables &amp; more — coming soon</p>
      </div>

      <div className="flex-1" />

      <button type="button" onClick={() => auth.logOut()} className="mb-6 py-2 text-center font-sans text-subheadline text-text-secondary">
        Sign Out
      </button>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} profile={profile} auth={auth} />
      <NotificationsSheet open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </div>
  );
}
