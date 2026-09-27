import { router } from 'expo-router';
import { View } from 'react-native';

import { BackLink, ListCard, ListRow, Notice, SBText, Screen, Tag, Title } from '@/components/sb/ui';
import { useHistory, type SaleWithProduct } from '@/lib/api';
import { fmt, relativeDay, timeLabel } from '@/lib/salesbell';
import { useSalesBell } from '@/store/salesbell-store';

export default function HistoryScreen() {
  const { c, userId } = useSalesBell();
  const history = useHistory(userId);

  const groups: { label: string; items: SaleWithProduct[] }[] = [];
  for (const sale of history.data ?? []) {
    const label = relativeDay(new Date(sale.created_at));
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(sale);
    else groups.push({ label, items: [sale] });
  }

  return (
    <Screen stack gap={12}>
      <BackLink label="Profile" />
      <Title sub="Tap a sale to request cancellation. Sales can't be edited directly — an admin reviews every request.">
        Sales history
      </Title>
      {history.isError ? (
        <Notice onRetry={() => history.refetch()}>Couldn&apos;t load your sales.</Notice>
      ) : history.isPending ? null : groups.length === 0 ? (
        <Notice>No sales in the last 14 days.</Notice>
      ) : (
        groups.map(({ label, items }) => {
          const live = items.filter((x) => x.status !== 'cancelled');
          const n = live.reduce((a, x) => a + x.qty, 0);
          const rev = live.reduce((a, x) => a + x.unit_price * x.qty, 0);
          return (
            <View key={label} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
                <SBText w={700} size={13} color={c.mut} ls={0.06}>
                  {label.toUpperCase()}
                </SBText>
                <SBText w={600} size={13} color={c.mut}>
                  {n} sales · {fmt(rev)}
                </SBText>
              </View>
              <ListCard>
                {items.map((x, i) => (
                  <ListRow
                    key={x.id}
                    last={i === items.length - 1}
                    onPress={
                      x.status === 'ok'
                        ? () => router.push({ pathname: '/cancel-sale/[id]', params: { id: String(x.id) } })
                        : undefined
                    }>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'baseline' }}>
                        <SBText w={700}>{x.product?.name ?? 'Product'}</SBText>
                        <SBText size={14} color={c.mut}>
                          × {x.qty}
                        </SBText>
                      </View>
                      {x.status === 'pending' ? (
                        <Tag tone="warn">Cancellation requested</Tag>
                      ) : x.status === 'cancelled' ? (
                        <Tag>Cancelled by admin</Tag>
                      ) : (
                        <SBText size={13} color={c.mut}>
                          {timeLabel(new Date(x.created_at))} · +{x.unit_points * x.qty} pts
                        </SBText>
                      )}
                    </View>
                    <SBText w={700}>{fmt(x.unit_price * x.qty)}</SBText>
                  </ListRow>
                ))}
              </ListCard>
            </View>
          );
        })
      )}
    </Screen>
  );
}
