import { View } from 'react-native';

import { BackLink, Button, Card, Notice, SBText, Screen, Title } from '@/components/sb/ui';
import { useRequests, useResolveRequest } from '@/lib/api';
import { fmt, relativeDay, timeLabel } from '@/lib/salesbell';
import { errorMessage } from '@/lib/supabase';
import { useSalesBell } from '@/store/salesbell-store';

export default function RequestsScreen() {
  const { c, toast } = useSalesBell();
  const requests = useRequests();
  const resolve = useResolveRequest();
  const pending = requests.data ?? [];

  const decide = (saleId: number, approve: boolean) =>
    resolve.mutate(
      { saleId, approve },
      {
        onSuccess: () =>
          toast(approve ? 'Sale cancelled' : 'Request rejected', approve ? 'Totals updated' : 'The sale still counts'),
        onError: (e) => toast("Couldn't update the sale", errorMessage(e)),
      },
    );

  return (
    <Screen stack>
      <BackLink label="Admin" />
      <Title sub="Approving removes the sale from all totals and contests. Every decision is logged.">
        Cancellation requests
      </Title>
      {requests.isError ? (
        <Notice onRetry={() => requests.refetch()}>Couldn&apos;t load requests.</Notice>
      ) : requests.isPending ? null : pending.length === 0 ? (
        <Notice>No requests waiting.</Notice>
      ) : (
        pending.map((x) => {
          const when = new Date(x.created_at);
          const busy = resolve.isPending && resolve.variables?.saleId === x.id;
          return (
            <Card key={x.id} style={{ borderRadius: 20, padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <SBText w={700}>{x.seller?.full_name ?? 'Seller'}</SBText>
                <SBText size={13} color={c.mut}>
                  {relativeDay(when)} {timeLabel(when)}
                </SBText>
              </View>
              <SBText w={700} size={17}>
                {x.product?.name} × {x.qty} · {fmt(x.unit_price * x.qty)}
              </SBText>
              <SBText size={14} color={c.mut}>
                Reason: {x.cancel_reason || 'Not given'}
              </SBText>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Button height={48} loading={busy} onPress={() => decide(x.id, true)}>
                    Approve
                  </Button>
                </View>
                <View style={{ flex: 1 }}>
                  <Button height={48} tone="outline" loading={busy} onPress={() => decide(x.id, false)}>
                    Reject
                  </Button>
                </View>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
