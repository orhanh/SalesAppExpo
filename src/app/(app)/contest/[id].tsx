import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { BackLink, Card, Grid, Notice, ProgressBar, SBText, Screen, StatTile, Tag } from '@/components/sb/ui';
import { useContestList } from '@/hooks/use-contest-list';
import { CONTEST_TYPES, dayLabel, parseDate, type ContestType } from '@/lib/salesbell';
import { useSalesBell } from '@/store/salesbell-store';

export default function ContestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useSalesBell();
  const list = useContestList();
  const k = list.data?.find((x) => String(x.id) === id);

  if (!k) {
    return (
      <Screen stack>
        <BackLink label="Contests" />
        {list.isPending ? null : list.isError ? (
          <Notice onRetry={list.refetch}>Couldn&apos;t load this contest.</Notice>
        ) : (
          <Notice>This contest no longer exists.</Notice>
        )}
      </Screen>
    );
  }

  const type = CONTEST_TYPES[k.type as ContestType];
  const statusText = k.status === 'ended' ? (k.winner ? `Won by ${k.winner}` : 'No entries') : k.when;

  return (
    <Screen stack>
      <BackLink label="Contests" />
      <View style={{ gap: 8 }}>
        <Tag>{type?.label ?? k.type}</Tag>
        <SBText w={800} size={28} ls={-0.02} lh={1.1}>
          {k.name}
        </SBText>
        <SBText color={c.mut} lh={1.45}>
          {k.description}
        </SBText>
      </View>
      <Grid>
        {[
          ['Starts', dayLabel(parseDate(k.starts_on))],
          ['Ends', dayLabel(parseDate(k.ends_on))],
          ['Measured by', type?.measure ?? '—'],
          ['Who', 'All sellers'],
        ].map(([label, val]) => (
          <StatTile key={label} label={label} val={val} />
        ))}
      </Grid>
      <View
        style={{
          backgroundColor: c.accSoft,
          borderRadius: 18,
          paddingVertical: 14,
          paddingHorizontal: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <SBText w={700} size={12} color={c.accText}>
            PRIZE
          </SBText>
          <SBText w={800} size={19}>
            {k.prize}
          </SBText>
        </View>
        <SBText w={700} size={14} color={c.accText} style={{ textAlign: 'right' }}>
          {statusText}
        </SBText>
      </View>

      {k.status === 'upcoming' ? (
        <Card style={{ padding: 16 }}>
          <SBText color={c.mut} lh={1.45}>
            Standings appear when the contest starts. Your sales count automatically — no sign-up needed.
          </SBText>
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
            <SBText w={800} size={18}>
              Standings
            </SBText>
            <SBText w={700} size={14} color={c.accText}>
              {k.my.line}
            </SBText>
          </View>
          <Card style={{ borderRadius: 20, paddingVertical: 6, overflow: 'hidden' }}>
            {k.rows.map((r) => (
              <View
                key={r.userId}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  backgroundColor: r.me ? c.accSoft : undefined,
                }}>
                <SBText w={r.me ? 800 : 700} color={r.me ? c.accText : c.mut} style={{ width: 20 }}>
                  {r.rank}
                </SBText>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <SBText w={r.me ? 800 : 600} numberOfLines={1} style={{ flexShrink: 1 }}>
                      {r.me ? 'You' : r.name}
                    </SBText>
                    <SBText w={r.me ? 800 : 700}>{r.val}</SBText>
                  </View>
                  <ProgressBar pct={r.pct} height={6} color={r.me ? c.acc : c.faint} />
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
