import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { EMPTY_TEAM_CHOICE, TeamPicker, checkTeamChoice, type TeamChoice } from '@/components/sb/team-picker';
import { BackLink, Button, ErrorText, Field, SBText, Screen, Title } from '@/components/sb/ui';
import { authRedirectUrl } from '@/hooks/use-auth-links';
import { validEmail } from '@/lib/salesbell';
import { errorMessage, supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [team, setTeam] = useState<TeamChoice>(EMPTY_TEAM_CHOICE);
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
    setBusy(true);
    const teamErr = await checkTeamChoice(team);
    if (teamErr) {
      setBusy(false);
      return setErr(teamErr);
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pw,
      options: {
        // Only name and team choice are read from metadata; the role is always decided server-side.
        data:
          team.mode === 'join'
            ? { full_name: name.trim(), team_code: team.code }
            : { full_name: name.trim(), new_team: team.name.trim() },
        emailRedirectTo: authRedirectUrl(),
      },
    });
    setBusy(false);
    if (error) return setErr(errorMessage(error));
    // With email confirmation on, there's no session until the link is opened.
    if (!data.session) router.replace({ pathname: '/check-email', params: { email: email.trim(), kind: 'confirm' } });
  };

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
      <View style={{ gap: 8, marginTop: 4 }}>
        <SBText w={700} size={16}>
          Your team
        </SBText>
        <TeamPicker
          value={team}
          onChange={(v) => {
            setTeam(v);
            setErr('');
          }}
        />
      </View>
      <ErrorText>{err}</ErrorText>
      <Button onPress={submit} loading={busy}>
        {busy ? 'Creating account…' : 'Create account'}
      </Button>
    </Screen>
  );
}
