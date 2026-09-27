import { focusManager, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { invalidateGroups, invalidateSales } from '@/lib/api';
import { supabase } from '@/lib/supabase';

/** Keeps leaderboards, contests, the feed and group invites live while signed in. */
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
      // RLS limits these to the user's own invites and groups.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_invites' }, () => invalidateGroups(client))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => invalidateGroups(client))
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
