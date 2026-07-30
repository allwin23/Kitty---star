export const colors = {
  light: {
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#0F172A',
    mutedText: '#64748B',
    border: '#E2E8F0',
    primary: '#4F46E5',
    primaryText: '#FFFFFF',
    danger: '#DC2626',
  },
  dark: {
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F8FAFC',
    mutedText: '#94A3B8',
    border: '#334155',
    primary: '#818CF8',
    primaryText: '#0F172A',
    danger: '#F87171',
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
