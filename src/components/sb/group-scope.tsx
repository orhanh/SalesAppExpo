import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView } from 'react-native';

import { SBText } from '@/components/sb/ui';
import { useMyGroups, type Group } from '@/lib/api';
import { useSalesBell } from '@/store/salesbell-store';

/**
 * Which slice of the company a tab shows: the whole team, or one of the user's sales groups.
 * Kept in the `group` route param so other screens can link straight to a group's view.
 */
export function useGroupScope() {
  const { userId } = useSalesBell();
  const params = useLocalSearchParams<{ group?: string }>();
  const groups = useMyGroups(userId).data ?? [];
  // A group the user has since left falls back to everyone.
  const group = groups.find((g) => String(g.id) === params.group) ?? null;
  return {
    groups,
    group,
    memberIds: group ? group.members.map((m) => m.user_id) : undefined,
    setGroup: (id: number | null) => router.setParams({ group: id === null ? undefined : String(id) }),
  };
}

/** Horizontal chip row: my team (or everyone, for admins) + each group. Renders nothing without groups. */
export function GroupScope({
  groups,
  group,
  onChange,
}: {
  groups: Group[];
  group: Group | null;
  onChange: (id: number | null) => void;
}) {
  const { c, isAdmin } = useSalesBell();
  if (!groups.length) return null;
  // Sellers only ever see their own team; admins see the whole company.
  const options: [number | null, string][] = [[null, isAdmin ? 'Everyone' : 'My team'], ...groups.map((g): [number, string] => [g.id, g.name])];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -20, flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
      {options.map(([id, label]) => {
        const sel = id === (group?.id ?? null);
        return (
          <Pressable
            key={String(id)}
            onPress={() => onChange(id)}
            accessibilityRole="button"
            accessibilityState={{ selected: sel }}
            style={{
              height: 34,
              paddingHorizontal: 14,
              borderRadius: 17,
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: sel ? c.acc : c.line,
              backgroundColor: sel ? c.accSoft : 'transparent',
            }}>
            <SBText w={sel ? 700 : 600} size={14} color={sel ? c.accText : c.ink} numberOfLines={1}>
              {label}
            </SBText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
