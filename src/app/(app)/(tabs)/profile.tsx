import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import {
  Avatar,
  Card,
  Chevron,
  Grid,
  ListCard,
  ListRow,
  SBText,
  Screen,
  StatTile,
  Toggle,
} from '@/components/sb/ui';
import { useContestList } from '@/hooks/use-contest-list';
import { useLeaderboard, useMyStats } from '@/lib/api';
import { dayLabel, fmt, parseDate } from '@/lib/salesbell';
import { useSalesBell } from '@/store/salesbell-store';

export default function ProfileScreen() {
  const s = useSalesBell();
  const { c, profile, userId } = s;
  const stats = useMyStats().data;
  const today = useLeaderboard('d').data;
  const contests = useContestList().data;

  const rank =
    today && userId
      ? [...today]
          .sort((a, b) => b.sales - a.sales || (a.user_id === userId ? -1 : 1))
          .findIndex((r) => r.user_id === userId) + 1
      : 0;
  const activeContests = contests?.filter((k) => k.status === 'active').length;

  const statCards = stats
    ? [
        { label: 'Today', val: stats.today_sales + ' sales', sub: fmt(stats.today_revenue) },
        { label: 'This week', val: stats.week_sales + ' sales', sub: fmt(stats.week_revenue) },
        { label: 'This month', val: stats.month_sales + ' sales', sub: fmt(stats.month_revenue) },
        {
          label: 'Avg per day',
          val: (stats.month_sales / Math.max(1, stats.month_days)).toFixed(1) + ' sales',
          sub: 'This month',
        },
        {
          label: 'Best day',
          val: stats.best_day_sales + ' sales',
          sub: stats.best_day ? dayLabel(parseDate(stats.best_day)) : 'No sales yet',
        },
        {
          label: 'Most sold',
          val: stats.top_product ?? '—',
          sub: stats.top_product ? `${stats.top_product_share}% of your sales` : 'This month',
        },
      ]
    : [];

  const settings = [
    { label: 'Dark mode', on: s.isDark, toggle: () => s.setDark(!s.isDark) },
    { label: 'Bell sound', on: s.sound, toggle: () => s.setSound(!s.sound) },
    { label: 'Notifications', on: s.notif, toggle: () => s.setNotif(!s.notif) },
  ];

  const summary = [
    [rank ? '#' + rank : '–', 'Rank today'],
    [activeContests === undefined ? '–' : String(activeContests), 'Active contests'],
    [stats ? String(stats.best_day_sales) : '–', 'Personal record'],
  ];

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Avatar name={profile?.full_name ?? ''} size={72} weight={800} />
        <View style={{ gap: 2, flex: 1 }}>
          <SBText w={800} size={26} ls={-0.02}>
            {profile?.full_name}
          </SBText>
          <SBText size={14} color={c.mut}>
            {profile?.email}
          </SBText>
          <SBText w={700} size={13} color={c.accText}>
            {profile?.team?.name ? profile.team.name + ' · ' : ''}
            {s.isAdmin ? 'Admin' : 'Seller'}
          </SBText>
        </View>
      </View>

      <Card style={{ borderRadius: 20, paddingVertical: 14, paddingHorizontal: 4, flexDirection: 'row' }}>
        {summary.map(([val, label], i) => (
          <View
            key={label}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 2,
              borderLeftWidth: i === 1 ? 1 : 0,
              borderRightWidth: i === 1 ? 1 : 0,
              borderColor: c.line,
            }}>
            <SBText w={800} size={22}>
              {val}
            </SBText>
            <SBText w={600} size={12} color={c.mut}>
              {label}
            </SBText>
          </View>
        ))}
      </Card>

      {statCards.length ? (
        <Grid>
          {statCards.map((x) => (
            <StatTile key={x.label} label={x.label} val={x.val} sub={x.sub} big />
          ))}
        </Grid>
      ) : null}

      <ListCard>
        <ListRow last onPress={() => router.push('/history')} style={{ height: 54, justifyContent: 'space-between' }}>
          <SBText w={600} size={16}>
            Sales history
          </SBText>
          <Chevron />
        </ListRow>
      </ListCard>

      <ListCard>
        {settings.map((x) => (
          <ListRow key={x.label} onPress={x.toggle} style={{ height: 54, justifyContent: 'space-between' }}>
            <SBText w={600} size={16}>
              {x.label}
            </SBText>
            <Toggle on={x.on} />
          </ListRow>
        ))}
        <Pressable onPress={s.signOut} style={{ height: 54, justifyContent: 'center', paddingHorizontal: 16 }}>
          <SBText w={600} size={16} color={c.warn}>
            Log out
          </SBText>
        </Pressable>
      </ListCard>
    </Screen>
  );
}
