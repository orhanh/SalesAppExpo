import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/** Where Supabase auth emails (confirm sign-up, reset password) send the user back to. */
export function authRedirectUrl() {
  return Linking.createURL('/');
}

/**
 * Signs the user in from an auth email link (salesapp://#access_token=…&refresh_token=…).
 * On web supabase-js reads the URL itself.
 */
export function useAuthLinks(onRecovery: () => void) {
  const url = Linking.useLinkingURL();
  const handled = useRef<string | null>(null);
  const recover = useRef(onRecovery);
  useEffect(() => {
    recover.current = onRecovery;
  });

  useEffect(() => {
    if (Platform.OS === 'web' || !url || handled.current === url) return;
    handled.current = url;
    const fragment = url.split('#')[1];
    if (!fragment) return;
    const params = new URLSearchParams(fragment);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return;
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (!error && params.get('type') === 'recovery') recover.current();
    });
  }, [url]);
}
