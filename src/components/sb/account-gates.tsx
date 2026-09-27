import { useState } from 'react';
import { View } from 'react-native';

import { Button, ErrorText, Field, SBText, Screen, Title } from '@/components/sb/ui';
import { errorMessage, supabase } from '@/lib/supabase';
import { useSalesBell } from '@/store/salesbell-store';

/** Shown after opening a password-reset link: the user is signed in and picks a new password. */
export function UpdatePassword() {
  const { endRecovery, toast } = useSalesBell();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (pw.length < 6) return setErr('Password must be at least 6 characters');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(errorMessage(error));
    toast('Password updated', 'You are signed in');
    endRecovery();
  };

  return (
    <Screen padX={24}>
      <View style={{ marginTop: 40 }}>
        <Title sub="Choose a new password for your account.">New password</Title>
      </View>
      <Field
        label="Password"
        value={pw}
        onChangeText={(v) => {
          setPw(v);
          setErr('');
        }}
        placeholder="At least 6 characters"
        secureTextEntry
        autoComplete="new-password"
        onSubmitEditing={save}
      />
      <ErrorText>{err}</ErrorText>
      <Button onPress={save} loading={busy}>
        Save password
      </Button>
    </Screen>
  );
}

/** Shown to users an admin has deactivated, or whose profile couldn't be loaded. */
export function AccountBlocked({ reason }: { reason: 'inactive' | 'missing' }) {
  const { c, signOut } = useSalesBell();
  return (
    <Screen padX={24}>
      <View style={{ marginTop: 120, gap: 8 }}>
        <Title>{reason === 'inactive' ? 'Account deactivated' : 'Profile not found'}</Title>
        <SBText size={15} color={c.mut} lh={1.45}>
          {reason === 'inactive'
            ? 'An admin has deactivated your account. Ask them to reactivate it to keep ringing the bell.'
            : "We couldn't load your SalesBell profile. Check your connection, or log out and in again."}
        </SBText>
      </View>
      <View style={{ marginTop: 'auto' }}>
        <Button tone="outline" onPress={signOut}>
          Log out
        </Button>
      </View>
    </Screen>
  );
}
