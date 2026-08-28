import { Text, View } from 'react-native';

import { palette, spacing } from '@/theme';

type EmptyStateProps = { description?: string; title: string };

export function EmptyState({ description, title }: EmptyStateProps) {
  return (
    <View
      style={{
        alignItems: 'center',
        gap: spacing[8],
        paddingVertical: spacing[24],
        paddingHorizontal: spacing[16],
      }}
    >
      <Text
        style={{ color: palette.textPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center' }}
      >
        {title}
      </Text>
      {description ? (
        <Text
          style={{
            color: palette.textSecondary,
            fontSize: 13,
            textAlign: 'center',
            lineHeight: 18,
          }}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}
