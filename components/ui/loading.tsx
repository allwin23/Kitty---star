import { ActivityIndicator, View } from 'react-native';

import { palette } from '@/theme';

export function Loading() {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <ActivityIndicator color={palette.cherryBloom} size="small" />
    </View>
  );
}
