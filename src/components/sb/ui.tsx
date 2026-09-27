import { router } from 'expo-router';
import { useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONT, type Weight } from '@/constants/theme';
import { useColors } from '@/store/salesbell-store';

type SBTextProps = TextProps & {
  w?: Weight;
  size?: number;
  color?: string;
  /** Letter spacing in em, like the design. */
  ls?: number;
  lh?: number;
};

export function SBText({ w = 400, size = 15, color, ls, lh, style, ...rest }: SBTextProps) {
  const c = useColors();
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: FONT[w],
          fontSize: size,
          color: color ?? c.ink,
          letterSpacing: ls ? ls * size : undefined,
          lineHeight: lh ? lh * size : undefined,
        },
        style,
      ]}
    />
  );
}

type ScreenProps = PropsWithChildren<{
  /** Stack screens start with a back link instead of top padding. */
  stack?: boolean;
  gap?: number;
  padX?: number;
  scroll?: boolean;
}>;

export function Screen({ children, stack, gap = 14, padX = 20, scroll = true }: ScreenProps) {
  const c = useColors();
  const content: ViewStyle = {
    flexGrow: 1,
    paddingHorizontal: padX,
    paddingTop: stack ? 0 : 8,
    paddingBottom: 24,
    gap,
  };
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[content, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function BackLink({ label }: { label: string }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, alignSelf: 'flex-start' }}>
      <SBText w={600} size={28} color={c.accText} style={{ marginTop: -3 }}>
        ‹
      </SBText>
      <SBText w={600} size={16} color={c.accText}>
        {label}
      </SBText>
    </Pressable>
  );
}

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <SBText w={800} size={30} ls={-0.02} lh={1.15}>
        {children}
      </SBText>
      {sub ? (
        <SBText size={14} color={c.mut} lh={1.4}>
          {sub}
        </SBText>
      ) : null}
    </View>
  );
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={style}>
      <SBText w={700} size={13} color={c.mut} ls={0.06}>
        {children}
      </SBText>
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  flat,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; onPress?: () => void; flat?: boolean }>) {
  const c = useColors();
  const base: ViewStyle = {
    backgroundColor: c.card,
    borderRadius: 18,
    boxShadow: flat ? undefined : c.shadow,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

/** A card whose children are separated by hairlines. */
export function ListCard({ children }: PropsWithChildren) {
  return <Card style={{ overflow: 'hidden' }}>{children}</Card>;
}

export function ListRow({
  children,
  onPress,
  last,
  style,
}: PropsWithChildren<{ onPress?: () => void; last?: boolean; style?: StyleProp<ViewStyle> }>) {
  const c = useColors();
  const base: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    borderBottomWidth: last ? 0 : 1,
    borderBottomColor: c.line,
  };
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [base, style, pressed && { backgroundColor: c.el }]}>
      {children}
    </Pressable>
  );
}

export function Chevron() {
  const c = useColors();
  return (
    <SBText size={22} color={c.mut}>
      ›
    </SBText>
  );
}

export function Tag({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'acc' | 'warn' }) {
  const c = useColors();
  const bg = tone === 'acc' ? c.accSoft : tone === 'warn' ? c.warnSoft : c.el;
  const fg = tone === 'acc' ? c.accText : tone === 'warn' ? c.warn : c.ink;
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 8 }}>
      <SBText w={700} size={12} color={fg}>
        {children}
      </SBText>
    </View>
  );
}

export function Segmented<K extends string>({
  options,
  value,
  onChange,
  height = 36,
}: {
  options: [K, string][];
  value: K;
  onChange: (k: K) => void;
  height?: number;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.el, borderRadius: 12, padding: 3, gap: 2 }}>
      {options.map(([k, label]) => {
        const sel = k === value;
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            style={{
              flex: 1,
              height,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: sel ? c.card : 'transparent',
              boxShadow: sel ? '0 1px 3px rgba(0,0,0,0.08)' : undefined,
            }}>
            <SBText w={sel ? 700 : 600} size={14} color={sel ? c.ink : c.mut}>
              {label}
            </SBText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Pill-shaped choice chips. `outlined` matches the form variant of the design. */
export function Chips<K extends string | number>({
  options,
  value,
  onChange,
  outlined,
  height = 36,
}: {
  options: [K, string][];
  value: K;
  onChange: (k: K) => void;
  outlined?: boolean;
  height?: number;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(([k, label]) => {
        const sel = k === value;
        return (
          <Pressable
            key={String(k)}
            onPress={() => onChange(k)}
            style={{
              height,
              paddingHorizontal: 16,
              borderRadius: height / 2,
              justifyContent: 'center',
              backgroundColor: sel ? c.ink : c.card,
              borderWidth: outlined && !sel ? 1.5 : 0,
              borderColor: c.line,
              boxShadow: !sel && !outlined ? c.shadow : undefined,
            }}>
            <SBText w={sel ? 700 : 600} size={14} color={sel ? c.bg : c.ink}>
              {label}
            </SBText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ on }: { on: boolean }) {
  const c = useColors();
  return (
    <View
      style={{
        width: 51,
        height: 31,
        borderRadius: 16,
        padding: 2,
        backgroundColor: on ? c.acc : c.sel,
        alignItems: on ? 'flex-end' : 'flex-start',
      }}>
      <View
        style={{
          width: 27,
          height: 27,
          borderRadius: 14,
          backgroundColor: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      />
    </View>
  );
}

export function Field({
  label,
  row,
  ...input
}: TextInputProps & { label: string; /** Share a row equally with sibling fields. */ row?: boolean }) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: 6, minWidth: 0 }, row && { flex: 1 }]}>
      <SBText w={600} size={14}>
        {label}
      </SBText>
      <TextInput
        placeholderTextColor={c.faint}
        {...input}
        onFocus={(e) => {
          setFocused(true);
          input.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          input.onBlur?.(e);
        }}
        style={{
          height: 52,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: focused ? c.acc : c.line,
          backgroundColor: c.card,
          color: c.ink,
          paddingHorizontal: 16,
          fontFamily: FONT[500],
          fontSize: 16,
        }}
      />
    </View>
  );
}

export function Button({
  children,
  onPress,
  tone = 'acc',
  height = 54,
  loading,
}: {
  children: ReactNode;
  onPress: () => void;
  tone?: 'acc' | 'warn' | 'outline' | 'plain';
  height?: number;
  /** Disables the button and dims it while a request is in flight. */
  loading?: boolean;
}) {
  const c = useColors();
  const bg = tone === 'acc' ? c.acc : tone === 'warn' ? c.warn : 'transparent';
  const fg = tone === 'acc' ? c.accInk : tone === 'warn' ? '#fff' : c.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityState={{ busy: !!loading, disabled: !!loading }}
      style={({ pressed }) => ({
        opacity: loading ? 0.6 : 1,
        height,
        borderRadius: tone === 'outline' ? 14 : 16,
        backgroundColor: bg,
        borderWidth: tone === 'outline' ? 1.5 : 0,
        borderColor: c.line,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
      <SBText w={tone === 'plain' || tone === 'outline' ? 700 : 800} size={16} color={fg}>
        {children}
      </SBText>
    </Pressable>
  );
}

export function ErrorText({ children }: { children: string }) {
  const c = useColors();
  if (!children) return null;
  return (
    <SBText w={600} size={14} color={c.warn}>
      {children}
    </SBText>
  );
}

export function ProgressBar({ pct, height = 8, color }: { pct: number; height?: number; color?: string }) {
  const c = useColors();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.el, overflow: 'hidden' }}>
      <View
        style={{ height: '100%', width: `${pct}%`, borderRadius: height / 2, backgroundColor: color ?? c.acc }}
      />
    </View>
  );
}

export function Avatar({
  name,
  size = 36,
  me,
  bg,
  weight = 700,
}: {
  name: string;
  size?: number;
  me?: boolean;
  bg?: string;
  weight?: Weight;
}) {
  const c = useColors();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg ?? (me ? c.acc : c.sel),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <SBText w={weight} size={Math.round(size * 0.38)} color={me ? c.accInk : c.ink}>
        {name.charAt(0).toUpperCase()}
      </SBText>
    </View>
  );
}

export function StatTile({ label, val, sub, big }: { label: string; val: string; sub?: string; big?: boolean }) {
  const c = useColors();
  return (
    <Card style={{ flex: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, gap: 2 }}>
      <SBText w={600} size={12} color={c.mut}>
        {label}
      </SBText>
      <SBText w={big ? 800 : 700} size={big ? 19 : 15} ls={big ? -0.01 : undefined}>
        {val}
      </SBText>
      {sub ? (
        <SBText size={13} color={c.mut}>
          {sub}
        </SBText>
      ) : null}
    </Card>
  );
}

/** Lays children out in rows of `cols` equal columns. */
export function Grid({ children, cols = 2, gap = 8 }: { children: ReactNode[]; cols?: number; gap?: number }) {
  const rows: ReactNode[][] = [];
  children.forEach((child, i) => {
    if (i % cols === 0) rows.push([]);
    rows[rows.length - 1].push(child);
  });
  return (
    <View style={{ gap }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap }}>
          {row}
          {Array.from({ length: cols - row.length }, (_, j) => (
            <View key={'pad' + j} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: c.el,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}>
      <SBText w={600} size={20}>
        {label}
      </SBText>
    </Pressable>
  );
}

/** Grabber + container used by form-sheet routes. */
export function SheetBody({ children, bg }: PropsWithChildren<{ bg?: string }>) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: bg ?? c.card, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34, gap: 14 }}>
      <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: c.sel, alignSelf: 'center' }} />
      {children}
    </View>
  );
}

/** Placeholder card for loading, empty and error states. */
export function Notice({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  const c = useColors();
  return (
    <Card style={{ padding: 20, gap: 10, alignItems: 'center' }}>
      <SBText color={c.mut} style={{ textAlign: 'center' }} lh={1.45}>
        {children}
      </SBText>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8}>
          <SBText w={700} color={c.accText}>
            Try again
          </SBText>
        </Pressable>
      ) : null}
    </Card>
  );
}
