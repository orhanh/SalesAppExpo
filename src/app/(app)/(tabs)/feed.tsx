import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { GroupScope, useGroupScope } from '@/components/sb/group-scope';
import { Avatar, Notice, SBText, Screen } from '@/components/sb/ui';
import { FEED_DOTS } from '@/constants/theme';
import { useFeed } from '@/lib/api';
import { feedTime, firstName } from '@/lib/salesbell';
import { useSalesBell } from '@/store/salesbell-store';

const KIND_LABEL = { bell: 'Sale', goal: 'Milestone', lead: 'Contest', spin: 'Spin to Win' };

export default function FeedScreen() {
  const { c, userId } = useSalesBell();
  const scope = useGroupScope();
  const feed = useFeed(scope.memberIds);
  return (
    <Screen gap={10}>
      <View style={{ gap: 2, marginBottom: 4 }}>
        <SBText w={800} size={30} ls={-0.02}>
          Feed
        </SBText>
        <SBText size={14} color={c.mut}>
          {scope.group ? `Live from ${scope.group.name}` : 'Live from your team'}
        </SBText>
      </View>
      <GroupScope groups={scope.groups} group={scope.group} onChange={scope.setGroup} />
      {feed.isError ? (
        <Notice onRetry={() => feed.refetch()}>Couldn&apos;t load the feed.</Notice>
      ) : feed.isPending ? null : feed.data.length === 0 ? (
        <Notice>
          {scope.group ? 'Nothing from this group yet.' : 'Nothing yet today. Ring the bell to get things going!'}
        </Notice>
      ) : (
        feed.data.map((f) => {
          const name = f.profile?.full_name ?? 'Someone';
          return (
            <Animated.View
              key={f.id}
              entering={FadeIn.duration(300)}
              style={{
                backgroundColor: c.card,
                borderRadius: 18,
                paddingVertical: 14,
                paddingHorizontal: 16,
                flexDirection: 'row',
                gap: 12,
                alignItems: 'flex-start',
                boxShadow: c.shadow,
              }}>
              <View>
                <Avatar name={name} size={40} weight={800} />
                <View
                  style={{
                    position: 'absolute',
                    right: -2,
                    bottom: -2,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    borderWidth: 2,
                    borderColor: c.card,
                    backgroundColor: f.kind === 'bell' ? c.acc : FEED_DOTS[f.kind],
                  }}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <SBText lh={1.35}>
                  <SBText w={800}>{f.user_id === userId ? 'You' : firstName(name)}</SBText> {f.text}
                </SBText>
                <SBText size={13} color={c.mut}>
                  {KIND_LABEL[f.kind]} · {f.sub}
                </SBText>
              </View>
              <SBText size={12} color={c.mut} style={{ paddingTop: 2 }}>
                {feedTime(f.created_at)}
              </SBText>
            </Animated.View>
          );
        })
      )}
    </Screen>
  );
}
