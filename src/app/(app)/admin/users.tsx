import { ScrollView, View } from 'react-native';

import {
  Avatar,
  BackLink,
  Card,
  ListCard,
  ListRow,
  Notice,
  SBText,
  Screen,
  SectionLabel,
  Title,
  Toggle,
} from '@/components/sb/ui';
import { useLeaderboard, useProfiles, useSetUserActive } from '@/lib/api';
import { errorMessage } from '@/lib/supabase';
import { useSalesBell } from '@/store/salesbell-store';

export default function UsersScreen() {
  const { c, userId, toast } = useSalesBell();
  const profiles = useProfiles();
  const today = useLeaderboard('d').data ?? [];
  const setActive = useSetUserActive();
  const users = profiles.data ?? [];

  // Teams are user-created now, so derive them from who's on which team.
  const salesToday = new Map(today.map((r) => [r.user_id, r.sales]));
  const teams = [
    ...users
      .filter((u) => u.team_id !== null && u.team)
      .reduce((m, u) => {
        const t = m.get(u.team_id!) ?? { id: u.team_id!, name: u.team!.name, active: 0, sales: 0 };
        if (u.active) t.active++;
        t.sales += salesToday.get(u.id) ?? 0;
        return m.set(t.id, t);
      }, new Map<number, { id: number; name: string; active: number; sales: number }>())
      .values(),
  ].sort((a, b) => b.sales - a.sales || a.name.localeCompare(b.name));

  const toggle = (id: string, name: string, active: boolean) => {
    if (id === userId) return toast("You can't deactivate yourself", 'Ask another admin');
    setActive.mutate(
      { userId: id, active: !active },
      {
        onSuccess: () => toast(active ? 'User deactivated' : 'User reactivated', name),
        onError: (e) => toast("Couldn't update user", errorMessage(e)),
      },
    );
  };

  return (
    <Screen stack>
      <BackLink label="Admin" />
      <Title>Users & teams</Title>
      {teams.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20, flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4, gap: 8 }}>
          {teams.map((t) => (
            <Card key={t.id} style={{ width: 132, borderRadius: 16, padding: 12, gap: 2 }}>
              <SBText w={800} size={14} numberOfLines={1}>
                {t.name}
              </SBText>
              <SBText size={12} color={c.mut}>
                {t.active} active
              </SBText>
              <SBText w={700} size={12} color={c.accText}>
                {t.sales} sales today
              </SBText>
            </Card>
          ))}
        </ScrollView>
      ) : null}
      <View style={{ marginTop: 4, gap: 4 }}>
        <SectionLabel>USERS</SectionLabel>
        <SBText size={13} color={c.mut}>
          New people join by creating an account and starting or joining a team with its code. Deactivated users
          can&apos;t see or ring anything.
        </SBText>
      </View>
      {profiles.isError ? (
        <Notice onRetry={() => profiles.refetch()}>Couldn&apos;t load users.</Notice>
      ) : (
        <ListCard>
          {users.map((u, i) => (
            <ListRow key={u.id} last={i === users.length - 1} onPress={() => toggle(u.id, u.full_name, u.active)}>
              <Avatar name={u.full_name} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <SBText w={700}>
                  {u.full_name}
                  {u.id === userId ? ' (you)' : ''}
                </SBText>
                <SBText size={13} color={c.mut}>
                  {u.team?.name ?? 'No team'} · {u.role === 'admin' ? 'Admin' : 'Seller'}
                  {u.active ? '' : ' · inactive'}
                </SBText>
              </View>
              <Toggle on={u.active} />
            </ListRow>
          ))}
        </ListCard>
      )}
    </Screen>
  );
}
