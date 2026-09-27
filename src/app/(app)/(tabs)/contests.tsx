import { router } from 'expo-router';
import { View } from 'react-native';

import { Card, Notice, ProgressBar, SBText, Screen, SectionLabel, Tag } from '@/components/sb/ui';
import { useContestList, type ContestView } from '@/hooks/use-contest-list';
import { CONTEST_TYPES, type ContestStatus, type ContestType } from '@/lib/salesbell';
import { useSalesBell } from '@/store/salesbell-store';

function ContestCard({ contest: k }: { contest: ContestView }) {
  const { c } = useSalesBell();
  return (
    <Card
      onPress={() => router.push({ pathname: '/contest/[id]', params: { id: String(k.id) } })}
      flat={k.status === 'ended'}
      style={{ borderRadius: 20, padding: 16, gap: k.status === 'active' ? 10 : 8, opacity: k.status === 'ended' ? 0.8 : 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tag>{CONTEST_TYPES[k.type as ContestType]?.label ?? k.type}</Tag>
        <SBText w={500} size={13} color={c.mut}>
          {k.when}
        </SBText>
      </View>
      <SBText w={700} size={19} ls={-0.01}>
        {k.name}
      </SBText>
      {k.status === 'active' ? (
        <>
          <ProgressBar pct={k.my.pct} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <SBText w={700} size={14} color={c.accText}>
              {k.my.line}
            </SBText>
            <SBText size={14} color={c.mut} style={{ flexShrink: 1, textAlign: 'right' }}>
              Prize: {k.prize}
            </SBText>
          </View>
        </>
      ) : k.status === 'upcoming' ? (
        <SBText size={14} color={c.mut}>
          Prize: {k.prize}
        </SBText>
      ) : (
        <SBText size={14} color={c.mut}>
          Winner:{' '}
          <SBText w={700} size={14}>
            {k.winner ?? 'No entries'}
          </SBText>
        </SBText>
      )}
    </Card>
  );
}

const SECTIONS: [string, ContestStatus][] = [
  ['ACTIVE', 'active'],
  ['UPCOMING', 'upcoming'],
  ['ENDED', 'ended'],
];

export default function ContestsScreen() {
  const list = useContestList();
  const all = list.data ?? [];
  return (
    <Screen gap={12}>
      <SBText w={800} size={30} ls={-0.02}>
        Contests
      </SBText>
      {list.isError ? (
        <Notice onRetry={list.refetch}>Couldn&apos;t load contests.</Notice>
      ) : list.isPending ? null : all.length === 0 ? (
        <Notice>No contests yet.</Notice>
      ) : (
        SECTIONS.map(([label, status], i) => {
          // Newest ended contests first; others by start date.
          const items = all.filter((k) => k.status === status);
          if (status === 'ended') items.reverse();
          if (!items.length) return null;
          return (
            <View key={status} style={{ gap: 12 }}>
              <SectionLabel style={{ marginTop: i === 0 ? 4 : 8 }}>{label}</SectionLabel>
              {items.map((k) => (
                <ContestCard key={k.id} contest={k} />
              ))}
            </View>
          );
        })
      )}
    </Screen>
  );
}
