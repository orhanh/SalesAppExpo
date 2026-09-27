import { router } from 'expo-router';
import { View } from 'react-native';

import { BackLink, Button, Chevron, ListCard, ListRow, Notice, SBText, Screen, SectionLabel, Title } from '@/components/sb/ui';
import { useLeaderboard, useMyGroups, useMyInvites, useRespondToInvite } from '@/lib/api';
import { errorMessage } from '@/lib/supabase';
import { useSalesBell } from '@/store/salesbell-store';

export default function GroupsScreen() {
  const { c, userId, toast } = useSalesBell();
  const groups = useMyGroups(userId);
  const invites = useMyInvites(userId);
  const today = useLeaderboard('d').data ?? [];
  const respond = useRespondToInvite();

  const salesToday = new Map(today.map((r) => [r.user_id, r.sales]));

  const answer = (inviteId: number, accept: boolean, name: string) =>
    respond.mutate(
      { inviteId, accept },
      {
        onSuccess: () => toast(accept ? 'Joined group' : 'Invite declined', name),
        onError: (e) => toast("Couldn't answer invite", errorMessage(e)),
      },
    );

  const pending = invites.data ?? [];
  const mine = groups.data ?? [];

  return (
    <Screen stack>
      <BackLink label="Profile" />
      <Title sub="Compete with the people you choose. Every sale still counts for the whole company.">Sales groups</Title>

      {pending.length ? (
        <View style={{ gap: 8 }}>
          <SectionLabel>INVITES</SectionLabel>
          <ListCard>
            {pending.map((inv, i) => (
              <View
                key={inv.id}
                style={{
                  padding: 16,
                  gap: 10,
                  borderBottomWidth: i === pending.length - 1 ? 0 : 1,
                  borderBottomColor: c.line,
                }}>
                <View style={{ gap: 2 }}>
                  <SBText w={700} size={16}>
                    {inv.group?.name ?? 'A group'}
                  </SBText>
                  <SBText size={13} color={c.mut}>
                    Invited by {inv.inviter?.full_name ?? 'someone'}
                  </SBText>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Button height={44} loading={respond.isPending} onPress={() => answer(inv.id, true, inv.group?.name ?? '')}>
                      Join
                    </Button>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      tone="outline"
                      height={44}
                      loading={respond.isPending}
                      onPress={() => answer(inv.id, false, inv.group?.name ?? '')}>
                      Decline
                    </Button>
                  </View>
                </View>
              </View>
            ))}
          </ListCard>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <SectionLabel>MY GROUPS</SectionLabel>
        {groups.isError ? (
          <Notice onRetry={() => groups.refetch()}>Couldn&apos;t load your groups.</Notice>
        ) : groups.isPending ? null : mine.length === 0 ? (
          <Notice>You&apos;re not in any groups yet. Create one and invite your colleagues.</Notice>
        ) : (
          <ListCard>
            {mine.map((g, i) => {
              const members = g.members.filter((m) => m.profile?.active);
              const sales = members.reduce((a, m) => a + (salesToday.get(m.user_id) ?? 0), 0);
              return (
                <ListRow
                  key={g.id}
                  last={i === mine.length - 1}
                  onPress={() => router.push({ pathname: '/groups/[id]', params: { id: String(g.id) } })}>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <SBText w={700} size={16} numberOfLines={1}>
                      {g.name}
                    </SBText>
                    <SBText size={13} color={c.mut}>
                      {members.length} {members.length === 1 ? 'member' : 'members'} · {sales} sales today
                      {g.owner_id === userId ? ' · Owner' : ''}
                    </SBText>
                  </View>
                  <Chevron />
                </ListRow>
              );
            })}
          </ListCard>
        )}
      </View>

      <Button onPress={() => router.push('/groups/edit')}>New group</Button>
    </Screen>
  );
}
