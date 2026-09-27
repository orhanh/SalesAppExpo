import { View } from 'react-native';

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
import { useLeaderboard, useProfiles, useSetUserActive, useTeams } from '@/lib/api';
import { errorMessage } from '@/lib/supabase';
import { useSalesBell } from '@/store/salesbell-store';

export default function UsersScreen() {
  const { c, userId, toast } = useSalesBell();
  const profiles = useProfiles();
  const teams = useTeams().data ?? [];
  const today = useLeaderboard('d').data ?? [];
  const setActive = useSetUserActive();
  const users = profiles.data ?? [];

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
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {teams.map((t) => (
          <Card key={t.id} style={{ flex: 1, minWidth: 0, borderRadius: 16, padding: 12, gap: 2 }}>
            <SBText w={800} size={14} numberOfLines={1}>
              {t.name.replace('Team ', '')}
            </SBText>
            <SBText size={12} color={c.mut}>
              {users.filter((u) => u.team_id === t.id && u.active).length} active
            </SBText>
            <SBText w={700} size={12} color={c.accText}>
              {today.filter((r) => r.team === t.name).reduce((a, r) => a + r.sales, 0)} sales today
            </SBText>
          </Card>
        ))}
      </View>
      <View style={{ marginTop: 4, gap: 4 }}>
        <SectionLabel>USERS</SectionLabel>
        <SBText size={13} color={c.mut}>
          New people join by creating an account in the app. Deactivated users can&apos;t see or ring anything.
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
                  {u.team?.name.replace('Team ', '') ?? 'No team'} · {u.role === 'admin' ? 'Admin' : 'Seller'}
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
