import { useState } from 'react';
import { View } from 'react-native';

import { Button, ErrorText, Field, SBText, Screen, Title } from '@/components/sb/ui';
import { EMPTY_TEAM_CHOICE, TeamPicker, checkTeamChoice, type TeamChoice } from '@/components/sb/team-picker';
import { queryClient, useCreateTeam, useJoinTeam } from '@/lib/api';
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

/** Shown after opening a group invite email: the new user picks their name and a password. */
export function FinishAccount() {
  const { profile, toast } = useSalesBell();
  // The profile name defaults to the part of the email before the @; start empty rather than show that.
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return setErr('Enter your name');
    if (pw.length < 6) return setErr('Password must be at least 6 characters');
    setBusy(true);
    const named = await supabase.rpc('set_my_name', { p_name: name.trim() });
    // Clearing `invited` in the user metadata is what lets them past this screen.
    const { error } = named.error ? named : await supabase.auth.updateUser({ password: pw, data: { invited: false } });
    setBusy(false);
    if (error) return setErr(errorMessage(error));
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    toast('Welcome to SalesBell', 'Your group invite is waiting under Profile');
  };

  return (
    <Screen padX={24}>
      <View style={{ marginTop: 40 }}>
        <Title sub={`You were invited to SalesBell as ${profile?.email ?? ''}. Tell your colleagues who you are.`}>
          Finish your account
        </Title>
      </View>
      <Field
        label="Your name"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setErr('');
        }}
        placeholder="First and last name"
        autoComplete="name"
        textContentType="name"
      />
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
        Continue
      </Button>
    </Screen>
  );
}

/** Shown to anyone without a team: every seller belongs to exactly one. */
export function ChooseTeam() {
  const { toast, signOut } = useSalesBell();
  const join = useJoinTeam();
  const create = useCreateTeam();
  const [team, setTeam] = useState<TeamChoice>(EMPTY_TEAM_CHOICE);
  const [err, setErr] = useState('');
  const [checking, setChecking] = useState(false);

  const save = async () => {
    setChecking(true);
    const problem = await checkTeamChoice(team);
    setChecking(false);
    if (problem) return setErr(problem);
    const onError = (e: unknown) => setErr(errorMessage(e));
    if (team.mode === 'join') {
      join.mutate(team.code, { onSuccess: () => toast('Welcome to the team!', ''), onError });
    } else {
      create.mutate(team.name, {
        onSuccess: (t) => toast('Team started', `Share code ${t?.code ?? ''} with your colleagues`),
        onError,
      });
    }
  };

  return (
    <Screen padX={24}>
      <View style={{ marginTop: 40 }}>
        <Title sub="Every seller is on a team. Join your colleagues with their team code, or start a new team.">
          Choose your team
        </Title>
      </View>
      <TeamPicker
        value={team}
        onChange={(v) => {
          setTeam(v);
          setErr('');
        }}
      />
      <ErrorText>{err}</ErrorText>
      <Button onPress={save} loading={checking || join.isPending || create.isPending}>
        Continue
      </Button>
      <Button tone="plain" height={44} onPress={signOut}>
        Log out
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
