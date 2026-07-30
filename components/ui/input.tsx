import { TextInput, useColorScheme, type TextInputProps } from 'react-native';

import { colors, radius, spacing } from '@/theme';

export function Input(props: TextInputProps) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <TextInput
      placeholderTextColor={palette.mutedText}
      style={{
        borderColor: palette.border,
        borderRadius: radius.md,
        borderWidth: 1,
        color: palette.text,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
      }}
      {...props}
    />
  );
}
