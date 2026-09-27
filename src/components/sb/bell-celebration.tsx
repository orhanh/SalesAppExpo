import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { FEED_DOTS } from '@/constants/theme';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Deterministic 0..1 noise, so each burst looks different while render stays pure. */
function noise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

type BurstProps = {
  /** Increment to play the effect once; 0 plays nothing. */
  burst: number;
  /** The bigger version, for reaching the daily goal. */
  big?: boolean;
  /** Diameter of the bell the effect surrounds. */
  size: number;
  color: string;
};

/** Glow and rings that spread out from behind the bell. Render it before the bell. */
export function BellRings({ burst, big, size, color }: BurstProps) {
  const reduced = useReducedMotion();
  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: size, height: size }}>
      <Ring burst={burst} size={size} color={color} filled to={big ? 1.45 : 1.3} duration={700} delay={0} />
      {reduced ? null : (
        <>
          <Ring burst={burst} size={size} color={color} to={big ? 2.2 : 1.8} duration={big ? 900 : 700} delay={0} />
          <Ring burst={burst} size={size} color={color} to={big ? 2.2 : 1.8} duration={big ? 900 : 700} delay={140} />
          {big ? (
            <Ring burst={burst} size={size} color={color} to={2.2} duration={900} delay={280} />
          ) : null}
        </>
      )}
    </View>
  );
}

function Ring({
  burst,
  size,
  color,
  filled,
  to,
  duration,
  delay,
}: {
  burst: number;
  size: number;
  color: string;
  filled?: boolean;
  to: number;
  duration: number;
  delay: number;
}) {
  const p = useSharedValue(1);

  useEffect(() => {
    if (!burst) return;
    p.set(0);
    p.set(withDelay(delay, withTiming(1, { duration, easing: EASE_OUT })));
  }, [burst, delay, duration, p]);

  const style = useAnimatedStyle(() => {
    const v = p.get();
    return {
      opacity: (1 - v) * (filled ? 0.45 : 0.6),
      transform: [{ scale: 1 + (to - 1) * v }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: 0,
        },
        filled ? { backgroundColor: color } : { borderWidth: 3, borderColor: color },
        style,
      ]}
    />
  );
}

/** Confetti bursting out of the bell. Render it after the bell so it flies over it. */
export function BellConfetti({ burst, big, size, color }: BurstProps) {
  const reduced = useReducedMotion();
  if (reduced || !burst) return null;
  const colors = [color, FEED_DOTS.goal, FEED_DOTS.lead, FEED_DOTS.spin, '#F2545B'];
  const count = big ? 34 : 18;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: size, height: size }}>
      {Array.from({ length: count }, (_, i) => (
        <Particle key={`${burst}-${i}`} seed={burst * 131 + i * 17} big={!!big} size={size} colors={colors} />
      ))}
    </View>
  );
}

function Particle({ seed, big, size, colors }: { seed: number; big: boolean; size: number; colors: string[] }) {
  // Mostly upward, a little sideways; the goal burst goes all the way round.
  const angle = -Math.PI / 2 + (noise(seed) - 0.5) * (big ? 2 * Math.PI : 1.5 * Math.PI);
  const dist = (big ? 190 : 130) * (0.5 + 0.5 * noise(seed + 1));
  const w = 6 + Math.round(noise(seed + 2) * 4);
  const round = noise(seed + 3) < 0.3;
  const h = round ? w : w + 5;
  const spin = (noise(seed + 4) - 0.5) * 900;
  const duration = (big ? 1300 : 950) + noise(seed + 5) * 250;
  const gravity = big ? 110 : 70;
  const color = colors[Math.floor(noise(seed + 6) * colors.length)];

  const p = useSharedValue(0);

  useEffect(() => {
    p.set(withTiming(1, { duration, easing: Easing.linear }));
  }, [duration, p]);

  const style = useAnimatedStyle(() => {
    const v = p.get();
    const out = 1 - (1 - v) ** 3; // fast out, then drift
    return {
      opacity: v < 0.65 ? 1 : 1 - (v - 0.65) / 0.35,
      transform: [
        { translateX: Math.cos(angle) * dist * out },
        { translateY: Math.sin(angle) * dist * out + gravity * v * v },
        { rotate: `${spin * v}deg` },
        { scale: v < 0.08 ? 0.6 + v * 5 : 1 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: size / 2 - w / 2,
          top: size / 2 - h / 2,
          width: w,
          height: h,
          borderRadius: round ? w / 2 : 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
