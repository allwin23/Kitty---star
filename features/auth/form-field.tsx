import type { TextInputProps } from 'react-native';
import { Text, useColorScheme, View } from 'react-native';

import { Input } from '@/components/ui';
import { colors, spacing } from '@/theme';

type FormFieldProps = TextInputProps & {
  error?: string;
  label: string;
};

export function FormField({ error, label, ...inputProps }: FormFieldProps) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: palette.text, fontWeight: '600' }}>{label}</Text>
      <Input {...inputProps} />
      {error ? <Text style={{ color: palette.danger }}>{error}</Text> : null}
    </View>
  );
}
