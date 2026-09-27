import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BackLink, Button, Chips, ErrorText, Field, SBText, Screen, Title } from '@/components/sb/ui';
import { authRedirectUrl } from '@/hooks/use-auth-links';
import { useTeams } from '@/lib/api';
import { validEmail } from '@/lib/salesbell';
import { errorMessage, supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const teams = useTeams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [team, setTeam] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    setErr('');
  };

  const submit = async () => {
    if (!name.trim()) return setErr('Enter your name');
    if (!validEmail(email)) return setErr('Enter a valid email address');
    if (pw.length < 6) return setErr('Password must be at least 6 characters');
    const teamId = team ?? teams.data?.[0]?.id ?? null;
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pw,
      options: {
        // Only name and team are read from metadata; the role is always decided server-side.
        data: { full_name: name.trim(), team_id: teamId === null ? '' : String(teamId) },
        emailRedirectTo: authRedirectUrl(),
      },
    });
    setBusy(false);
    if (error) return setErr(errorMessage(error));
    // With email confirmation on, there's no session until the link is opened.
    if (!data.session) router.replace({ pathname: '/check-email', params: { email: email.trim(), kind: 'confirm' } });
  };

  const options = (teams.data ?? []).map((t) => [t.id, t.name.replace('Team ', '')] as [number, string]);

  return (
    <Screen stack padX={24}>
      <BackLink label="Log in" />
      <Title>Create account</Title>
      <Field label="Name" value={name} onChangeText={edit(setName)} placeholder="e.g. Henrik Knap" autoComplete="name" />
      <Field
        label="Email"
        value={email}
        onChangeText={edit(setEmail)}
        placeholder="name@company.dk"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Field
        label="Password"
        value={pw}
        onChangeText={edit(setPw)}
        placeholder="At least 6 characters"
        secureTextEntry
        autoComplete="new-password"
      />
      {options.length ? (
        <View style={{ gap: 8 }}>
          <SBText w={600} size={14}>
            Team
          </SBText>
          <Chips outlined height={44} options={options} value={team ?? options[0][0]} onChange={setTeam} />
        </View>
      ) : null}
      <ErrorText>{err}</ErrorText>
      <Button onPress={submit} loading={busy}>
        {busy ? 'Creating account…' : 'Create account'}
      </Button>
    </Screen>
  );
}
