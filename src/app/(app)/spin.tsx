import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';

import { SPIN_MS, SpinWheel, targetDegrees } from '@/components/sb/spin-wheel';
import { BackLink, ListCard, ListRow, Notice, SBText, Screen, SectionLabel, Title } from '@/components/sb/ui';
import { usePrizes, useSpin, useSpinFields, useSpinStatus } from '@/lib/api';
import { relativeDay, spinsLabel } from '@/lib/salesbell';
import { errorMessage } from '@/lib/supabase';
import { useSalesBell } from '@/store/salesbell-store';

const pop = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: -16 }, { scale: 0.96 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
}).duration(350);

export default function SpinScreen() {
  const s = useSalesBell();
  const { c, userId } = s;
  const client = useQueryClient();
  const fields = useSpinFields();
  const status = useSpinStatus();
  const prizes = usePrizes(userId);
  const spinWheel = useSpin();
  const [degrees, setDegrees] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ label: string; won: boolean } | null>(null);
  // Not cleared on unmount: a spin that's already been drawn must still be announced.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const wheel = fields.data ?? [];
  const avail = status.data?.available ?? 0;
  const every = status.data?.spin_every ?? 5;
  const need = every - ((status.data?.sold_today ?? 0) % every);

  const spin = () => {
    if (spinning || avail < 1 || !wheel.length) return;
    setSpinning(true);
    setResult(null);
    // The server draws the prize; the wheel then animates to where it landed.
    spinWheel.mutate(undefined, {
      onSuccess: (r) => {
        const index = Math.max(0, wheel.findIndex((f) => f.position === r.slot));
        setDegrees((d) => targetDegrees(d, index, wheel.length));
        timer.current = setTimeout(() => {
          setSpinning(false);
          setResult({ label: r.label, won: r.won });
          if (r.won) s.playBell();
          s.toast(r.won ? `You won ${r.label}!` : 'No win this time', r.won ? 'Added to your prizes' : 'Keep selling for another spin');
          client.invalidateQueries({ queryKey: ['spinStatus'] });
          client.invalidateQueries({ queryKey: ['prizes'] });
          client.invalidateQueries({ queryKey: ['feed'] });
        }, SPIN_MS + 100);
      },
      onError: (e) => {
        setSpinning(false);
        s.toast("Couldn't spin", errorMessage(e));
        client.invalidateQueries({ queryKey: ['spinStatus'] });
      },
    });
  };

  return (
    <Screen stack>
      <BackLink label="Home" />
      <Title sub={`You earn 1 spin for every ${every} sales today.`}>Spin to Win</Title>
      <View
        style={{
          alignSelf: 'center',
          height: 36,
          paddingHorizontal: 16,
          borderRadius: 18,
          backgroundColor: avail > 0 ? c.accSoft : c.el,
          justifyContent: 'center',
        }}>
        <SBText w={avail > 0 ? 800 : 700} size={14} color={avail > 0 ? c.accText : c.mut}>
          {avail > 0 ? spinsLabel(avail) + ' available' : `Sell ${need} more to earn a spin`}
        </SBText>
      </View>
      {fields.isError ? (
        <Notice onRetry={() => fields.refetch()}>Couldn&apos;t load the wheel.</Notice>
      ) : wheel.length ? (
        <SpinWheel
          fields={wheel}
          degrees={degrees}
          hubLabel={spinning ? '···' : avail > 0 ? 'SPIN' : 'LOCKED'}
          onSpin={spin}
        />
      ) : null}
      {result && !spinning ? (
        <Animated.View
          entering={pop}
          style={{ backgroundColor: c.accSoft, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 2, alignItems: 'center' }}>
          <SBText w={700} size={13} color={c.accText}>
            {result.won ? 'You won' : 'No win this time'}
          </SBText>
          <SBText w={800} size={22}>
            {result.won ? result.label : 'Better luck next spin'}
          </SBText>
        </Animated.View>
      ) : null}
      <SectionLabel>YOUR PRIZES</SectionLabel>
      {prizes.data?.length ? (
        <ListCard>
          {prizes.data.map((z, i) => (
            <ListRow key={z.id} last={i === prizes.data.length - 1} style={{ justifyContent: 'space-between' }}>
              <SBText w={700}>{z.label}</SBText>
              <SBText size={13} color={c.mut}>
                {relativeDay(new Date(z.created_at))}
              </SBText>
            </ListRow>
          ))}
        </ListCard>
      ) : prizes.isPending ? null : (
        <Notice>No prizes yet. Every spin could be the one!</Notice>
      )}
    </Screen>
  );
}
