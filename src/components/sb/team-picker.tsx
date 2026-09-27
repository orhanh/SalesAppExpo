import { View } from 'react-native';

import { Field, SBText, Segmented } from '@/components/sb/ui';
import { teamNameTaken, useTeamPreview } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/store/salesbell-store';

export type TeamChoice = { mode: 'join'; code: string } | { mode: 'create'; name: string };

export const EMPTY_TEAM_CHOICE: TeamChoice = { mode: 'join', code: '' };

/** Codes are six letters/digits; people type them in any case, with spaces or dashes. */
const cleanCode = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

/** Join a team with its code, or start a new one. Used at sign-up, in the team gate and when switching. */
export function TeamPicker({ value, onChange }: { value: TeamChoice; onChange: (v: TeamChoice) => void }) {
  const c = useColors();
  const code = value.mode === 'join' ? value.code : '';
  const preview = useTeamPreview(code);

  return (
    <View style={{ gap: 10 }}>
      <Segmented
        height={40}
        options={[
          ['join', 'Join a team'],
          ['create', 'Start a new team'],
        ]}
        value={value.mode}
        onChange={(mode) => onChange(mode === 'join' ? { mode, code: '' } : { mode, name: '' })}
      />
      {value.mode === 'join' ? (
        <View style={{ gap: 6 }}>
          <Field
            label="Team code"
            value={value.code}
            onChangeText={(v) => onChange({ mode: 'join', code: cleanCode(v) })}
            placeholder="e.g. K7QM2X"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
          />
          {code.length < 6 ? (
            <SBText size={13} color={c.mut}>
              Ask a teammate for the code. They&apos;ll find it under Profile → Team.
            </SBText>
          ) : preview.isPending ? null : preview.data ? (
            <SBText w={700} size={14} color={c.accText}>
              ✓ {preview.data.name} · {preview.data.members} {preview.data.members === 1 ? 'member' : 'members'}
            </SBText>
          ) : (
            <SBText w={600} size={14} color={c.warn}>
              No team has that code
            </SBText>
          )}
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          <Field
            label="Team name"
            value={value.name}
            onChangeText={(v) => onChange({ mode: 'create', name: v })}
            placeholder="e.g. Odense Closers"
            maxLength={40}
          />
          <SBText size={13} color={c.mut}>
            You&apos;ll get a code to share so your colleagues can join.
          </SBText>
        </View>
      )}
    </View>
  );
}

/** An error message for the choice, or '' when it can be submitted. */
export async function checkTeamChoice(choice: TeamChoice): Promise<string> {
  if (choice.mode === 'join') {
    if (choice.code.length !== 6) return 'Enter the 6-character team code';
    const { data, error } = await supabase.rpc('team_preview', { p_code: choice.code });
    if (error) return 'Couldn’t check the team code. Try again.';
    if (!data?.length) return 'No team has that code. Check it with your teammate.';
    return '';
  }
  const name = choice.name.trim();
  if (!name) return 'Give your team a name';
  try {
    if (await teamNameTaken(name)) return `A team called ${name} already exists. Ask them for their join code.`;
  } catch {
    return 'Couldn’t check the team name. Try again.';
  }
  return '';
}
