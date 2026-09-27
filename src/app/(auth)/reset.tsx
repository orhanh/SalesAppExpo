import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { BackLink, Button, ErrorText, Field, Screen, Title } from '@/components/sb/ui';
import { authRedirectUrl } from '@/hooks/use-auth-links';
import { validEmail } from '@/lib/salesbell';
import { errorMessage, supabase } from '@/lib/supabase';

export default function ResetScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!validEmail(email)) return setErr('Enter a valid email address');
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirectUrl() });
    setBusy(false);
    if (error) return setErr(errorMessage(error));
    router.replace({ pathname: '/check-email', params: { email: email.trim(), kind: 'reset' } });
  };

  return (
    <Screen stack padX={24}>
      <BackLink label="Log in" />
      <Title sub="Enter your email and we'll send you a link to choose a new password.">Reset password</Title>
      <Field
        label="Email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setErr('');
        }}
        placeholder="name@company.dk"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        onSubmitEditing={send}
      />
      <ErrorText>{err}</ErrorText>
      <Button onPress={send} loading={busy}>
        {busy ? 'Sending…' : 'Send reset link'}
      </Button>
    </Screen>
  );
}
