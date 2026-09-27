import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button, ErrorText, Field, SBText, SheetBody, Toggle } from '@/components/sb/ui';
import { useDeleteProduct, useProducts, useSaveProduct } from '@/lib/api';
import { errorMessage } from '@/lib/supabase';
import { useSalesBell } from '@/store/salesbell-store';

export default function ProductEditSheet() {
  const { c, toast } = useSalesBell();
  const params = useLocalSearchParams<{ id?: string }>();
  const existing = useProducts().data?.find((p) => String(p.id) === params.id) ?? null;
  const save = useSaveProduct();
  const del = useDeleteProduct();
  // Deleting needs a second tap.
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName] = useState(existing?.name ?? '');
  const [price, setPrice] = useState(existing ? String(existing.price) : '');
  const [pts, setPts] = useState(existing ? String(existing.points) : '1');
  const [cat, setCat] = useState(existing?.category ?? '');
  const [visible, setVisible] = useState(existing?.visible ?? true);
  const [err, setErr] = useState('');

  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    setErr('');
  };

  const submit = () => {
    const priceN = parseInt(price, 10);
    if (!name.trim()) return setErr('Give the product a name');
    if (!(priceN > 0)) return setErr('Enter a price above 0');
    const product = {
      name: name.trim(),
      price: priceN,
      points: Math.max(0, parseInt(pts, 10) || 0),
      category: cat.trim() || 'General',
      visible,
    };
    save.mutate(
      { id: existing?.id ?? null, product },
      {
        onSuccess: () => {
          toast(existing ? 'Product saved' : 'Product created', product.name);
          router.back();
        },
        onError: (e) => setErr(errorMessage(e)),
      },
    );
  };

  const remove = () => {
    if (!existing) return;
    if (!confirmDelete) return setConfirmDelete(true);
    del.mutate(existing.id, {
      onSuccess: (r) => {
        toast('Product deleted', r === 'archived' ? `${existing.name} stays in sales history` : existing.name);
        router.back();
      },
      onError: (e) => {
        setConfirmDelete(false);
        setErr(errorMessage(e));
      },
    });
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets style={{ backgroundColor: c.bg }}>
      <SheetBody bg={c.bg}>
        <SBText w={800} size={22}>
          {existing ? 'Edit product' : 'New product'}
        </SBText>
        <Field label="Name" value={name} onChangeText={edit(setName)} placeholder="e.g. Product D" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field row label="Price (kr)" value={price} onChangeText={edit(setPrice)} keyboardType="number-pad" />
          <Field row label="Points" value={pts} onChangeText={edit(setPts)} keyboardType="number-pad" />
        </View>
        <Field label="Category" value={cat} onChangeText={edit(setCat)} placeholder="e.g. Subscriptions" />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48 }}>
          <SBText w={600} size={16}>
            Visible to sellers
          </SBText>
          <Toggle on={visible} />
        </Pressable>
        <ErrorText>{err}</ErrorText>
        <Button onPress={submit} loading={save.isPending}>
          Save product
        </Button>
        <View style={{ marginTop: -4 }}>
          <Button tone="plain" height={44} onPress={() => router.back()}>
            Cancel
          </Button>
        </View>
        {existing ? (
          <View style={{ gap: 6 }}>
            <Button tone={confirmDelete ? 'warn' : 'outline'} height={48} onPress={remove} loading={del.isPending}>
              {confirmDelete ? 'Tap again to delete' : 'Delete product'}
            </Button>
            {confirmDelete ? (
              <SBText size={13} color={c.mut} style={{ textAlign: 'center' }} lh={1.4}>
                Sellers can no longer ring it up. Past sales keep counting in history and leaderboards.
              </SBText>
            ) : null}
          </View>
        ) : null}
      </SheetBody>
    </ScrollView>
  );
}
