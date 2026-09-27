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
      must(supabase.from('profiles').select('*, team:teams!profiles_team_id_fkey(name)').eq('id', userId!).single()) as Promise<Profile>,
  });
}

export type MyTeam = { id: number; name: string; code: string; created_by: string; members: number };

/** The current user's team, including its join code (only members can see it). */
export function useMyTeam(userId: string | undefined) {
  return useQuery({
    queryKey: ['myTeam', userId],
    enabled: !!userId,
    queryFn: async () => ((await must(supabase.rpc('my_team')))[0] ?? null) as MyTeam | null,
  });
}

/** Which team a join code belongs to. Works before sign-up. */
export function useTeamPreview(code: string) {
  const clean = code.trim().toUpperCase();
  return useQuery({
    queryKey: ['teamPreview', clean],
    enabled: clean.length === 6,
    staleTime: 60_000,
    queryFn: async () => (await must(supabase.rpc('team_preview', { p_code: clean })))[0] ?? null,
  });
}

export async function teamNameTaken(name: string) {
  return must(supabase.rpc('team_name_taken', { p_name: name.trim() }));
}

function invalidateTeams(client: QueryClient) {
  return Promise.all(
    [['profile'], ['myTeam'], ['profiles'], ['leaderboard']].map((queryKey) => client.invalidateQueries({ queryKey })),
  );
}

export function useJoinTeam() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => must(supabase.rpc('join_team', { p_code: code.trim().toUpperCase() })),
    onSettled: () => invalidateTeams(client),
  });
}

export function useCreateTeam() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => (await must(supabase.rpc('create_team', { p_name: name.trim() })))[0],
    onSettled: () => invalidateTeams(client),
  });
}

export function useRegenerateTeamCode() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => must(supabase.rpc('regenerate_team_code')),
    onSettled: () => invalidateTeams(client),
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
    // Deleted products that had sales are kept (archived) for history, but never listed.
    queryFn: () => must(supabase.from('products').select('*').is('deleted_at', null).order('id')),
  });
}

/** Company-wide, or only the members of one sales group. */
export function useLeaderboard(period: Period, groupId?: number | null) {
  return useQuery({
    queryKey: ['leaderboard', period, groupId ?? null],
    queryFn: () => must(supabase.rpc('leaderboard', { p_period: period, p_group_id: groupId ?? undefined })),
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

/** The latest feed events, optionally only those by the given people (a group's members). */
export function useFeed(userIds?: string[]) {
  return useQuery({
    queryKey: ['feed', userIds ?? null],
    queryFn: () => {
      let q = supabase.from('feed_events').select('*, profile:profiles(full_name)');
      if (userIds) q = q.in('user_id', userIds);
      return must(q.order('created_at', { ascending: false }).limit(50)) as Promise<FeedItem[]>;
    },
  });
}

export type LatestSale = {
  id: number;
  created_at: string;
  sub: string;
  user_id: string;
  profile: { full_name: string; team_id: number | null };
  sale: { qty: number; unit_price: number } | null;
};

/** The team's most recent sale today, or null. Refreshed live with the feed. */
export function useLatestSale(teamId: number | null | undefined) {
  return useQuery({
    queryKey: ['feed', 'latest', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('feed_events')
        .select('id, created_at, sub, user_id, profile:profiles!inner(full_name, team_id), sale:sales(qty, unit_price)')
        .eq('kind', 'bell')
        // RLS already limits sellers to their team; admins can read every team, so filter explicitly.
        .eq('profile.team_id', teamId!)
        .gte('created_at', midnight.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as LatestSale | null;
    },
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
      must(supabase.from('profiles').select('*, team:teams!profiles_team_id_fkey(name)').order('created_at')) as Promise<Profile[]>,
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

/** Takes back a just-rung sale; the server allows it for 15 seconds, no admin needed. */
export function useUndoSale() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (saleId: number) => must(supabase.rpc('undo_sale', { p_sale_id: saleId })),
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

/** Deletes a product, or archives it if it has sales or is used by a contest. */
export function useDeleteProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await must(supabase.rpc('delete_product', { p_product_id: id }))) as 'deleted' | 'archived',
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

/** Turns Spin to Win on or off for everyone. */
export function useSetSpinEnabled() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) =>
      must(supabase.from('settings').update({ spin_enabled: enabled }).eq('id', true).select()),
    onMutate: (enabled) =>
      client.setQueryData<Tables<'settings'>>(['settings'], (s) => (s ? { ...s, spin_enabled: enabled } : s)),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['settings'] });
      client.invalidateQueries({ queryKey: ['audit'] });
    },
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

// ---------------------------------------------------------------------------
// Sales groups
// ---------------------------------------------------------------------------

export type GroupMember = Tables<'group_members'> & { profile: { full_name: string; active: boolean } | null };
export type Group = Tables<'groups'> & { members: GroupMember[] };
export type GroupInvite = Tables<'group_invites'> & {
  group: { name: string } | null;
  inviter: { full_name: string } | null;
};

const GROUP_SELECT = '*, members:group_members(*, profile:profiles(full_name, active))';

/** Groups the current user belongs to, with their members. */
export function useMyGroups(userId: string | undefined) {
  return useQuery({
    queryKey: ['groups', 'mine', userId],
    enabled: !!userId,
    queryFn: async () => {
      const mine = await must(supabase.from('group_members').select('group_id').eq('user_id', userId!));
      if (!mine.length) return [] as Group[];
      return must(
        supabase
          .from('groups')
          .select(GROUP_SELECT)
          .in('id', mine.map((m) => m.group_id))
          .order('name'),
      ) as Promise<Group[]>;
    },
  });
}

export function useGroup(id: number | null) {
  return useQuery({
    queryKey: ['groups', 'one', id],
    enabled: id !== null,
    queryFn: () => must(supabase.from('groups').select(GROUP_SELECT).eq('id', id!).single()) as Promise<Group>,
  });
}

/** Invites waiting for the current user to accept or decline. */
export function useMyInvites(userId: string | undefined) {
  return useQuery({
    queryKey: ['invites', 'mine', userId],
    enabled: !!userId,
    queryFn: () =>
      must(
        supabase
          .from('group_invites')
          .select('*, group:groups(name), inviter:profiles!group_invites_invited_by_fkey(full_name)')
          .eq('invitee_id', userId!)
          .order('created_at', { ascending: false }),
      ) as Promise<GroupInvite[]>,
  });
}

/** Invites a group's owner has sent that haven't been answered yet. */
export function useGroupInvites(groupId: number | null) {
  return useQuery({
    queryKey: ['invites', 'group', groupId],
    enabled: groupId !== null,
    queryFn: () =>
      must(
        supabase
          .from('group_invites')
          .select('*, invitee:profiles!group_invites_invitee_id_fkey(full_name, email)')
          .eq('group_id', groupId!),
      ) as Promise<(Tables<'group_invites'> & { invitee: { full_name: string; email: string } | null })[]>,
  });
}

export function invalidateGroups(client: QueryClient = queryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: ['groups'] }),
    client.invalidateQueries({ queryKey: ['invites'] }),
    client.invalidateQueries({ queryKey: ['leaderboard'] }),
    client.invalidateQueries({ queryKey: ['feed'] }),
  ]);
}

function useGroupMutation<V, R>(fn: (v: V) => Promise<R>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => invalidateGroups(client) });
}

export const useCreateGroup = () =>
  useGroupMutation((name: string) => must(supabase.rpc('create_group', { p_name: name })));

export const useRenameGroup = () =>
  useGroupMutation((v: { groupId: number; name: string }) =>
    must(supabase.rpc('rename_group', { p_group_id: v.groupId, p_name: v.name })),
  );

export const useDeleteGroup = () =>
  useGroupMutation((groupId: number) => must(supabase.rpc('delete_group', { p_group_id: groupId })));

export const useLeaveGroup = () =>
  useGroupMutation((groupId: number) => must(supabase.rpc('leave_group', { p_group_id: groupId })));

export const useRemoveMember = () =>
  useGroupMutation((v: { groupId: number; userId: string }) =>
    must(supabase.rpc('remove_member', { p_group_id: v.groupId, p_user_id: v.userId })),
  );

export const useInviteToGroup = () =>
  useGroupMutation((v: { groupId: number; userId: string }) =>
    must(supabase.rpc('invite_to_group', { p_group_id: v.groupId, p_user_id: v.userId })),
  );

export const useRespondToInvite = () =>
  useGroupMutation((v: { inviteId: number; accept: boolean }) =>
    must(supabase.rpc('respond_to_invite', { p_invite_id: v.inviteId, p_accept: v.accept })),
  );

/** Invites by email; people without an account get a sign-up email from Supabase Auth. */
export const useInviteByEmail = () =>
  useGroupMutation(async (v: { groupId: number; email: string; redirectTo: string }) => {
    const { data, error } = await supabase.functions.invoke<{ status: 'invited' | 'emailed' }>('invite-to-group', {
      body: v,
    });
    if (error) {
      // Non-2xx responses carry the reason in the JSON body.
      const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
      throw new Error(body?.error ?? error.message);
    }
    return data!.status;
  });
