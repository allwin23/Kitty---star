import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CherryBackground } from './cherry-background';
import { spacing } from '@/theme';

type ScreenProps = PropsWithChildren<{
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  noPadding?: boolean;
}>;

export function Screen({ children, centered = false, style, contentStyle, noPadding = false }: ScreenProps) {
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: '#F63E5F' }, style]}>
      <CherryBackground />
      <View
        style={[
          {
            flex: 1,
            padding: noPadding ? 0 : spacing.lg,
            justifyContent: centered ? 'center' : 'flex-start',
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

