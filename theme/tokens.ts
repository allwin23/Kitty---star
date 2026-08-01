export const palette = {
  // Primary (XP, progress, buttons, mascot highlights, primary actions)
  cherryBloom: '#C73A57',
  deepCherry: '#A61F45',
  cherryAccent: '#E84D72',
  cherryGlow: '#F07392',
  softRose: '#D95A79',

  // Secondary (surfaces, backgrounds, grid)
  palePink: '#FFF7F8',
  roseMist: '#FFF3F5',
  blush: '#FFE4EB',
  softGridPink: '#FAD7E0',
  warmWhite: '#FFFDFD',

  // Text (never pure black)
  textPrimary: '#2A1D22',
  textSecondary: '#66545B',
  textMuted: '#BFAFB5',
  textDisabled: '#D9CDD1',

  // Status
  success: '#63C58B',
  warning: '#FFBE5C',
  danger: '#D94C61',
  info: '#8CCBFF',

  // Semantic Aliases
  primary: '#C73A57',
  primaryText: '#FFFDFD',
  primaryGlow: '#F07392',
  text: '#2A1D22',
  mutedText: '#66545B',
  subtleText: '#BFAFB5',
  disabledText: '#D9CDD1',
  background: '#FFF7F8',
  surface: 'rgba(255, 247, 248, 0.65)',
  surfaceGlass: 'rgba(255, 245, 247, 0.38)',
  border: 'rgba(255, 255, 255, 0.65)',
  borderSoft: 'rgba(250, 215, 224, 0.45)',
  statusDanger: '#D94C61',
} as const;


export const colors = {
  light: {
    background: '#FFF7F8',
    surface: 'rgba(255, 247, 248, 0.65)',
    surfaceGlass: 'rgba(255, 245, 247, 0.38)',
    border: 'rgba(255, 255, 255, 0.65)',
    borderSoft: 'rgba(250, 215, 224, 0.45)',
    text: '#2A1D22',
    mutedText: '#66545B',
    subtleText: '#BFAFB5',
    disabledText: '#D9CDD1',
    primary: '#C73A57',
    primaryDark: '#A61F45',
    primaryLight: '#E84D72',
    primaryGlow: '#F07392',
    primaryText: '#FFFDFD',
    danger: '#D94C61',
    success: '#63C58B',
    warning: '#FFBE5C',
    info: '#8CCBFF',
    blush: '#FFE4EB',
    roseMist: '#FFF3F5',
    gridPink: '#FAD7E0',
  },
  dark: {
    background: '#1D1317',
    surface: 'rgba(42, 29, 34, 0.75)',
    surfaceGlass: 'rgba(56, 35, 43, 0.55)',
    border: 'rgba(199, 58, 87, 0.25)',
    borderSoft: 'rgba(166, 31, 69, 0.35)',
    text: '#FFF7F8',
    mutedText: '#D9CDD1',
    subtleText: '#66545B',
    disabledText: '#4A3B41',
    primary: '#E84D72',
    primaryDark: '#C73A57',
    primaryLight: '#F07392',
    primaryGlow: '#F07392',
    primaryText: '#FFFDFD',
    danger: '#D94C61',
    success: '#63C58B',
    warning: '#FFBE5C',
    info: '#8CCBFF',
    blush: '#3A242C',
    roseMist: '#2A1D22',
    gridPink: 'rgba(232, 77, 114, 0.15)',
  },
} as const;

export const spacing = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  24: 24,
  32: 32,
  48: 48,
  64: 64,
  96: 96,
  128: 128,
  // Semantic aliases for backwards compatibility
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  20: 20,
} as const;

export const fonts = {
  heading: "'Fraunces', Georgia, serif",
  body: "'General Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  accent: "'Cormorant Garamond', Georgia, serif",
  mascot: "'Shantell Sans', 'Comic Sans MS', cursive, sans-serif",
  mono: "'Martian Mono', monospace",
} as const;

export const fontFamilies = fonts;

export const typography = {
  // Hand-picked scale: 12, 14, 16, 18, 20, 24, 28, 36, 48
  xs: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  sm: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  md: { fontFamily: fonts.body, fontSize: 18, lineHeight: 26 },
  title: { fontFamily: fonts.heading, fontStyle: 'italic' as const, fontSize: 20, lineHeight: 26, fontWeight: '500' as const },
  heading: { fontFamily: fonts.heading, fontStyle: 'italic' as const, fontSize: 24, lineHeight: 30, fontWeight: '500' as const },
  h2: { fontFamily: fonts.heading, fontStyle: 'italic' as const, fontSize: 28, lineHeight: 34, fontWeight: '500' as const },
  h1: { fontFamily: fonts.heading, fontStyle: 'italic' as const, fontSize: 36, lineHeight: 42, fontWeight: '500' as const },
  hero: { fontFamily: fonts.heading, fontStyle: 'italic' as const, fontSize: 48, lineHeight: 52, fontWeight: '500' as const },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  accent: { fontFamily: fonts.accent, fontStyle: 'italic' as const },
  mascot: { fontFamily: fonts.mascot },
  mono: { fontFamily: fonts.mono },
} as const;

export const radius = {
  card: 24,
  button: 20,
  input: 18,
  pill: 9999,
  sm: 8,
  md: 18,
  lg: 24,
  full: 9999,
} as const;

export const glassCardStyle = {
  backgroundColor: 'rgba(255, 245, 247, 0.38)',
  borderColor: 'rgba(255, 255, 255, 0.65)',
  borderWidth: 1,
  borderRadius: radius.card,
  shadowColor: '#C73A57',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.10,
  shadowRadius: 20,
  elevation: 4,
} as const;

