import type { PropsWithChildren } from 'react';
import { Pressable, Text, useColorScheme, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type ButtonProps = PropsWithChildren<{
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function Button({ children, disabled = false, onPress, style }: ButtonProps) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          backgroundColor: palette.primary,
          borderRadius: radius.md,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
        style,
      ]}
    >
      <Text style={{ color: palette.primaryText, fontWeight: '600' }}>{children}</Text>
    </Pressable>
  );
}
