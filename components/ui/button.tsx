import type { PropsWithChildren } from 'react';
import { Pressable, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { palette, radius, spacing } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = PropsWithChildren<{
  onPress?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}>;

export function Button({
  children,
  disabled = false,
  onPress,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
}: ButtonProps) {
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'secondary':
        return {
          container: {
            backgroundColor: palette.blush,
            borderWidth: 1,
            borderColor: 'rgba(232, 77, 114, 0.25)',
          },
          text: {
            color: palette.cherryBloom,
          },
        };
      case 'tertiary':
        return {
          container: {
            backgroundColor: 'transparent',
            paddingHorizontal: spacing[8],
          },
          text: {
            color: palette.textSecondary,
          },
        };
      case 'destructive':
        return {
          container: {
            backgroundColor: palette.danger,
          },
          text: {
            color: '#FFFFFF',
          },
        };
      case 'primary':
      default:
        return {
          container: {
            backgroundColor: palette.cherryBloom,
            shadowColor: palette.cherryBloom,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 4,
          },
          text: {
            color: palette.warmWhite,
          },
        };
    }
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          container: { paddingVertical: spacing[8], paddingHorizontal: spacing[16] },
          text: { fontSize: 14, lineHeight: 18 },
        };
      case 'lg':
        return {
          container: { paddingVertical: spacing[16], paddingHorizontal: spacing[32] },
          text: { fontSize: 18, lineHeight: 24 },
        };
      case 'md':
      default:
        return {
          container: { paddingVertical: spacing[12], paddingHorizontal: spacing[24] },
          text: { fontSize: 16, lineHeight: 22 },
        };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.button,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
        },
        vStyles.container,
        sStyles.container,
        style,
      ]}
    >
      <Text style={[{ fontWeight: '700', letterSpacing: 0.2 }, vStyles.text, sStyles.text, textStyle]}>
        {children}
      </Text>
    </Pressable>
  );
}

