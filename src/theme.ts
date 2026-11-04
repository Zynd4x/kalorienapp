export const colors = {
  background: '#F5F7F2',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF3EA',
  primary: '#2F7D4F',
  primaryDark: '#1E5C39',
  primaryLight: '#E4F2E8',
  accent: '#F0A43A',
  accentLight: '#FDF1DE',
  text: '#17231B',
  textSoft: '#3E4C43',
  muted: '#718076',
  border: '#E2E8DF',
  danger: '#C94F45',
  dangerLight: '#FBECEA',
  protein: '#3F7FBF',
  carbs: '#D99A2B',
  fat: '#B06AB3',
  water: '#4BA3C7',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  full: 999,
} as const;

export const shadow = {
  shadowColor: '#1B2A20',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.07,
  shadowRadius: 14,
  elevation: 3,
} as const;

export const typography = {
  h1: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.8 },
  h2: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.4 },
  h3: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '500' as const },
  small: { fontSize: 13, fontWeight: '500' as const },
  tiny: { fontSize: 11, fontWeight: '600' as const },
} as const;
