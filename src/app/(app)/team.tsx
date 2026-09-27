import { router } from 'expo-router';
import { Share, View } from 'react-native';

import { Avatar, BackLink, Button, Card, ListCard, ListRow, Notice, SBText, Screen, SectionLabel } from '@/components/sb/ui';
import { useLeaderboard, useMyTeam, useRegenerateTeamCode } from '@/lib/api';
import { fmt } from '@/lib/salesbell';
import { errorMessage } from '@/lib/supabase';
import { useSalesBell } from '@/store/salesbell-store';

export default function TeamScreen() {
  const { c, userId, isAdmin, toast } = useSalesBell();
  const team = useMyTeam(userId);
  const today = useLeaderboard('d');
  const regen = useRegenerateTeamCode();
  const t = team.data;

  if (!t) {
    return (
      <Screen stack>
        <BackLink label="Profile" />
        {team.isPending ? null : (
          <Notice onRetry={() => team.refetch()}>Couldn&apos;t load your team.</Notice>
        )}
      </Screen>
    );
  }

  // Team names are unique, so the leaderboard's team column identifies members.
  const members = (today.data ?? []).filter((r) => r.team === t.name).sort((a, b) => b.sales - a.sales);
  const canRegen = t.created_by === userId || isAdmin;

  const share = () =>
    Share.share({ message: `Join my team "${t.name}" on SalesBell with the code ${t.code}` }).catch(() => {});

  const newCode = () =>
    regen.mutate(undefined, {
      onSuccess: (code) => toast('New team code', `${code}. The old code no longer works`),
      onError: (e) => toast("Couldn't change the code", errorMessage(e)),
    });

  return (
    <Screen stack>
      <BackLink label="Profile" />
      <View style={{ gap: 4 }}>
        <SBText w={800} size={30} ls={-0.02} lh={1.15}>
          {t.name}
        </SBText>
        <SBText size={14} color={c.mut}>
          {t.members} {t.members === 1 ? 'member' : 'members'} · {members.reduce((a, r) => a + r.sales, 0)} sales today
        </SBText>
      </View>

      <Card style={{ padding: 18, gap: 12, alignItems: 'center' }}>
        <SBText w={600} size={14} color={c.mut}>
          Team code
        </SBText>
        <SBText w={800} size={36} ls={0.2} selectable>
          {t.code}
        </SBText>
        <SBText size={13} color={c.mut} style={{ textAlign: 'center' }}>
          Colleagues enter this code when they sign up, or under Profile → Team → Switch team.
        </SBText>
        <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
          <View style={{ flex: 1 }}>
            <Button height={46} onPress={share}>
              Share code
            </Button>
          </View>
          {canRegen ? (
            <View style={{ flex: 1 }}>
              <Button tone="outline" height={46} onPress={newCode} loading={regen.isPending}>
                New code
              </Button>
            </View>
          ) : null}
        </View>
      </Card>

      <View style={{ gap: 8 }}>
        <SectionLabel>TODAY</SectionLabel>
        <ListCard>
          {members.map((r, i) => (
            <ListRow key={r.user_id} last={i === members.length - 1}>
              <SBText w={800} size={16} color={c.mut} style={{ width: 22 }}>
                {i + 1}
              </SBText>
              <Avatar name={r.full_name} me={r.user_id === userId} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <SBText w={700} numberOfLines={1}>
                  {r.full_name}
                  {r.user_id === userId ? ' (you)' : ''}
                </SBText>
                <SBText size={13} color={c.mut}>
                  {fmt(r.revenue)}
                </SBText>
              </View>
              <SBText w={800} size={18}>
                {r.sales}
              </SBText>
            </ListRow>
          ))}
        </ListCard>
      </View>

      <Button tone="outline" onPress={() => router.push('/team-switch')}>
        Switch team
      </Button>
    </Screen>
  );
}
