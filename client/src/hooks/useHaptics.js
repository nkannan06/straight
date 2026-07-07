import { useCallback } from 'react';
import { useProfile } from './useProfile.js';

// Thin wrapper over the Vibration API (supported on Android Chrome; a no-op
// elsewhere, e.g. iOS Safari has no equivalent web API) gated by the user's
// haptics setting.
export function useHaptics() {
  const profile = useProfile();
  return useCallback((pattern = 10) => {
    if (profile.haptics && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, [profile.haptics]);
}
