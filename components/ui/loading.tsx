import { ActivityIndicator, useColorScheme, View } from 'react-native';

import { colors } from '@/theme';

export function Loading() {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={palette.primary} />
    </View>
  );
}
