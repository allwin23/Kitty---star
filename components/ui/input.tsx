import { TextInput, type TextInputProps } from 'react-native';

import { palette, radius, spacing } from '@/theme';

export function Input({ style, placeholderTextColor, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={placeholderTextColor ?? palette.textMuted}
      style={[
        {
          backgroundColor: 'rgba(255, 255, 255, 0.65)',
          borderColor: 'rgba(250, 215, 224, 0.75)',
          borderRadius: radius.input,
          borderWidth: 1,
          color: palette.textPrimary,
          fontSize: 16,
          paddingHorizontal: spacing[16],
          paddingVertical: spacing[12],
        },
        style,
      ]}
      {...props}
    />
  );
}

