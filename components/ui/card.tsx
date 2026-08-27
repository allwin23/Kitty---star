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
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderColor: 'rgba(250, 215, 224, 0.90)',
              borderWidth: 1.5,
              borderRadius: radius.card,
            },
        {
          padding: spacing.lg,
        },
        style,
      ]}
    >
      {/* Frosted Focus Zone — only on web where backdrop-filter works */}
      {isGlass && Platform.OS === 'web' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: radius.card, overflow: 'hidden' },
          ]}
          pointerEvents="none"
        >
          {/* Top-left focus gradient zone */}
          <Svg height="100%" width="100%" style={[StyleSheet.absoluteFill, { borderRadius: radius.card }]}>
            <Defs>
              <LinearGradient id="cardFocusGradient" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.40" />
                <Stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.10" />
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


