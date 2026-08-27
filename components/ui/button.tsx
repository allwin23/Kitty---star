import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

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

// Hardcoded color constants to guarantee they survive minification/tree-shaking
const CHERRY = '#C73A57';
const WHITE = '#FFFFFF';
const DANGER = '#D94C61';

export function Button({
  children,
  disabled = false,
  onPress,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
}: ButtonProps) {
  // Pick variant colors — all hardcoded, no dynamic palette lookups
  let bg: string;
  let borderClr: string;
  let borderW: number;
  let elev: number;
  let textClr: string;
  let textWt: TextStyle['fontWeight'];

  switch (variant) {
    case 'white':
      bg = WHITE;
      borderClr = 'rgba(232, 77, 114, 0.40)';
      borderW = 1.5;
      elev = 3;
      textClr = CHERRY;
      textWt = '800';
      break;
    case 'secondary':
      bg = 'rgba(255, 243, 245, 0.95)';
      borderClr = 'rgba(232, 77, 114, 0.35)';
      borderW = 1.5;
      elev = 0;
      textClr = CHERRY;
      textWt = '700';
      break;
    case 'tertiary':
      bg = 'rgba(255, 255, 255, 0.20)';
      borderClr = 'rgba(255, 255, 255, 0.40)';
      borderW = 1;
      elev = 0;
      textClr = WHITE;
      textWt = '700';
      break;
    case 'destructive':
      bg = DANGER;
      borderClr = 'transparent';
      borderW = 0;
      elev = 3;
      textClr = WHITE;
      textWt = '800';
      break;
    default:
      // primary
      bg = CHERRY;
      borderClr = 'rgba(255, 255, 255, 0.30)';
      borderW = 1;
      elev = 3;
      textClr = WHITE;
      textWt = '800';
      break;
  }

  // Pick size padding
  let pV: number;
  let pH: number;
  let fSize: number;
  let lHeight: number;

  switch (size) {
    case 'sm':
      pV = 8;
      pH = 16;
      fSize = 14;
      lHeight = 18;
      break;
    case 'lg':
      pV = 12;
      pH = 16;
      fSize = 16;
      lHeight = 22;
      break;
    default:
      // md
      pV = 12;
      pH = 24;
      fSize = 16;
      lHeight = 22;
      break;
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          borderRadius: 20,
          backgroundColor: bg,
          borderColor: borderClr,
          borderWidth: borderW,
          elevation: elev,
          paddingVertical: pV,
          paddingHorizontal: pH,
          opacity: disabled ? 0.55 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text
          style={[
            {
              color: textClr,
              fontWeight: textWt,
              fontSize: fSize,
              lineHeight: lHeight,
              letterSpacing: 0.2,
              textAlign: 'center' as const,
            },
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
