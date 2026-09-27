import { useState } from 'react';
import { View } from 'react-native';

import { GroupScope, useGroupScope } from '@/components/sb/group-scope';
import { Avatar, Card, Chips, Notice, SBText, Screen, Segmented } from '@/components/sb/ui';
import { useLeaderboard } from '@/lib/api';
import { PERIODS, firstName, fmt, type LeaderRow, type Metric, type Period } from '@/lib/salesbell';
import { useSalesBell } from '@/store/salesbell-store';

type Row = LeaderRow & { rank: number; me: boolean; label: string; val: string };

function Podium({ row, place }: { row?: Row; place: 1 | 2 | 3 }) {
  const { c } = useSalesBell();
  const first = place === 1;
  const height = { 1: 92, 2: 64, 3: 46 }[place];
  return (
    <View style={{ flex: first ? 1.15 : 1, alignItems: 'center', gap: 6 }}>
      {row ? (
        <>
          <Avatar name={row.full_name} size={first ? 64 : 52} me={row.me} weight={800} />
          <SBText w={first ? 800 : 700} size={first ? 16 : 15} numberOfLines={1}>
            {row.label}
          </SBText>
          <SBText size={13} color={c.mut} style={{ marginTop: -4 }}>
            {row.val}
          </SBText>
        </>
      ) : null}
      <View
        style={{
          alignSelf: 'stretch',
          height,
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          borderBottomLeftRadius: 4,
          borderBottomRightRadius: 4,
          backgroundColor: first ? c.acc : c.card,
          boxShadow: first ? undefined : c.shadow,
          alignItems: 'center',
          paddingTop: place === 3 ? 8 : 10,
        }}>
        <SBText w={800} size={{ 1: 30, 2: 24, 3: 22 }[place]} color={first ? c.accInk : c.mut}>
          {place}
        </SBText>
      </View>
    </View>
  );
}

export default function BoardScreen() {
  const { c, userId } = useSalesBell();
  const [period, setPeriod] = useState<Period>('d');
  const [metric, setMetric] = useState<Metric>('sales');
  const scope = useGroupScope();
  const board = useLeaderboard(period, scope.group?.id);

  const rows: Row[] = [...(board.data ?? [])]
    .sort((a, b) => b[metric] - a[metric] || (a.user_id === userId ? -1 : b.user_id === userId ? 1 : 0))
    .map((r, i) => ({
      ...r,
      rank: i + 1,
      me: r.user_id === userId,
      label: r.user_id === userId ? 'You' : firstName(r.full_name),
      val: metric === 'revenue' ? fmt(r.revenue) : metric === 'points' ? r.points + ' pts' : r.sales + ' sales',
    }));

  return (
    <Screen>
      <SBText w={800} size={30} ls={-0.02}>
        Leaderboard
      </SBText>
      <GroupScope groups={scope.groups} group={scope.group} onChange={scope.setGroup} />
      <Segmented options={PERIODS} value={period} onChange={setPeriod} />
      <Chips
        options={[
          ['sales', 'Sales'],
          ['revenue', 'Revenue'],
          ['points', 'Points'],
        ]}
        value={metric}
        onChange={setMetric}
      />
      {board.isError ? (
        <Notice onRetry={() => board.refetch()}>Couldn&apos;t load the leaderboard.</Notice>
      ) : board.isPending ? null : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 6 }}>
            <Podium row={rows[1]} place={2} />
            <Podium row={rows[0]} place={1} />
            <Podium row={rows[2]} place={3} />
          </View>
          {rows.length > 3 ? (
            <Card style={{ borderRadius: 20, paddingVertical: 4, overflow: 'hidden' }}>
              {rows.slice(3).map((r) => (
                <View
                  key={r.user_id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    backgroundColor: r.me ? c.accSoft : undefined,
                  }}>
                  <SBText w={r.me ? 800 : 700} color={r.me ? c.accText : c.mut} style={{ width: 22 }}>
                    {r.rank}
                  </SBText>
                  <Avatar name={r.full_name} me={r.me} weight={r.me ? 800 : 700} />
                  <View style={{ flex: 1 }}>
                    <SBText w={r.me ? 800 : 600}>{r.me ? 'You' : r.full_name}</SBText>
                    <SBText size={12} color={c.mut}>
                      {r.team}
                    </SBText>
                  </View>
                  <SBText w={r.me ? 800 : 700}>{r.val}</SBText>
                </View>
              ))}
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}
