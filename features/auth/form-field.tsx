import type { TextInputProps } from 'react-native';
import { Text, View } from 'react-native';

import { Input } from '@/components/ui';
import { palette, spacing } from '@/theme';

type FormFieldProps = TextInputProps & {
  error?: string;
  label: string;
};

export function FormField({ error, label, ...inputProps }: FormFieldProps) {
  return (
    <View style={{ gap: spacing[4] }}>
      <Text
        style={{
          color: palette.textPrimary,
          fontWeight: '700',
          fontSize: 13,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
      <Input {...inputProps} />
      {error ? <Text style={{ color: palette.danger, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}
