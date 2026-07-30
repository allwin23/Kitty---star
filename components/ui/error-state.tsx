import { Text, useColorScheme, View } from 'react-native';

import { Button } from './button';
import { colors, spacing, typography } from '@/theme';

type ErrorStateProps = {
  error?: string | null;
  onRetry?: () => void;
};

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={{ alignItems: 'center', gap: spacing.md, padding: spacing.lg }}>
      <Text style={[typography.body, { color: palette.danger, textAlign: 'center' }]}>
        {error ?? 'Something went wrong.'}
      </Text>
      {onRetry ? <Button onPress={onRetry}>Try again</Button> : null}
    </View>
  );
}
