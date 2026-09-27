import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BackLink, Button, Chips, ErrorText, Field, SBText, Screen, Title } from '@/components/sb/ui';
import { useCreateContest, useProducts } from '@/lib/api';
import {
  CONTEST_TYPES,
  contestTypeDescription,
  isoDate,
  isValidIsoDate,
  type ContestType,
} from '@/lib/salesbell';
import { errorMessage } from '@/lib/supabase';
import { useSalesBell } from '@/store/salesbell-store';

/** Next Monday and the Sunday after it, as default contest dates. */
function nextWeek() {
  const d = new Date();
  d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7));
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  return [isoDate(d), isoDate(end)];
}

const TYPE_OPTIONS = (Object.keys(CONTEST_TYPES) as ContestType[]).map(
  (t) => [t, CONTEST_TYPES[t].label] as [ContestType, string],
);

export default function NewContestScreen() {
  const { c, toast } = useSalesBell();
  const products = (useProducts().data ?? []).filter((p) => p.visible);
  const create = useCreateContest();
  const [defaultStart, defaultEnd] = nextWeek();

  const [name, setName] = useState('');
  const [type, setType] = useState<ContestType>('most_sales');
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [prize, setPrize] = useState('');
  const [target, setTarget] = useState('50');
  const [productId, setProductId] = useState<number | null>(null);
  const [err, setErr] = useState('');

  const needsProduct = type === 'product_challenge' || type === 'lottery';
  const product = needsProduct ? (products.find((p) => p.id === productId) ?? products[0]) : undefined;
  const targetN = parseInt(target, 10);
  const description = contestTypeDescription(type, product?.name, targetN > 0 ? targetN : undefined);

  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    setErr('');
  };

  const submit = () => {
    if (!name.trim()) return setErr('Give the contest a name');
    if (!isValidIsoDate(start) || !isValidIsoDate(end)) return setErr('Use dates like 2026-10-05');
    if (end < start) return setErr('The contest must end after it starts');
    if (type === 'first_to_x' && !(targetN > 0)) return setErr('Enter a target above 0');
    if (needsProduct && !product) return setErr('Add a visible product first');
    create.mutate(
      {
        name: name.trim(),
        type,
        description,
        starts_on: start,
        ends_on: end,
        prize: prize.trim() || 'To be announced',
        target: type === 'first_to_x' ? targetN : null,
        product_id: product?.id ?? null,
      },
      {
        onSuccess: () => {
          toast('Contest created', name.trim());
          router.dismissTo('/contests');
        },
        onError: (e) => setErr(errorMessage(e)),
      },
    );
  };

  return (
    <Screen stack>
      <BackLink label="Admin" />
      <Title>New contest</Title>
      <Field label="Name" value={name} onChangeText={edit(setName)} placeholder="e.g. Friday sprint" />
      <View style={{ gap: 8 }}>
        <SBText w={600} size={14}>
          Type
        </SBText>
        <Chips outlined height={44} options={TYPE_OPTIONS} value={type} onChange={setType} />
      </View>
      {needsProduct && products.length ? (
        <View style={{ gap: 8 }}>
          <SBText w={600} size={14}>
            Product
          </SBText>
          <Chips
            outlined
            height={44}
            options={products.map((p) => [p.id, p.name] as [number, string])}
            value={product?.id ?? products[0].id}
            onChange={setProductId}
          />
        </View>
      ) : null}
      {type === 'first_to_x' ? (
        <Field label="Target (sales)" value={target} onChangeText={edit(setTarget)} keyboardType="number-pad" />
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field row label="Starts" value={start} onChangeText={edit(setStart)} placeholder="YYYY-MM-DD" />
        <Field row label="Ends" value={end} onChangeText={edit(setEnd)} placeholder="YYYY-MM-DD" />
      </View>
      <Field label="Prize" value={prize} onChangeText={edit(setPrize)} placeholder="e.g. 500 kr gift card" />
      <View style={{ backgroundColor: c.accSoft, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, gap: 4 }}>
        <SBText w={800} size={12} color={c.accText}>
          RULES
        </SBText>
        <SBText lh={1.4}>{description}</SBText>
      </View>
      <ErrorText>{err}</ErrorText>
      <Button onPress={submit} loading={create.isPending}>
        Create contest
      </Button>
    </Screen>
  );
}
