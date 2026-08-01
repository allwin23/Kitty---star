import { useState } from 'react';
import { Platform, TextInput, type TextInputProps } from 'react-native';

import { palette, radius, spacing } from '@/theme';

export function Input({ style, placeholderTextColor, onFocus, onBlur, ...props }: TextInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      placeholderTextColor={placeholderTextColor ?? palette.textMuted}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        {
          backgroundColor: 'rgba(255, 243, 245, 0.85)',
          borderColor: focused ? palette.cherryBloom : 'rgba(250, 215, 224, 0.90)',
          borderRadius: radius.input,
          borderWidth: 1.5,
          color: palette.textPrimary,
          fontSize: 16,
          paddingHorizontal: spacing[16],
          paddingVertical: spacing[12],
          ...(Platform.OS === 'web'
            ? ({
                outline: focused ? `2px solid ${palette.cherryBloom}` : 'none',
                outlineOffset: 1,
              } as any)
            : {}),
        },
        style,
      ]}
      {...props}
    />
  );
}
