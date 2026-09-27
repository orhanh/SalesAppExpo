/**
 * SalesBell design tokens. Colors come from the design's oklch palette, converted to hex.
 */
export const LIGHT = {
  bg: '#F7F7F9',
  card: '#FFFFFF',
  el: '#F0F0F3',
  sel: '#E0E1E6',
  ink: '#111214',
  mut: '#60646C',
  faint: '#B0B4BA',
  line: '#ECECEF',
  acc: '#0EA053',
  accInk: '#FFFFFF',
  accText: '#007136',
  accSoft: '#E7FBEB',
  warn: '#C93029',
  warnSoft: '#FFEBE7',
  toastBg: '#111214',
  toastInk: '#FFFFFF',
  shadow: '0 1px 2px rgba(0,0,0,0.04)',
  bellShadow:
    '0 0 0 8px #F7F7F9, 0 0 0 10px rgba(14,160,83,0.25), 0 16px 36px rgba(14,160,83,0.4)',
};

export type Palette = typeof LIGHT;

export const DARK: Palette = {
  bg: '#000000',
  card: '#212225',
  el: '#2E3135',
  sel: '#2E3135',
  ink: '#FFFFFF',
  mut: '#B0B4BA',
  faint: '#60646C',
  line: '#2A2C30',
  acc: '#42C070',
  accInk: '#000000',
  accText: '#62D286',
  accSoft: '#14301C',
  warn: '#DE4F44',
  warnSoft: '#421C18',
  toastBg: '#FFFFFF',
  toastInk: '#111214',
  shadow: 'none',
  bellShadow: '0 0 0 8px #000000, 0 0 0 10px rgba(66,192,112,0.3)',
};

/** Feed dot colors per event kind. */
export const FEED_DOTS = {
  goal: '#E8A127',
  lead: '#2F8ADC',
  spin: '#B865CB',
};

export const FONT = {
  400: 'Figtree_400Regular',
  500: 'Figtree_500Medium',
  600: 'Figtree_600SemiBold',
  700: 'Figtree_700Bold',
  800: 'Figtree_800ExtraBold',
} as const;

export type Weight = keyof typeof FONT;
