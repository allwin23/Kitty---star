export const colors = {
  light: {
    background: '#F4F4F5',
    surface: '#FFFFFF',
    text: '#27272A',
    mutedText: '#71717A',
    border: '#E4E4E7',
    primary: '#3F3F46',
    primaryText: '#FFFFFF',
    danger: '#EF4444',
  },
  dark: {
    background: '#F4F4F5',
    surface: '#FFFFFF',
    text: '#27272A',
    mutedText: '#71717A',
    border: '#E4E4E7',
    primary: '#3F3F46',
    primaryText: '#FFFFFF',
    danger: '#EF4444',
  },
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48 } as const;

export const typography = {
  caption: { fontSize: 12, lineHeight: 16 },
  body: { fontSize: 16, lineHeight: 24 },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const },
  heading: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const },
} as const;

export const radius = { sm: 6, md: 10, lg: 16, full: 9999 } as const;
