import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar, BackLink, Button, ListCard, ListRow, Notice, SBText, Screen, SectionLabel, Tag } from '@/components/sb/ui';
import {
  useDeleteGroup,
  useGroup,
  useGroupInvites,
  useLeaderboard,
  useLeaveGroup,
  useRemoveMember,
} from '@/lib/api';
import { fmt } from '@/lib/salesbell';
import { errorMessage } from '@/lib/supabase';
import { useSalesBell } from '@/store/salesbell-store';

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { c, userId, isAdmin, toast } = useSalesBell();
  const group = useGroup(groupId);
  const board = useLeaderboard('d', groupId);
  const g = group.data;
  const manages = !!g && (g.owner_id === userId || isAdmin);
  const invites = useGroupInvites(manages ? groupId : null);
  const remove = useRemoveMember();
  const leave = useLeaveGroup();
  const del = useDeleteGroup();

  // Destructive actions need a second tap; this holds which one is waiting for it.
  const [armed, setArmed] = useState<string | null>(null);
  const confirm = (key: string, run: () => void) => {
    if (armed === key) {
      setArmed(null);
      run();
    } else {
      setArmed(key);
    }
  };

  if (!g) {
    return (
      <Screen stack>
        <BackLink label="Groups" />
        {group.isPending ? null : group.isError ? (
          <Notice onRetry={() => group.refetch()}>Couldn&apos;t load this group. It may have been deleted.</Notice>
        ) : null}
      </Screen>
    );
  }

  const rows = [...(board.data ?? [])].sort((a, b) => b.sales - a.sales || b.revenue - a.revenue);
  const pending = invites.data ?? [];
  const isMember = g.members.some((m) => m.user_id === userId);

  const done = (title: string, back = false) => () => {
    toast(title, g.name);
    if (back) router.back();
  };
  const failed = (e: unknown) => toast('Something went wrong', errorMessage(e));

  return (
    <Screen stack>
      <BackLink label="Groups" />
      <View style={{ gap: 4 }}>
        <SBText w={800} size={30} ls={-0.02} lh={1.15}>
          {g.name}
        </SBText>
        <SBText size={14} color={c.mut}>
          {rows.length} {rows.length === 1 ? 'member' : 'members'} · {rows.reduce((a, r) => a + r.sales, 0)} sales today
        </SBText>
      </View>

      {manages ? (
        <Button onPress={() => router.push({ pathname: '/groups/[id]/invite', params: { id } })}>Invite people</Button>
      ) : null}

      <View style={{ gap: 8 }}>
        <SectionLabel>TODAY</SectionLabel>
        {board.isError ? (
          <Notice onRetry={() => board.refetch()}>Couldn&apos;t load the standings.</Notice>
        ) : (
          <ListCard>
            {rows.map((r, i) => {
              const canRemove = manages && r.user_id !== g.owner_id;
              const key = 'remove:' + r.user_id;
              return (
                <ListRow
                  key={r.user_id}
                  last={i === rows.length - 1}
                  onPress={
                    canRemove
                      ? () =>
                          confirm(key, () =>
                            remove.mutate(
                              { groupId, userId: r.user_id },
                              { onSuccess: () => toast('Removed from group', r.full_name), onError: failed },
                            ),
                          )
                      : undefined
                  }>
                  <SBText w={800} size={16} color={c.mut} style={{ width: 22 }}>
                    {i + 1}
                  </SBText>
                  <Avatar name={r.full_name} me={r.user_id === userId} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <SBText w={700} numberOfLines={1}>
                      {r.full_name}
                      {r.user_id === userId ? ' (you)' : ''}
                    </SBText>
                    {armed === key ? (
                      <SBText w={700} size={13} color={c.warn}>
                        Tap again to remove
                      </SBText>
                    ) : (
                      <SBText size={13} color={c.mut}>
                        {fmt(r.revenue)}
                      </SBText>
                    )}
                  </View>
                  {r.user_id === g.owner_id ? <Tag tone="acc">Owner</Tag> : null}
                  <SBText w={800} size={18}>
                    {r.sales}
                  </SBText>
                </ListRow>
              );
            })}
          </ListCard>
        )}
        {manages ? (
          <SBText size={13} color={c.mut}>
            Tap a member to remove them.
          </SBText>
        ) : null}
      </View>

      {pending.length ? (
        <View style={{ gap: 8 }}>
          <SectionLabel>INVITED</SectionLabel>
          <ListCard>
            {pending.map((inv, i) => (
              <ListRow key={inv.id} last={i === pending.length - 1}>
                <Avatar name={inv.invitee?.full_name ?? '?'} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <SBText w={700} numberOfLines={1}>
                    {inv.invitee?.full_name}
                  </SBText>
                  <SBText size={13} color={c.mut} numberOfLines={1}>
                    {inv.invitee?.email}
                  </SBText>
                </View>
                <Tag>Waiting</Tag>
              </ListRow>
            ))}
          </ListCard>
        </View>
      ) : null}

      <ListCard>
        <ListRow onPress={() => router.navigate({ pathname: '/board', params: { group: id } })} style={{ height: 54 }}>
          <SBText w={600} size={16} style={{ flex: 1 }}>
            Week and month leaderboard
          </SBText>
          <SBText size={22} color={c.mut}>
            ›
          </SBText>
        </ListRow>
        {manages ? (
          <ListRow
            onPress={() => router.push({ pathname: '/groups/edit', params: { id } })}
            style={{ height: 54 }}>
            <SBText w={600} size={16}>
              Rename group
            </SBText>
          </ListRow>
        ) : null}
        {isMember ? (
          <Pressable
            onPress={() => confirm('leave', () => leave.mutate(groupId, { onSuccess: done('Left group', true), onError: failed }))}
            style={{ height: 54, justifyContent: 'center', paddingHorizontal: 16, borderBottomWidth: manages ? 1 : 0, borderBottomColor: c.line }}>
            <SBText w={600} size={16} color={c.warn}>
              {armed === 'leave'
                ? g.owner_id === userId && rows.length > 1
                  ? 'Tap again: ownership passes to the next member'
                  : 'Tap again to leave'
                : 'Leave group'}
            </SBText>
          </Pressable>
        ) : null}
        {manages ? (
          <Pressable
            onPress={() => confirm('delete', () => del.mutate(groupId, { onSuccess: done('Group deleted', true), onError: failed }))}
            style={{ height: 54, justifyContent: 'center', paddingHorizontal: 16 }}>
            <SBText w={600} size={16} color={c.warn}>
              {armed === 'delete' ? 'Tap again to delete for everyone' : 'Delete group'}
            </SBText>
          </Pressable>
        ) : null}
      </ListCard>
    </Screen>
  );
}
