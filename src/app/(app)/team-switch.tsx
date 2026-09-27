import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { EMPTY_TEAM_CHOICE, TeamPicker, checkTeamChoice, type TeamChoice } from '@/components/sb/team-picker';
import { Button, ErrorText, SBText, SheetBody } from '@/components/sb/ui';
import { useCreateTeam, useJoinTeam, useMyTeam } from '@/lib/api';
import { errorMessage } from '@/lib/supabase';
import { useSalesBell } from '@/store/salesbell-store';

export default function TeamSwitchSheet() {
  const { c, userId, toast } = useSalesBell();
  const current = useMyTeam(userId).data;
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
    const done = (title: string, sub: string) => {
      toast(title, sub);
      router.back();
    };
    if (team.mode === 'join') {
      join.mutate(team.code, { onSuccess: () => done('Switched team', ''), onError });
    } else {
      create.mutate(team.name, { onSuccess: (t) => done('Team started', `Share code ${t?.code ?? ''}`), onError });
    }
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets style={{ backgroundColor: c.bg }}>
      <SheetBody bg={c.bg}>
        <SBText w={800} size={22}>
          Switch team
        </SBText>
        {current?.members === 1 ? (
          <SBText size={14} color={c.warn} lh={1.4}>
            You&apos;re the only member of {current.name}, so it will be closed when you leave.
          </SBText>
        ) : null}
        <TeamPicker
          value={team}
          onChange={(v) => {
            setTeam(v);
            setErr('');
          }}
        />
        <ErrorText>{err}</ErrorText>
        <Button onPress={save} loading={checking || join.isPending || create.isPending}>
          {team.mode === 'join' ? 'Join team' : 'Start team'}
        </Button>
        <View style={{ marginTop: -4 }}>
          <Button tone="plain" height={44} onPress={() => router.back()}>
            Cancel
          </Button>
        </View>
      </SheetBody>
    </ScrollView>
  );
}
