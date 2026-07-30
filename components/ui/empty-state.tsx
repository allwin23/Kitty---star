import { Text, useColorScheme, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

type EmptyStateProps = { description?: string; title: string };

export function EmptyState({ description, title }: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={{ alignItems: 'center', gap: spacing.xs, padding: spacing.lg }}>
      <Text style={[typography.title, { color: palette.text }]}>{title}</Text>
      {description ? (
        <Text style={{ color: palette.mutedText, textAlign: 'center' }}>{description}</Text>
      ) : null}
    </View>
  );
}
