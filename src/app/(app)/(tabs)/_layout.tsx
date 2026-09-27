import { Tabs } from 'expo-router';

import { TabBar } from '@/components/sb/tab-bar';
import { useSalesBell } from '@/store/salesbell-store';

export default function TabsLayout() {
  const { isAdmin } = useSalesBell();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="board" options={{ title: 'Leaderboard' }} />
      <Tabs.Screen name="contests" options={{ title: 'Contests' }} />
      <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Protected guard={isAdmin}>
        <Tabs.Screen name="admin" options={{ title: 'Admin' }} />
      </Tabs.Protected>
    </Tabs>
  );
}
