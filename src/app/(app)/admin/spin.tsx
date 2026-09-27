import { Pressable, View } from 'react-native';

import {
  BackLink,
  Card,
  ListCard,
  ListRow,
  Notice,
  SBText,
  Screen,
  SectionLabel,
  StepButton,
  Title,
  Toggle,
} from '@/components/sb/ui';
import { useSetProbability, useSetSpinEnabled, useSetSpinEvery, useSettings, useSpinFields } from '@/lib/api';
import { errorMessage } from '@/lib/supabase';
import { useSalesBell } from '@/store/salesbell-store';

export default function SpinConfigScreen() {
  const { c, toast } = useSalesBell();
  const settings = useSettings();
  const fields = useSpinFields();
  const setEvery = useSetSpinEvery();
  const setProb = useSetProbability();
  const setEnabled = useSetSpinEnabled();
  const enabled = settings.data?.spin_enabled ?? true;

  const every = settings.data?.spin_every ?? 5;
  const wheel = fields.data ?? [];
  const total = wheel.reduce((a, w) => a + w.probability, 0);
  const onError = (e: unknown) => toast("Couldn't save", errorMessage(e));

  const changeEvery = (d: number) => {
    const next = Math.max(1, Math.min(20, every + d));
    if (next !== every) setEvery.mutate(next, { onError });
  };

  const changeProb = (id: number, current: number, d: number) => {
    const next = Math.max(0, Math.min(100, current + d));
    if (next !== current) setProb.mutate({ id, probability: next }, { onError });
  };

  return (
    <Screen stack>
      <BackLink label="Admin" />
      <Title>Spin to Win wheel</Title>
      <Card>
        <Pressable
          onPress={() =>
            setEnabled.mutate(!enabled, {
              onSuccess: () => toast(enabled ? 'Spin to Win turned off' : 'Spin to Win turned on', ''),
              onError,
            })
          }
          accessibilityRole="switch"
          accessibilityState={{ checked: enabled }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <SBText w={700}>Spin to Win</SBText>
            <SBText size={13} color={c.mut} lh={1.35}>
              {enabled
                ? 'Sellers earn spins and can spin the wheel.'
                : 'Hidden from sellers. Turning it back on restores spins earned today.'}
            </SBText>
          </View>
          <Toggle on={enabled} />
        </Pressable>
      </Card>
      <Card
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 10,
          paddingLeft: 16,
          paddingRight: 12,
        }}>
        <View style={{ gap: 2 }}>
          <SBText w={700}>Earn rule</SBText>
          <SBText size={13} color={c.mut}>
            1 spin per {every} sales
          </SBText>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <StepButton label="−" onPress={() => changeEvery(-1)} />
          <StepButton label="+" onPress={() => changeEvery(1)} />
        </View>
      </Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
        <SectionLabel>FIELDS & ODDS</SectionLabel>
        <SBText w={700} size={13} color={total === 100 ? c.accText : c.warn}>
          Total {total}%
        </SBText>
      </View>
      {fields.isError ? (
        <Notice onRetry={() => fields.refetch()}>Couldn&apos;t load the wheel.</Notice>
      ) : (
        <ListCard>
          {wheel.map((w, i) => (
            <ListRow key={w.id} last={i === wheel.length - 1} style={{ paddingVertical: 8, paddingRight: 12 }}>
              <SBText w={600} style={{ flex: 1 }}>
                {w.label}
              </SBText>
              <StepButton label="−" onPress={() => changeProb(w.id, w.probability, -1)} />
              <SBText w={800} style={{ width: 48, textAlign: 'center' }}>
                {w.probability}%
              </SBText>
              <StepButton label="+" onPress={() => changeProb(w.id, w.probability, 1)} />
            </ListRow>
          ))}
        </ListCard>
      )}
      <SBText size={13} color={c.mut} lh={1.4}>
        Odds are relative, so they don&apos;t have to add up to exactly 100%. Every change is logged.
      </SBText>
    </Screen>
  );
}
