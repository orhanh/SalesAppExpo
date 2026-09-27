import { Stack } from 'expo-router';

import { AccountBlocked, ChooseTeam, FinishAccount, UpdatePassword } from '@/components/sb/account-gates';
import { useSalesBell } from '@/store/salesbell-store';

const sheet = {
  presentation: 'formSheet',
  sheetAllowedDetents: 'fitToContents',
  sheetCornerRadius: 28,
} as const;

export default function AppLayout() {
  const { profile, isAdmin, recovering, session } = useSalesBell();

  if (recovering) return <UpdatePassword />;
  if (!profile) return <AccountBlocked reason="missing" />;
  if (!profile.active) return <AccountBlocked reason="inactive" />;
  // Accounts created from a group email invite have no name or password yet.
  if (session?.user.user_metadata?.invited) return <FinishAccount />;
  if (profile.team_id === null) return <ChooseTeam />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="spin" />
      <Stack.Screen name="history" />
      <Stack.Screen name="contest/[id]" />
      <Stack.Screen name="cancel-sale/[id]" options={sheet} />
      <Stack.Screen name="team" />
      <Stack.Screen name="team-switch" options={sheet} />
      <Stack.Screen name="groups/index" />
      <Stack.Screen name="groups/edit" options={sheet} />
      <Stack.Screen name="groups/[id]/index" />
      <Stack.Screen name="groups/[id]/invite" />
      <Stack.Protected guard={isAdmin}>
        <Stack.Screen name="admin/products" />
        <Stack.Screen name="admin/product-edit" options={sheet} />
        <Stack.Screen name="admin/users" />
        <Stack.Screen name="admin/new-contest" />
        <Stack.Screen name="admin/requests" />
        <Stack.Screen name="admin/audit" />
        <Stack.Screen name="admin/spin" />
      </Stack.Protected>
    </Stack>
  );
}
