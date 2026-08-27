import type { PropsWithChildren } from 'react';
import { Platform, Pressable, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { palette, radius, spacing } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'white';
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
      case 'white':
        return {
          container: {
            backgroundColor: '#FFFFFF',
            borderWidth: 1.5,
            borderColor: 'rgba(232, 77, 114, 0.40)',
            overflow: 'hidden',
            elevation: 3,
          },
          text: {
            color: palette.cherryBloom,
            fontWeight: '800',
          },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: 'rgba(255, 243, 245, 0.95)',
            borderWidth: 1.5,
            borderColor: 'rgba(232, 77, 114, 0.35)',
            overflow: 'hidden',
          },
          text: {
            color: palette.cherryBloom,
            fontWeight: '700',
          },
        };
      case 'tertiary':
        return {
          container: {
            backgroundColor: 'rgba(255, 255, 255, 0.20)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.40)',
            paddingHorizontal: spacing[12],
            overflow: 'hidden',
          },
          text: {
            color: '#FFFFFF',
            fontWeight: '700',
          },
        };
      case 'destructive':
        return {
          container: {
            backgroundColor: palette.danger,
            overflow: 'hidden',
            elevation: 3,
          },
          text: {
            color: '#FFFFFF',
            fontWeight: '800',
          },
        };
      case 'primary':
      default:
        return {
          container: {
            backgroundColor: palette.cherryBloom,
            borderColor: 'rgba(255, 255, 255, 0.30)',
            borderWidth: 1,
            overflow: 'hidden',
            elevation: 3,
          },
          text: {
            color: '#FFFFFF',
            fontWeight: '800',
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
          container: { paddingVertical: spacing[12], paddingHorizontal: spacing[16] },
          text: { fontSize: 16, lineHeight: 22 },
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
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.button,
          opacity: disabled ? 0.55 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
        },
        vStyles.container,
        sStyles.container,
        style,
      ]}
    >
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text
          style={[
            { fontWeight: '800', letterSpacing: 0.2, textAlign: 'center' },
            vStyles.text,
            sStyles.text,
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

