import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

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
              backgroundColor: 'rgba(255, 247, 248, 0.85)',
              borderColor: 'rgba(250, 215, 224, 0.6)',
              borderWidth: 1,
              borderRadius: radius.card,
            },
        {
          padding: spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

