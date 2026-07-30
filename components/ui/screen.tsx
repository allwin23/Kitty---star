import type { PropsWithChildren } from 'react';
import { useColorScheme, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type ScreenProps = PropsWithChildren<{ centered?: boolean; style?: StyleProp<ViewStyle> }>;

export function Screen({ children, centered = false, style }: ScreenProps) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: palette.background }, style]}>
      <View
        style={{ flex: 1, padding: spacing.md, justifyContent: centered ? 'center' : 'flex-start' }}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
