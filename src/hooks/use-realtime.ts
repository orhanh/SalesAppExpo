import { focusManager, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { invalidateSales } from '@/lib/api';
import { supabase } from '@/lib/supabase';

/** Keeps leaderboards, contests and the feed live while signed in. */
export function useRealtime(userId: string | undefined) {
  const client = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('sales-floor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => invalidateSales(client))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_events' }, () =>
        client.invalidateQueries({ queryKey: ['feed'] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, client]);

  // Refetch stale data when the app comes back to the foreground.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => sub.remove();
  }, []);
}
