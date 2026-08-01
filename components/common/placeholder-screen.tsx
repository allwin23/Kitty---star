import { Text, View } from 'react-native';

import { Card, Screen } from '@/components/ui';
import { palette, spacing } from '@/theme';

type PlaceholderScreenProps = { title: string };

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <Screen centered>
      <View style={{ width: '100%', paddingHorizontal: spacing[16] }}>
        <Card style={{ alignItems: 'center', gap: spacing[12], paddingVertical: spacing[32] }}>
          <Text style={{ fontSize: 40 }}>🐱🌸</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: palette.textPrimary, letterSpacing: -0.3 }}>
            {title}
          </Text>
          <Text style={{ color: palette.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
            Your digital study companion is preparing this space for you.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

