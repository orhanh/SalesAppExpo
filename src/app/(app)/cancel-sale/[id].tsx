import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, ErrorText, SBText, SheetBody } from '@/components/sb/ui';
import { useHistory, useRequestCancel } from '@/lib/api';
import { CANCEL_REASONS, fmt, relativeDay, timeLabel } from '@/lib/salesbell';
import { errorMessage } from '@/lib/supabase';
import { useSalesBell } from '@/store/salesbell-store';

export default function CancelSaleSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c, userId, toast } = useSalesBell();
  const history = useHistory(userId);
  const requestCancel = useRequestCancel();
  const [reason, setReason] = useState(0);
  const [err, setErr] = useState('');
  const sale = history.data?.find((x) => String(x.id) === id);

  if (!sale) return null;
  const when = new Date(sale.created_at);

  const send = () =>
    requestCancel.mutate(
      { saleId: sale.id, reason: CANCEL_REASONS[reason] },
      {
        onSuccess: () => {
          toast('Request sent', 'An admin will review it');
          router.back();
        },
        onError: (e) => setErr(errorMessage(e)),
      },
    );

  return (
    <SheetBody>
      <View style={{ gap: 4 }}>
        <SBText w={800} size={22}>
          Request cancellation
        </SBText>
        <SBText color={c.mut}>
          {sale.product?.name} × {sale.qty} · {fmt(sale.unit_price * sale.qty)} · {relativeDay(when)} {timeLabel(when)}
        </SBText>
      </View>
      <View style={{ gap: 8 }}>
        {CANCEL_REASONS.map((label, i) => {
          const sel = i === reason;
          return (
            <Pressable
              key={label}
              onPress={() => setReason(i)}
              accessibilityRole="radio"
              accessibilityState={{ selected: sel }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                height: 52,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: sel ? c.ink : c.line,
              }}>
              <SBText w={sel ? 700 : 600}>{label}</SBText>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: sel ? c.ink : 'transparent',
                  borderWidth: sel ? 0 : 2,
                  borderColor: c.sel,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {sel ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.card }} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <SBText size={13} color={c.mut} lh={1.4}>
        The sale keeps counting until an admin approves the request. The change is logged.
      </SBText>
      <ErrorText>{err}</ErrorText>
      <Button tone="warn" onPress={send} loading={requestCancel.isPending}>
        Send request
      </Button>
      <View style={{ marginTop: -6 }}>
        <Button tone="plain" height={44} onPress={() => router.back()}>
          Keep sale
        </Button>
      </View>
    </SheetBody>
  );
}
