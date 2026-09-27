import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, BackLink, Button, Field, ListCard, ListRow, Notice, SBText, Screen, Tag, Title } from '@/components/sb/ui';
import { authRedirectUrl } from '@/hooks/use-auth-links';
import { useGroup, useGroupInvites, useInviteByEmail, useInviteToGroup, useProfiles } from '@/lib/api';
import { validEmail } from '@/lib/salesbell';
import { errorMessage } from '@/lib/supabase';
import { useSalesBell } from '@/store/salesbell-store';

export default function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { c, toast, profile } = useSalesBell();
  const group = useGroup(groupId);
  const invites = useGroupInvites(groupId);
  const profiles = useProfiles();
  const invite = useInviteToGroup();
  const byEmail = useInviteByEmail();
  const [q, setQ] = useState('');

  const members = new Set(group.data?.members.map((m) => m.user_id));
  const invited = new Set(invites.data?.map((i) => i.invitee_id));
  const query = q.trim().toLowerCase();
  const people = (profiles.data ?? [])
    // Groups stay inside one team (admins can see everyone, but can't mix teams either).
    .filter((p) => p.active && !members.has(p.id) && p.team_id === profile?.team_id)
    .filter((p) => !query || p.full_name.toLowerCase().includes(query) || p.email.toLowerCase().includes(query))
    .slice(0, 30);
  const emailIsNew = validEmail(query) && !(profiles.data ?? []).some((p) => p.email.toLowerCase() === query);

  const sendInvite = (userId: string, name: string) =>
    invite.mutate(
      { groupId, userId },
      {
        onSuccess: () => toast('Invite sent', name),
        onError: (e) => toast("Couldn't invite", errorMessage(e)),
      },
    );

  const sendEmail = () =>
    byEmail.mutate(
      { groupId, email: query, redirectTo: authRedirectUrl() },
      {
        onSuccess: (status) => {
          toast(status === 'emailed' ? 'Invite emailed' : 'Invite sent', query);
          setQ('');
        },
        onError: (e) => toast("Couldn't send invite", errorMessage(e)),
      },
    );

  return (
    <Screen stack>
      <BackLink label={group.data?.name ?? 'Group'} />
      <Title sub="Search your teammates by name or email. Someone who isn't on SalesBell yet can be invited by email.">
        Invite people
      </Title>
      <Field
        label="Name or email"
        value={q}
        onChangeText={setQ}
        placeholder="e.g. Anna or anna@company.dk"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoFocus
      />

      {emailIsNew ? (
        <View style={{ gap: 6 }}>
          <Button onPress={sendEmail} loading={byEmail.isPending}>
            {`Email an invite to ${query}`}
          </Button>
          <SBText size={13} color={c.mut} style={{ textAlign: 'center' }}>
            They&apos;ll get a link to create their account and join the group.
          </SBText>
        </View>
      ) : null}

      {profiles.isError ? (
        <Notice onRetry={() => profiles.refetch()}>Couldn&apos;t load people.</Notice>
      ) : people.length ? (
        <ListCard>
          {people.map((p, i) => {
            const sent = invited.has(p.id);
            return (
              <ListRow
                key={p.id}
                last={i === people.length - 1}
                onPress={sent || invite.isPending ? undefined : () => sendInvite(p.id, p.full_name)}>
                <Avatar name={p.full_name} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <SBText w={700} numberOfLines={1}>
                    {p.full_name}
                  </SBText>
                  <SBText size={13} color={c.mut} numberOfLines={1}>
                    {p.email}
                  </SBText>
                </View>
                {sent ? (
                  <Tag>Invited</Tag>
                ) : (
                  <SBText w={700} color={c.accText}>
                    Invite
                  </SBText>
                )}
              </ListRow>
            );
          })}
        </ListCard>
      ) : profiles.isPending || emailIsNew ? null : (
        <Notice>
          {query ? 'No one matches. Type their full email address to invite them by email.' : 'Everyone is already in this group.'}
        </Notice>
      )}
    </Screen>
  );
}
