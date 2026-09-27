import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Toast } from '@/components/sb/toast';
import { useAuthLinks } from '@/hooks/use-auth-links';
import { useRealtime } from '@/hooks/use-realtime';
import { queryClient } from '@/lib/api';
import { SalesBellProvider, useSalesBell } from '@/store/salesbell-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });

  if (!loaded && !error) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SalesBellProvider>
        <RootNavigator />
      </SalesBellProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { session, authReady, userId, profileLoading, isDark, c, startRecovery } = useSalesBell();
  useAuthLinks(startRecovery);
  useRealtime(userId);

  const ready = authReady && !profileLoading;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const base = isDark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, background: c.bg, card: c.card, text: c.ink, border: c.line, primary: c.acc },
  };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
          <Stack.Protected guard={!session}>
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          </Stack.Protected>
        </Stack>
        <Toast />
      </View>
    </ThemeProvider>
  );
}
