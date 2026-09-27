import type { Session } from '@supabase/supabase-js';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';

import { DARK, LIGHT, type Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient, useProfile } from '@/lib/api';
import { authStorage } from '@/lib/auth-storage';
import { supabase } from '@/lib/supabase';

type Toast = { id: number; title: string; sub: string };
type Prefs = { dark: boolean | null; sound: boolean; notif: boolean };

const PREFS_KEY = 'salesbell.prefs';
const DEFAULT_PREFS: Prefs = { dark: null, sound: true, notif: true };

function loadPrefs(): Prefs {
  try {
    const raw = authStorage?.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function useSalesBellValue() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [toastMsg, setToastMsg] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scheme = useColorScheme();
  const bell = useAudioPlayer(require('@/assets/sounds/bell.wav'));

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') queryClient.clear();
    });
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(toastTimer.current);
    };
  }, []);

  const userId = session?.user.id;
  const profileQuery = useProfile(userId);
  const profile = profileQuery.data;

  const isDark = prefs.dark ?? scheme === 'dark';
  const c: Palette = isDark ? DARK : LIGHT;

  const setPref = <K extends keyof Prefs>(k: K, v: Prefs[K]) =>
    setPrefs((p) => {
      const next = { ...p, [k]: v };
      try {
        authStorage?.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

  const toast = (title: string, sub = '') => {
    clearTimeout(toastTimer.current);
    setToastMsg({ id: Date.now(), title, sub });
    toastTimer.current = setTimeout(() => setToastMsg(null), 2200);
  };

  const playBell = () => {
    if (prefs.sound) {
      // Web returns promises that reject when autoplay is blocked; a missed ding is fine.
      Promise.resolve(bell.seekTo(0)).catch(() => {});
      Promise.resolve(bell.play() as unknown).catch(() => {});
    }
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return {
    c,
    isDark,
    authReady,
    session,
    userId,
    profile,
    profileLoading: !!userId && profileQuery.isPending,
    isAdmin: !!profile && profile.role === 'admin' && profile.active,
    recovering,
    startRecovery: () => setRecovering(true),
    endRecovery: () => setRecovering(false),
    sound: prefs.sound,
    notif: prefs.notif,
    setDark: (v: boolean) => setPref('dark', v),
    setSound: (v: boolean) => setPref('sound', v),
    setNotif: (v: boolean) => setPref('notif', v),
    toastMsg,
    toast,
    playBell,
    signOut: () => supabase.auth.signOut(),
  };
}

type SalesBell = ReturnType<typeof useSalesBellValue>;

const SalesBellContext = createContext<SalesBell | null>(null);

export function SalesBellProvider({ children }: PropsWithChildren) {
  const value = useSalesBellValue();
  return <SalesBellContext.Provider value={value}>{children}</SalesBellContext.Provider>;
}

export function useSalesBell() {
  const ctx = useContext(SalesBellContext);
  if (!ctx) throw new Error('useSalesBell must be used inside SalesBellProvider');
  return ctx;
}

/** Shortcut for the active color palette. */
export function useColors() {
  return useSalesBell().c;
}
