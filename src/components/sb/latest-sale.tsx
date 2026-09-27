import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LayoutAnimationConfig, useReducedMotion } from 'react-native-reanimated';

import { Avatar, Card, SBText } from '@/components/sb/ui';
import { useLatestSale } from '@/lib/api';
import { feedTime, fmt } from '@/lib/salesbell';
import { useSalesBell } from '@/store/salesbell-store';

/** "Latest sale · Anna Jensen · Pro Plan × 2 · 998 kr   4 min": the team's latest sale today, live. */
export function LatestSale() {
  const { c, profile } = useSalesBell();
  const latest = useLatestSale(profile?.team_id);
  const reduced = useReducedMotion();
  // Re-render once a minute so "4 min" keeps counting.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // A nice-to-have: nothing while loading or on error, so Home never jumps or breaks over it.
  if (latest.isPending || latest.isError) return null;
  const sale = latest.data;

  return (
    <Card
      onPress={() => router.navigate('/feed')}
      style={{ borderRadius: 18, minHeight: 56, paddingHorizontal: 14, justifyContent: 'center', overflow: 'hidden' }}>
      {/* The first row appears without animating; later sales slide in. */}
      <LayoutAnimationConfig skipEntering>
        {sale ? (
          <Animated.View
            key={sale.id}
            entering={(reduced ? FadeIn : FadeInDown).duration(250)}
            exiting={FadeOut.duration(150)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
            <Avatar name={sale.profile.full_name} size={32} />
            <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
              <SBText w={700} size={12} color={c.mut} ls={0.04}>
                LATEST SALE
              </SBText>
              <SBText w={700} size={15} numberOfLines={1}>
                {sale.profile.full_name}
              </SBText>
              <SBText size={13} color={c.mut} numberOfLines={1}>
                {sale.sub}
                {sale.sale ? ` · ${fmt(sale.sale.qty * sale.sale.unit_price)}` : ''}
              </SBText>
            </View>
            <SBText w={600} size={13} color={c.mut}>
              {feedTime(sale.created_at, now)}
            </SBText>
          </Animated.View>
        ) : (
          <Animated.View key="empty" exiting={FadeOut.duration(150)} style={{ paddingVertical: 10 }}>
            <SBText size={15} color={c.mut} numberOfLines={2}>
              No sales on {profile?.team?.name ?? 'your team'} yet today. Be the first!
            </SBText>
          </Animated.View>
        )}
      </LayoutAnimationConfig>
    </Card>
  );
}
