import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Button, SBText, Screen } from '@/components/sb/ui';
import { useColors } from '@/store/salesbell-store';

export default function CheckEmailScreen() {
  const c = useColors();
  const { email, kind } = useLocalSearchParams<{ email: string; kind: 'reset' | 'confirm' }>();
  const message =
    kind === 'confirm'
      ? `We sent a confirmation link to ${email}. Open it on this device to finish creating your account.`
      : `We sent a reset link to ${email}. The link works for 1 hour.`;
  return (
    <Screen stack padX={24}>
      <View style={{ alignItems: 'center', gap: 12, marginTop: 120 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: c.accSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View
            style={{
              width: 16,
              height: 30,
              borderRightWidth: 5,
              borderBottomWidth: 5,
              borderColor: c.acc,
              transform: [{ rotate: '45deg' }],
              marginTop: -8,
            }}
          />
        </View>
        <SBText w={800} size={26}>
          Check your inbox
        </SBText>
        <SBText size={15} color={c.mut} lh={1.45} style={{ maxWidth: 290, textAlign: 'center' }}>
          {message}
        </SBText>
      </View>
      <View style={{ marginTop: 'auto' }}>
        <Button onPress={() => (router.canDismiss() ? router.dismissAll() : router.replace('/login'))}>
          Back to log in
        </Button>
      </View>
    </Screen>
  );
}
