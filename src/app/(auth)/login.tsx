import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BellIcon } from '@/components/sb/bell-icon';
import { Button, ErrorText, Field, SBText, Screen } from '@/components/sb/ui';
import { validEmail } from '@/lib/salesbell';
import { errorMessage, supabase } from '@/lib/supabase';
import { useColors } from '@/store/salesbell-store';

export default function LoginScreen() {
  const c = useColors();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const login = async () => {
    if (!validEmail(email)) return setErr('Enter a valid email address');
    if (pw.length < 6) return setErr('Password must be at least 6 characters');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    // On success the auth listener switches the app to the signed-in screens.
    if (error) setErr(error.message === 'Invalid login credentials' ? 'Wrong email or password' : errorMessage(error));
  };

  return (
    <Screen padX={24}>
      <View style={{ alignItems: 'center', gap: 10, marginTop: 40, marginBottom: 24 }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 30,
            backgroundColor: c.acc,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 28px rgba(14,160,83,0.35)',
          }}>
          <BellIcon color={c.accInk} />
        </View>
        <SBText w={800} size={36} ls={-0.03}>
          SalesBell
        </SBText>
        <SBText size={16} color={c.mut}>
          Ring the bell on every sale.
        </SBText>
      </View>

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
      />
      <Field
        label="Password"
        value={pw}
        onChangeText={(v) => {
          setPw(v);
          setErr('');
        }}
        secureTextEntry
        autoComplete="current-password"
        onSubmitEditing={login}
      />
      <Pressable
        onPress={() => router.push({ pathname: '/reset', params: { email } })}
        style={{ alignSelf: 'flex-end', paddingVertical: 4, marginTop: -6 }}>
        <SBText w={600} size={14} color={c.accText}>
          Forgot password?
        </SBText>
      </Pressable>
      <ErrorText>{err}</ErrorText>
      <Button onPress={login} loading={busy}>
        {busy ? 'Logging in…' : 'Log in'}
      </Button>

      <View style={{ marginTop: 'auto', paddingTop: 20, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <SBText size={15} color={c.mut}>
          New to SalesBell?
        </SBText>
        <Link href="/signup">
          <SBText w={700} size={15} color={c.accText}>
            Create account
          </SBText>
        </Link>
      </View>
    </Screen>
  );
}
