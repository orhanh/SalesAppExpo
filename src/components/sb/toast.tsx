import { View } from 'react-native';
import Animated, { FadeOut, Keyframe } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SBText } from '@/components/sb/ui';
import { useSalesBell } from '@/store/salesbell-store';

const enter = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: -16 }, { scale: 0.96 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
}).duration(350);

export function Toast() {
  const { toastMsg, c } = useSalesBell();
  const insets = useSafeAreaInsets();
  if (!toastMsg) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 4, left: 16, right: 16, zIndex: 20 }}>
      <Animated.View
        key={toastMsg.id}
        entering={enter}
        exiting={FadeOut.duration(200)}
        style={{
          backgroundColor: c.toastBg,
          borderRadius: 18,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        }}>
        <SBText w={800} size={17} color={c.toastInk} style={{ flexShrink: 1 }}>
          {toastMsg.title}
        </SBText>
        <SBText w={500} size={14} color={c.toastInk} style={{ opacity: 0.75, textAlign: 'right', flexShrink: 1 }}>
          {toastMsg.sub}
        </SBText>
      </Animated.View>
    </View>
  );
}
