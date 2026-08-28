import { Text, View } from 'react-native';

import { Card, HeaderTitleCard, Screen } from '@/components/ui';
import { palette, spacing } from '@/theme';

type PlaceholderScreenProps = { title: string };

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <Screen centered>
      <View
        style={{
          width: '100%',
          paddingHorizontal: spacing[16],
          gap: spacing[20],
          alignItems: 'center',
        }}
      >
        <HeaderTitleCard
          title={title}
          subtitle="Your digital study companion is preparing this space for you"
        />

        <Card
          style={{
            alignItems: 'center',
            gap: spacing[12],
            paddingVertical: spacing[32],
            width: '100%',
          }}
        >
          <Text style={{ fontSize: 48 }}>🐱🌸</Text>
          <Text
            style={{
              color: palette.textSecondary,
              fontSize: 14,
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            Stay tuned! Exciting features and companion modules are on their way.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
