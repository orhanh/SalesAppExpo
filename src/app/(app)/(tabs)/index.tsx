import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { BellConfetti, BellRings } from '@/components/sb/bell-celebration';
import { BellIcon } from '@/components/sb/bell-icon';
import { LatestSale } from '@/components/sb/latest-sale';
import { SpinGlyph } from '@/components/sb/spin-wheel';
import { Avatar, Card, Notice, SBText, Screen } from '@/components/sb/ui';
import { useLeaderboard, useMyInvites, useProducts, useRingSale, useSettings, useSpinStatus, useUndoSale } from '@/lib/api';
import type { Tables } from '@/lib/database.types';
import { firstName, fmt, ptsLabel, spinsLabel } from '@/lib/salesbell';
import { errorMessage } from '@/lib/supabase';
import { useSalesBell } from '@/store/salesbell-store';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function HomeScreen() {
  const s = useSalesBell();
  const { c, profile, userId } = s;
  const settings = useSettings();
  const products = useProducts();
  const today = useLeaderboard('d');
  const spin = useSpinStatus();
  const ringSale = useRingSale();
  const undoSale = useUndoSale();
  const invite = useMyInvites(userId).data?.[0];

  const [selId, setSelId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [ringKey, setRingKey] = useState(0);
  // Reaching the daily goal gets the bigger celebration.
  const [bigRing, setBigRing] = useState(false);
  const ringing = useRef(false);

  const visible = (products.data ?? []).filter((p) => p.visible);
  // Keep the selection on a visible product if an admin hides or removes it.
  const p = visible.find((x) => x.id === selId) ?? visible[0];

  const goal = settings.data?.daily_goal ?? 10;
  const ranked = [...(today.data ?? [])].sort((a, b) => b.sales - a.sales || (a.user_id === userId ? -1 : 1));
  const meIndex = ranked.findIndex((r) => r.user_id === userId);
  const mine = ranked[meIndex];
  const sold = mine?.sales ?? 0;
  const left = Math.max(0, goal - sold);
  const pct = Math.min(100, Math.round((sold / goal) * 100));
  const spinOn = settings.data?.spin_enabled ?? true;
  const avail = spin.data?.available ?? 0;
  const every = spin.data?.spin_every ?? settings.data?.spin_every ?? 5;
  const need = every - (sold % every);

  const undo = (saleId: number, label: string) =>
    undoSale.mutate(saleId, {
      onSuccess: () => s.toast('Sale undone', label),
      onError: (e) => {
        s.failBuzz();
        s.toast("Couldn't undo", errorMessage(e), { duration: 5000 });
      },
    });

  // The ding only plays once the server has saved the sale, so it always means "it counted".
  // One sale at a time: the bell stays locked until the server answers.
  const ring = (product: Tables<'products'> | undefined = p, n = qty) => {
    if (ringing.current || !product) return;
    ringing.current = true;
    const before = sold;
    const label = `${product.name} × ${n}`;
    ringSale.mutate(
      { productId: product.id, qty: n },
      {
        onSuccess: (sale) => {
          const after = before + n;
          const reached = before < goal && after >= goal;
          s.playBell();
          setBigRing(reached);
          setRingKey((k) => k + 1);
          setQty(1);
          s.toast(reached ? 'Goal reached!' : 'Ding! Sale registered', reached ? `${label} · ${after} of ${goal} today` : label, {
            duration: 5000,
            action: { label: 'Undo', onPress: () => undo(sale.id, label) },
          });
        },
        onError: (e) => {
          s.failBuzz();
          s.toast('Sale not registered', errorMessage(e), {
            duration: 8000,
            action: { label: 'Retry', onPress: () => ring(product, n) },
          });
        },
        onSettled: () => {
          ringing.current = false;
        },
      },
    );
  };

  const stepStyle = {
    width: 56,
    height: 48,
    borderRadius: 14,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: c.shadow,
  } as const;

  const name = firstName(profile?.full_name ?? '');

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Pressable onPress={() => router.navigate('/profile')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
          <Avatar name={name} size={44} />
          <View style={{ gap: 1, flexShrink: 1 }}>
            <SBText size={14} color={c.mut}>
              {greeting()}
            </SBText>
            <SBText w={700} size={22} ls={-0.02} numberOfLines={1}>
              {name}
            </SBText>
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {spinOn ? (
            <Pressable
              onPress={() => router.push('/spin')}
              style={{
                height: 50,
                paddingHorizontal: avail > 0 ? 14 : 12,
                borderRadius: 14,
                backgroundColor: avail > 0 ? c.ink : c.card,
                boxShadow: avail > 0 ? undefined : c.shadow,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}>
              <SpinGlyph color={avail > 0 ? c.acc : c.faint} />
              <SBText w={avail > 0 ? 800 : 600} size={avail > 0 ? 14 : 13} color={avail > 0 ? c.bg : c.mut}>
                {avail > 0 ? spinsLabel(avail) : 'Spin in ' + need}
              </SBText>
            </Pressable>
          ) : null}
          <Card onPress={() => router.navigate('/board')} style={{ borderRadius: 14, paddingVertical: 6, paddingHorizontal: 14, alignItems: 'center' }}>
            <SBText w={600} size={12} color={c.mut}>
              Rank
            </SBText>
            <SBText w={800} size={22} lh={1.1}>
              {meIndex >= 0 ? '#' + (meIndex + 1) : '–'}
            </SBText>
          </Card>
        </View>
      </View>

      {invite ? (
        <Card
          onPress={() => router.push('/groups')}
          style={{ borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SBText size={15} style={{ flex: 1 }} numberOfLines={2}>
            <SBText w={700} size={15}>
              {firstName(invite.inviter?.full_name ?? '')}
            </SBText>
            {' invited you to '}
            <SBText w={700} size={15}>
              {invite.group?.name}
            </SBText>
          </SBText>
          <SBText w={700} color={c.accText}>
            View
          </SBText>
        </Card>
      ) : null}

      <LatestSale />

      <Card style={{ borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <SBText w={500} size={14} color={c.mut}>
            Sales today
          </SBText>
          <SBText w={500} size={14} color={c.mut}>
            Goal {goal}
          </SBText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <SBText w={800} size={34} ls={-0.02} style={{ lineHeight: 38 }}>
            {sold}
          </SBText>
          <SBText w={700} size={18} color={c.faint}>
            /{goal}
          </SBText>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {Array.from({ length: goal }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < sold ? c.acc : c.el }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <SBText w={600} size={14} color={c.accText} style={{ flexShrink: 1 }}>
            {left === 0 ? 'Goal reached — keep ringing!' : `${pct}% – only ${left} sale${left > 1 ? 's' : ''} to go!`}
          </SBText>
          <SBText w={600} size={14}>
            {fmt(mine?.revenue ?? 0)}
          </SBText>
        </View>
      </Card>

      {products.isError ? (
        <Notice onRetry={() => products.refetch()}>Couldn&apos;t load products.</Notice>
      ) : products.isPending ? null : visible.length === 0 ? (
        <Notice>No products are available yet. An admin can add them under Admin → Products.</Notice>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {visible.map((x) => {
            const on = x.id === p?.id;
            return (
              <Pressable
                key={x.id}
                onPress={() => setSelId(x.id)}
                style={{
                  width: 108,
                  minHeight: 72,
                  padding: 12,
                  gap: 4,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: on ? c.acc : 'transparent',
                  backgroundColor: on ? c.accSoft : c.card,
                }}>
                <SBText w={on ? 700 : 600} size={15} numberOfLines={1}>
                  {x.name}
                </SBText>
                <SBText size={13} color={c.mut}>
                  {fmt(x.price)}
                </SBText>
                <SBText w={on ? 700 : 600} size={12} color={on ? c.accText : c.mut}>
                  {ptsLabel(x.points)}
                </SBText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 'auto', marginBottom: 12 }}>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Pressable onPress={() => setQty((q) => Math.min(9, q + 1))} style={stepStyle} accessibilityLabel="Increase quantity">
            <SBText w={600} size={24}>
              +
            </SBText>
          </Pressable>
          <SBText w={800} size={26} style={{ lineHeight: 28 }}>
            ×{qty}
          </SBText>
          <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} style={stepStyle} accessibilityLabel="Decrease quantity">
            <SBText w={600} size={24}>
              −
            </SBText>
          </Pressable>
        </View>

        <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
          <BellRings burst={ringKey} big={bigRing} size={180} color={c.acc} />
          <Pressable
            onPress={() => ring()}
            disabled={!p || ringSale.isPending}
            accessibilityRole="button"
            accessibilityLabel="Ring the bell"
            style={({ pressed }) => ({
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: c.acc,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: !p ? 0.5 : ringSale.isPending ? 0.75 : 1,
              boxShadow: c.bellShadow,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}>
            <BellIcon color={c.accInk} ringKey={ringKey} />
            <SBText w={800} size={18} color={c.accInk}>
              {ringSale.isPending ? 'Ringing…' : 'Ring the bell'}
            </SBText>
          </Pressable>
          <BellConfetti burst={ringKey} big={bigRing} size={180} color={c.acc} />
        </View>

        <View style={{ width: 56, alignItems: 'center', gap: 2 }}>
          <SBText w={800} size={22} color={c.accText}>
            +{(p?.points ?? 0) * qty}
          </SBText>
          <SBText w={600} size={12} color={c.mut}>
            points
          </SBText>
        </View>
      </View>

      {p ? (
        <SBText size={14} color={c.mut} style={{ textAlign: 'center' }}>
          {p.name} × {qty} ·{' '}
          <SBText w={600} size={14}>
            {fmt(p.price * qty)}
          </SBText>
        </SBText>
      ) : null}
    </Screen>
  );
}
