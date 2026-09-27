import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Card,
  Chevron,
  Grid,
  ListCard,
  ListRow,
  ProgressBar,
  SBText,
  Screen,
  SectionLabel,
  Segmented,
  Title,
} from '@/components/sb/ui';
import {
  useAudit,
  useLeaderboard,
  useProductSales,
  useProducts,
  useProfiles,
  useRequests,
  useSettings,
  useSpinFields,
  useTeams,
} from '@/lib/api';
import { PERIODS, fmt, type Period } from '@/lib/salesbell';
import { useSalesBell } from '@/store/salesbell-store';

function Bars({ title, rows }: { title: string; rows: { key: string; name: string; val: string; pct: number }[] }) {
  const { c } = useSalesBell();
  return (
    <Card style={{ borderRadius: 20, padding: 16, gap: 12 }}>
      <SBText w={800} size={16}>
        {title}
      </SBText>
      {rows.length === 0 ? (
        <SBText size={14} color={c.mut}>
          No data yet.
        </SBText>
      ) : (
        rows.map((r) => (
          <View key={r.key} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <SBText w={600} size={14} numberOfLines={1} style={{ flexShrink: 1 }}>
                {r.name}
              </SBText>
              <SBText w={700} size={14}>
                {r.val}
              </SBText>
            </View>
            <ProgressBar pct={r.pct} />
          </View>
        ))
      )}
    </Card>
  );
}

export default function AdminScreen() {
  const { c, userId, toast } = useSalesBell();
  const [period, setPeriod] = useState<Period>('d');

  const board = useLeaderboard(period).data ?? [];
  const today = useLeaderboard('d').data ?? [];
  const productSales = useProductSales(period).data ?? [];
  const products = useProducts().data ?? [];
  const profiles = useProfiles().data ?? [];
  const teams = useTeams().data ?? [];
  const pending = useRequests().data?.length ?? 0;
  const auditCount = useAudit().data?.length;
  const settings = useSettings().data;
  const fields = useSpinFields().data ?? [];
  const goal = settings?.daily_goal ?? 10;

  const sellers = [...board].sort((a, b) => b.sales - a.sales);
  const total = board.reduce((a, r) => a + r.sales, 0);
  const totalRev = board.reduce((a, r) => a + r.revenue, 0);
  const pmax = Math.max(1, ...productSales.map((p) => p.units));
  const smax = Math.max(1, sellers[0]?.sales ?? 0);

  const kpis = [
    { label: 'Sales', val: String(total) },
    { label: 'Revenue', val: fmt(totalRev) },
    { label: 'Active sellers', val: String(profiles.filter((u) => u.active).length) },
    { label: 'At goal today', val: `${today.filter((r) => r.sales >= goal).length} of ${today.length}` },
  ];

  const manage: { label: string; sub: string; href?: Href; onPress?: () => void; badge?: number }[] = [
    { label: 'Products', sub: products.filter((p) => p.visible).length + ' visible to sellers', href: '/admin/products' },
    { label: 'Users & teams', sub: `${profiles.length} users · ${teams.length} teams`, href: '/admin/users' },
    { label: 'Create contest', sub: 'Sales, revenue, product, first to X, lottery', href: '/admin/new-contest' },
    {
      label: 'Spin to Win wheel',
      sub: `${fields.length} fields · 1 spin per ${settings?.spin_every ?? '–'} sales`,
      href: '/admin/spin',
    },
    {
      label: 'Cancellation requests',
      sub: pending ? pending + ' waiting for review' : 'Nothing waiting',
      href: '/admin/requests',
      badge: pending,
    },
    {
      label: 'Audit log',
      sub: auditCount === undefined ? 'Every change, recorded' : auditCount + (auditCount === 100 ? '+ entries' : ' entries'),
      href: '/admin/audit',
    },
    {
      label: 'Export sales',
      sub: 'CSV, opens in Excel',
      onPress: () => toast('Export is coming soon', 'Use the Supabase dashboard for now'),
    },
  ];

  return (
    <Screen>
      <Title sub="All teams">Admin</Title>
      <Segmented options={PERIODS} value={period} onChange={setPeriod} height={38} />
      <Grid>
        {kpis.map((k) => (
          <Card key={k.label} style={{ flex: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, gap: 2 }}>
            <SBText w={600} size={12} color={c.mut}>
              {k.label}
            </SBText>
            <SBText w={800} size={24} ls={-0.02}>
              {k.val}
            </SBText>
          </Card>
        ))}
      </Grid>
      <Bars
        title="Sales per product"
        rows={productSales.map((p) => ({
          key: String(p.product_id),
          name: p.name,
          val: p.units + ' sales',
          pct: Math.round((p.units / pmax) * 100),
        }))}
      />
      <Bars
        title="Top sellers"
        rows={sellers.slice(0, 5).map((r) => ({
          key: r.user_id,
          name: r.full_name + (r.user_id === userId ? ' (you)' : ''),
          val: r.sales + ' sales',
          pct: Math.round((r.sales / smax) * 100),
        }))}
      />
      <SectionLabel>MANAGE</SectionLabel>
      <ListCard>
        {manage.map((m, i) => (
          <ListRow key={m.label} last={i === manage.length - 1} onPress={m.onPress ?? (() => router.push(m.href!))}>
            <View style={{ flex: 1, gap: 2 }}>
              <SBText w={700}>{m.label}</SBText>
              <SBText size={13} color={c.mut}>
                {m.sub}
              </SBText>
            </View>
            {m.badge ? (
              <View
                style={{
                  minWidth: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: c.warn,
                  paddingHorizontal: 7,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <SBText w={800} size={13} color="#fff">
                  {m.badge}
                </SBText>
              </View>
            ) : null}
            <Chevron />
          </ListRow>
        ))}
      </ListCard>
    </Screen>
  );
}
