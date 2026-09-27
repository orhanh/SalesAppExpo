/**
 * Supabase queries and mutations, wrapped in React Query hooks.
 * Row level security decides what each user can read or change; see supabase/migrations.
 */
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Tables, TablesInsert } from '@/lib/database.types';
import type { ContestType, FeedKind, Period } from '@/lib/salesbell';
import { supabase } from '@/lib/supabase';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

/** Everything derived from sales, refreshed together when a sale changes. */
export const SALES_KEYS = [
  ['leaderboard'],
  ['productSales'],
  ['standings'],
  ['feed'],
  ['myStats'],
  ['spinStatus'],
  ['history'],
  ['requests'],
] as const;

export function invalidateSales(client: QueryClient = queryClient) {
  return Promise.all(SALES_KEYS.map((queryKey) => client.invalidateQueries({ queryKey })));
}

async function must<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw error;
  return data as NonNullable<T>;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export type Profile = Tables<'profiles'> & { team: { name: string } | null };

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: () =>
      must(supabase.from('profiles').select('*, team:teams(name)').eq('id', userId!).single()) as Promise<Profile>,
  });
}

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    staleTime: Infinity,
    queryFn: () => must(supabase.from('teams').select('*').order('id')),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => must(supabase.from('settings').select('*').single()),
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => must(supabase.from('products').select('*').order('id')),
  });
}

export function useLeaderboard(period: Period) {
  return useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => must(supabase.rpc('leaderboard', { p_period: period })),
  });
}

export function useProductSales(period: Period) {
  return useQuery({
    queryKey: ['productSales', period],
    queryFn: () => must(supabase.rpc('product_sales', { p_period: period })),
  });
}

export function useContests() {
  return useQuery({
    queryKey: ['contests'],
    queryFn: () => must(supabase.from('contests').select('*').order('starts_on')),
  });
}

export function useStandings() {
  return useQuery({
    queryKey: ['standings'],
    queryFn: () => must(supabase.rpc('contest_standings')),
  });
}

export type FeedItem = Tables<'feed_events'> & { kind: FeedKind; profile: { full_name: string } | null };

export function useFeed() {
  return useQuery({
    queryKey: ['feed'],
    queryFn: () =>
      must(
        supabase
          .from('feed_events')
          .select('*, profile:profiles(full_name)')
          .order('created_at', { ascending: false })
          .limit(50),
      ) as Promise<FeedItem[]>,
  });
}

export type MyStats = {
  today_sales: number;
  today_revenue: number;
  week_sales: number;
  week_revenue: number;
  month_sales: number;
  month_revenue: number;
  month_days: number;
  best_day: string | null;
  best_day_sales: number;
  top_product: string | null;
  top_product_share: number;
};

export function useMyStats() {
  return useQuery({
    queryKey: ['myStats'],
    queryFn: async () => (await must(supabase.rpc('my_stats'))) as unknown as MyStats,
  });
}

export function useSpinStatus() {
  return useQuery({
    queryKey: ['spinStatus'],
    queryFn: async () => (await must(supabase.rpc('spin_status')))[0],
  });
}

export function useSpinFields() {
  return useQuery({
    queryKey: ['spinFields'],
    queryFn: () => must(supabase.from('spin_fields').select('*').order('position')),
  });
}

export function usePrizes(userId: string | undefined) {
  return useQuery({
    queryKey: ['prizes', userId],
    enabled: !!userId,
    queryFn: () =>
      must(
        supabase
          .from('spins')
          .select('id, label, created_at')
          .eq('user_id', userId!)
          .eq('won', true)
          .order('created_at', { ascending: false })
          .limit(20),
      ),
  });
}

export type SaleWithProduct = Tables<'sales'> & { product: { name: string } | null };

/** The signed-in user's sales from the last 14 days, newest first. */
export function useHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['history', userId],
    enabled: !!userId,
    queryFn: () =>
      must(
        supabase
          .from('sales')
          .select('*, product:products(name)')
          .eq('user_id', userId!)
          .gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString())
          .order('created_at', { ascending: false }),
      ) as Promise<SaleWithProduct[]>,
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: () =>
      must(supabase.from('profiles').select('*, team:teams(name)').order('created_at')) as Promise<Profile[]>,
  });
}

export type PendingRequest = Tables<'sales'> & {
  product: { name: string } | null;
  seller: { full_name: string } | null;
};

export function useRequests(enabled = true) {
  return useQuery({
    queryKey: ['requests'],
    enabled,
    queryFn: () =>
      must(
        supabase
          .from('sales')
          .select('*, product:products(name), seller:profiles!sales_user_id_fkey(full_name)')
          .eq('status', 'pending')
          .order('created_at'),
      ) as Promise<PendingRequest[]>,
  });
}

export function useAudit() {
  return useQuery({
    queryKey: ['audit'],
    queryFn: () =>
      must(supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100)),
  });
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export function useRingSale() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { productId: number; qty: number }) =>
      // unit_price, unit_points and user_id are filled in by the prepare_sale trigger.
      must(
        supabase
          .from('sales')
          .insert({ product_id: v.productId, qty: v.qty } as TablesInsert<'sales'>)
          .select()
          .single(),
      ),
    onSettled: () => invalidateSales(client),
  });
}

export function useRequestCancel() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { saleId: number; reason: string }) =>
      must(supabase.from('sales').update({ status: 'pending', cancel_reason: v.reason }).eq('id', v.saleId).select()),
    onSettled: () => {
      invalidateSales(client);
      client.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useResolveRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { saleId: number; approve: boolean }) =>
      must(
        supabase
          .from('sales')
          .update({ status: v.approve ? 'cancelled' : 'ok' })
          .eq('id', v.saleId)
          .select(),
      ),
    onSettled: () => {
      invalidateSales(client);
      client.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export type ProductInput = Pick<Tables<'products'>, 'name' | 'price' | 'points' | 'category' | 'visible'>;

export function useSaveProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number | null; product: ProductInput }) =>
      v.id === null
        ? must(supabase.from('products').insert(v.product).select().single())
        : must(supabase.from('products').update(v.product).eq('id', v.id).select().single()),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['products'] });
      client.invalidateQueries({ queryKey: ['productSales'] });
      client.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useSetUserActive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { userId: string; active: boolean }) =>
      must(supabase.from('profiles').update({ active: v.active }).eq('id', v.userId).select()),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['profiles'] });
      client.invalidateQueries({ queryKey: ['leaderboard'] });
      client.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export type ContestInput = {
  name: string;
  type: ContestType;
  description: string;
  starts_on: string;
  ends_on: string;
  prize: string;
  target: number | null;
  product_id: number | null;
};

export function useCreateContest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: ContestInput) => must(supabase.from('contests').insert(v).select().single()),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['contests'] });
      client.invalidateQueries({ queryKey: ['standings'] });
      client.invalidateQueries({ queryKey: ['feed'] });
      client.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useSpin() {
  return useMutation({
    mutationFn: async () => (await must(supabase.rpc('spin_wheel')))[0],
  });
}

export function useSetSpinEvery() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (spinEvery: number) =>
      must(supabase.from('settings').update({ spin_every: spinEvery }).eq('id', true).select()),
    onMutate: (spinEvery) =>
      client.setQueryData<Tables<'settings'>>(['settings'], (s) => (s ? { ...s, spin_every: spinEvery } : s)),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['settings'] });
      client.invalidateQueries({ queryKey: ['spinStatus'] });
      client.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useSetProbability() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; probability: number }) =>
      must(supabase.from('spin_fields').update({ probability: v.probability }).eq('id', v.id).select()),
    onMutate: (v) =>
      client.setQueryData<Tables<'spin_fields'>[]>(['spinFields'], (fields) =>
        fields?.map((f) => (f.id === v.id ? { ...f, probability: v.probability } : f)),
      ),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['spinFields'] });
      client.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}
