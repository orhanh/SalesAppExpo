import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { BackLink, Chevron, ListCard, ListRow, Notice, SBText, Screen, Tag, Title } from '@/components/sb/ui';
import { useProducts } from '@/lib/api';
import { fmt, ptsLabel } from '@/lib/salesbell';
import { useColors } from '@/store/salesbell-store';

export default function ProductsScreen() {
  const c = useColors();
  const products = useProducts();
  const list = products.data ?? [];
  return (
    <Screen stack>
      <BackLink label="Admin" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Title>Products</Title>
        <Pressable
          onPress={() => router.push('/admin/product-edit')}
          style={{ height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: c.acc, justifyContent: 'center' }}>
          <SBText w={800} color={c.accInk}>
            + Add
          </SBText>
        </Pressable>
      </View>
      <SBText size={14} color={c.mut} style={{ marginTop: -6 }}>
        Visible products appear on every seller&apos;s home screen.
      </SBText>
      {products.isError ? (
        <Notice onRetry={() => products.refetch()}>Couldn&apos;t load products.</Notice>
      ) : list.length ? (
        <ListCard>
          {list.map((p, i) => (
            <ListRow
              key={p.id}
              last={i === list.length - 1}
              onPress={() => router.push({ pathname: '/admin/product-edit', params: { id: String(p.id) } })}>
              <View style={{ flex: 1, gap: 2 }}>
                <SBText w={700}>{p.name}</SBText>
                <SBText size={13} color={c.mut}>
                  {fmt(p.price)} · {ptsLabel(p.points)} · {p.category}
                </SBText>
              </View>
              <Tag tone={p.visible ? 'acc' : 'plain'}>{p.visible ? 'Visible' : 'Hidden'}</Tag>
              <Chevron />
            </ListRow>
          ))}
        </ListCard>
      ) : products.isPending ? null : (
        <Notice>No products yet. Add the first one.</Notice>
      )}
    </Screen>
  );
}
