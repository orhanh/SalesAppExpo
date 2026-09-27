import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, ErrorText, Field, SBText, SheetBody } from '@/components/sb/ui';
import { useCreateGroup, useGroup, useRenameGroup } from '@/lib/api';
import { errorMessage } from '@/lib/supabase';
import { useSalesBell } from '@/store/salesbell-store';

/** Create a group, or rename one when opened with `?id=`. */
export default function GroupEditSheet() {
  const { c, toast } = useSalesBell();
  const params = useLocalSearchParams<{ id?: string }>();
  const groupId = params.id ? Number(params.id) : null;
  const existing = useGroup(groupId);
  const create = useCreateGroup();
  const rename = useRenameGroup();

  const [name, setName] = useState(groupId ? (existing.data?.name ?? '') : '');
  const [err, setErr] = useState('');

  const submit = () => {
    const clean = name.trim();
    if (!clean) return setErr('Give the group a name');
    if (groupId) {
      rename.mutate(
        { groupId, name: clean },
        {
          onSuccess: () => {
            toast('Group renamed', clean);
            router.back();
          },
          onError: (e) => setErr(errorMessage(e)),
        },
      );
    } else {
      create.mutate(clean, {
        onSuccess: (id) => {
          toast('Group created', 'Now invite some people');
          router.replace({ pathname: '/groups/[id]', params: { id: String(id) } });
        },
        onError: (e) => setErr(errorMessage(e)),
      });
    }
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets style={{ backgroundColor: c.bg }}>
      <SheetBody bg={c.bg}>
        <SBText w={800} size={22}>
          {groupId ? 'Rename group' : 'New group'}
        </SBText>
        <Field
          label="Name"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setErr('');
          }}
          placeholder="e.g. Friday Closers"
          maxLength={40}
          autoFocus
          onSubmitEditing={submit}
        />
        <ErrorText>{err}</ErrorText>
        <Button onPress={submit} loading={create.isPending || rename.isPending}>
          {groupId ? 'Save' : 'Create group'}
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
