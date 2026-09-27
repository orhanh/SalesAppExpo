import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { SBText } from '@/components/sb/ui';
import { useColors } from '@/store/salesbell-store';

export const SPIN_MS = 4200;
const SIZE = 300;
const R = SIZE / 2;

/** SVG path for a pie wedge, angles in degrees clockwise from 12 o'clock (like conic-gradient). */
function wedge(cx: number, cy: number, r: number, a0: number, a1: number) {
  const pt = (a: number) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return `${cx + r * Math.cos(rad)} ${cy + r * Math.sin(rad)}`;
  };
  return `M ${cx} ${cy} L ${pt(a0)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${pt(a1)} Z`;
}

/** The degrees the wheel must reach so field `index` lands under the pointer. */
export function targetDegrees(current: number, index: number, fields: number) {
  const slice = 360 / fields;
  return Math.ceil(current / 360) * 360 + 1800 - (index * slice + slice / 2);
}

export function SpinWheel({
  fields,
  degrees,
  hubLabel,
  onSpin,
}: {
  fields: { label: string }[];
  degrees: number;
  hubLabel: string;
  onSpin: () => void;
}) {
  const c = useColors();
  const rot = useSharedValue(degrees);
  const slice = 360 / fields.length;

  useEffect(() => {
    rot.value = withTiming(degrees, { duration: SPIN_MS, easing: Easing.bezier(0.15, 0.7, 0.1, 1) });
  }, [degrees, rot]);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  return (
    <View style={{ width: 310, height: 326, alignSelf: 'center' }}>
      <View
        style={{
          position: 'absolute',
          top: 18,
          left: 5,
          width: SIZE,
          height: SIZE,
          borderRadius: R,
          boxShadow: `0 0 0 6px ${c.ink}, 0 14px 30px rgba(0,0,0,0.18)`,
        }}>
        <Animated.View style={[{ width: SIZE, height: SIZE }, spinStyle]}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={R} cy={R} r={R} fill={c.card} />
            {fields.map((_, i) =>
              i % 2 === 0 ? (
                <Path key={i} d={wedge(R, R, R, i * slice, (i + 1) * slice)} fill={c.acc} />
              ) : null,
            )}
          </Svg>
          {fields.map((f, i) => (
            <View
              key={i}
              pointerEvents="none"
              style={{
                position: 'absolute',
                inset: 0,
                transform: [{ rotate: `${i * slice + slice / 2}deg` }],
              }}>
              <SBText
                w={800}
                size={13}
                lh={1.1}
                color={i % 2 === 0 ? c.accInk : c.ink}
                style={{ position: 'absolute', top: R - 132, left: R - 42, width: 84, textAlign: 'center' }}>
                {f.label}
              </SBText>
            </View>
          ))}
        </Animated.View>
      </View>
      {/* Pointer */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 141,
          zIndex: 3,
          width: 0,
          height: 0,
          borderLeftWidth: 14,
          borderRightWidth: 14,
          borderTopWidth: 24,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: c.ink,
        }}
      />
      <Pressable
        onPress={onSpin}
        style={({ pressed }) => ({
          position: 'absolute',
          top: 124,
          left: 111,
          zIndex: 2,
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: c.ink,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          transform: [{ scale: pressed ? 0.95 : 1 }],
        })}>
        <SBText w={800} size={15} ls={0.04} color={c.bg}>
          {hubLabel}
        </SBText>
      </Pressable>
    </View>
  );
}

/** Tiny four-quadrant wheel used on the home screen's spin pill. */
export function SpinGlyph({ color }: { color: string }) {
  return (
    <Svg width={16} height={16}>
      <Path d={wedge(8, 8, 6.5, 0, 90)} fill={color} />
      <Path d={wedge(8, 8, 6.5, 180, 270)} fill={color} />
      <Circle cx={8} cy={8} r={7.25} stroke={color} strokeWidth={1.5} fill="none" />
    </Svg>
  );
}
