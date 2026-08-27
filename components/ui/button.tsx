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
  // Resolve variant styles directly to guarantee correct compilation in production
  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button ?? 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  };

  const textStyleResolved: TextStyle = {
    fontWeight: '800',
    textAlign: 'center',
  };

  // Assign background color and borders based on variant
  if (variant === 'white') {
    containerStyle.backgroundColor = '#FFFFFF';
    containerStyle.borderColor = 'rgba(232, 77, 114, 0.40)';
    containerStyle.borderWidth = 1.5;
    containerStyle.elevation = 3;
    textStyleResolved.color = palette.cherryBloom || '#C73A57';
    textStyleResolved.fontWeight = '800';
  } else if (variant === 'secondary') {
    containerStyle.backgroundColor = 'rgba(255, 243, 245, 0.95)';
    containerStyle.borderColor = 'rgba(232, 77, 114, 0.35)';
    containerStyle.borderWidth = 1.5;
    textStyleResolved.color = palette.cherryBloom || '#C73A57';
    textStyleResolved.fontWeight = '700';
  } else if (variant === 'tertiary') {
    containerStyle.backgroundColor = 'rgba(255, 255, 255, 0.20)';
    containerStyle.borderColor = 'rgba(255, 255, 255, 0.40)';
    containerStyle.borderWidth = 1;
    textStyleResolved.color = '#FFFFFF';
    textStyleResolved.fontWeight = '700';
  } else if (variant === 'destructive') {
    containerStyle.backgroundColor = palette.danger || '#D94C61';
    containerStyle.elevation = 3;
    textStyleResolved.color = '#FFFFFF';
    textStyleResolved.fontWeight = '800';
  } else {
    // primary & default
    containerStyle.backgroundColor = palette.cherryBloom || '#C73A57';
    containerStyle.borderColor = 'rgba(255, 255, 255, 0.30)';
    containerStyle.borderWidth = 1;
    containerStyle.elevation = 3;
    textStyleResolved.color = '#FFFFFF';
    textStyleResolved.fontWeight = '800';
  }

  // Resolve size spacing
  let paddingVertical: number = spacing[12] ?? 12;
  let paddingHorizontal: number = spacing[24] ?? 24;
  let fontSize = 16;
  let lineHeight = 22;

  if (size === 'sm') {
    paddingVertical = spacing[8] ?? 8;
    paddingHorizontal = spacing[16] ?? 16;
    fontSize = 14;
    lineHeight = 18;
  } else if (size === 'lg') {
    paddingVertical = spacing[12] ?? 12;
    paddingHorizontal = spacing[16] ?? 16;
    fontSize = 16;
    lineHeight = 22;
  }

  const sizeContainerStyle: ViewStyle = { paddingVertical, paddingHorizontal };
  const sizeTextStyle: TextStyle = { fontSize, lineHeight };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        containerStyle,
        sizeContainerStyle,
        {
          opacity: disabled ? 0.55 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text
          style={[
            textStyleResolved,
            sizeTextStyle,
            { letterSpacing: 0.2 },
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

