import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/** The SalesBell glyph. Shakes once whenever `ringKey` changes. */
export function BellIcon({ color, ringKey }: { color: string; ringKey?: number }) {
  const rot = useSharedValue(0);

  useEffect(() => {
    if (!ringKey) return;
    const step = (deg: number, ms = 135) =>
      withTiming(deg, { duration: ms, easing: Easing.inOut(Easing.ease) });
    rot.value = withSequence(step(-18), step(15), step(-11), step(8), step(-4), step(0, 225));
  }, [ringKey, rot]);

  const shake = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  return (
    <Animated.View style={[{ alignItems: 'center', transformOrigin: 'top' }, shake]}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <View
        style={{
          width: 40,
          height: 34,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderBottomLeftRadius: 5,
          borderBottomRightRadius: 5,
          backgroundColor: color,
        }}
      />
      <View style={{ width: 52, height: 6, borderRadius: 3, backgroundColor: color }} />
      <View
        style={{
          width: 12,
          height: 8,
          borderBottomLeftRadius: 6,
          borderBottomRightRadius: 6,
          backgroundColor: color,
          marginTop: 2,
        }}
      />
    </Animated.View>
  );
}
