import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
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
      {...(Platform.OS === 'web' ? ({ dataSet: { glassCard: 'true' } } as any) : {})}
      style={[
        isGlass
          ? glassCardStyle
          : {
              backgroundColor: 'rgba(255, 255, 255, 0.72)',
              borderColor: 'rgba(255, 255, 255, 0.65)',
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
      {/* Frosted Grid Diffuser & Gradient Focus Zone (blurs & diffuses sharp background grid behind card) */}
      {isGlass ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Frosted backdrop diffuser layer (minimal opacity so grid lines show clearly) */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.10)' }]} />

          {/* Top-left focus gradient zone */}
          <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="cardFocusGradient" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.30" />
                <Stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.08" />
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


