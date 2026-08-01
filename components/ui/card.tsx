import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { glassCardStyle, radius, spacing } from '@/theme';

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  variant?: 'glass' | 'solid' | 'flat';
}>;

export function Card({ children, style, variant = 'glass' }: CardProps) {
  const isGlass = variant === 'glass';

  return (
    <View
      style={[
        isGlass
          ? glassCardStyle
          : {
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderColor: 'rgba(255, 255, 255, 0.40)',
              borderWidth: 1,
              borderRadius: radius.card,
              overflow: 'hidden',
            },
        {
          padding: spacing.lg,
        },
        style,
      ]}
    >
      {/* Background Gradient Focus Zone (bg-gradient-to-br from-white/20 via-transparent to-transparent) */}
      {isGlass ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="cardFocusGradient" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
                <Stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.05" />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#cardFocusGradient)" />
          </Svg>
        </View>
      ) : null}

      {/* Content Container */}
      <View style={{ zIndex: 10 }}>{children}</View>
    </View>
  );
}


