import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { TabBar } from '@/components/sb/tab-bar';
import { useSalesBell } from '@/store/salesbell-store';

type SymbolName = SymbolViewProps['name'];

/** SF Symbol on iOS (filled when active), Material Symbol on Android/web. */
function tabIcon(ios: string, material: string) {
  return function TabIcon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    const name = { ios: focused ? `${ios}.fill` : ios, android: material, web: material } as SymbolName;
    return <SymbolView name={name} tintColor={color} size={size} />;
  };
}

export default function TabsLayout() {
  const { isAdmin } = useSalesBell();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('house', 'home') }} />
      <Tabs.Screen
        name="board"
        options={{ title: 'Leaderboard', tabBarIcon: tabIcon('chart.bar', 'leaderboard') }}
      />
      <Tabs.Screen name="contests" options={{ title: 'Contests', tabBarIcon: tabIcon('trophy', 'trophy') }} />
      <Tabs.Screen name="feed" options={{ title: 'Feed', tabBarIcon: tabIcon('bell', 'notifications') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('person', 'person') }} />
      <Tabs.Protected guard={isAdmin}>
        <Tabs.Screen name="admin" options={{ title: 'Admin', tabBarIcon: tabIcon('gearshape', 'settings') }} />
      </Tabs.Protected>
    </Tabs>
  );
}
