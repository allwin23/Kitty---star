import type { PropsWithChildren } from 'react';
import { useColorScheme, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type CardProps = PropsWithChildren<{ style?: StyleProp<ViewStyle> }>;

export function Card({ children, style }: CardProps) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View
      style={[
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderRadius: radius.lg,
          borderWidth: 1,
          padding: spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
