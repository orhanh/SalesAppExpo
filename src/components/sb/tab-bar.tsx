import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SBText } from '@/components/sb/ui';
import { useColors } from '@/store/salesbell-store';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** The design's tab bar: a label under a dot that gets a pill when active. */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: c.card,
        borderTopWidth: 1,
        borderTopColor: c.line,
        paddingTop: 8,
        paddingHorizontal: 4,
        paddingBottom: Math.max(insets.bottom, 12),
      }}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const active = state.index === index;
        const label = typeof options.title === 'string' ? options.title : route.name;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!active && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            style={{ flex: 1, alignItems: 'center', gap: 5 }}>
            <View
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                backgroundColor: active ? c.sel : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: active ? c.ink : c.faint }} />
            </View>
            <SBText w={600} size={11} color={active ? c.ink : c.mut} numberOfLines={1}>
              {label}
            </SBText>
          </Pressable>
        );
      })}
    </View>
  );
}
