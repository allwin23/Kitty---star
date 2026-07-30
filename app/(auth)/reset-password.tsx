import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Screen } from '@/components/ui';
import { toReadableError } from '@/features/auth/errors';
import { FormField } from '@/features/auth/form-field';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';
import { colors, spacing, typography } from '@/theme';

export default function ResetPasswordScreen() {
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<ResetPasswordFormValues>({
    defaultValues: { confirmPassword: '', password: '' },
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async ({ password }: ResetPasswordFormValues) => {
    setSubmitting(true);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    setMessage(error ? toReadableError(error) : 'Password updated successfully.');
  };

  return (
    <Screen>
      <View style={{ flex: 1, gap: spacing.lg, justifyContent: 'center' }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={typography.heading}>Choose a new password</Text>
          <Text style={{ color: colors.light.mutedText }}>Use at least 8 characters.</Text>
        </View>
        <Controller
          control={control}
          name="password"
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <FormField
              autoComplete="new-password"
              error={error?.message}
              label="New password"
              onBlur={onBlur}
              onChangeText={onChange}
              secureTextEntry
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <FormField
              autoComplete="new-password"
              error={error?.message}
              label="Confirm new password"
              onBlur={onBlur}
              onChangeText={onChange}
              secureTextEntry
              value={value}
            />
          )}
        />
        {message ? <Text style={{ color: colors.light.text }}>{message}</Text> : null}
        <Button disabled={submitting} onPress={handleSubmit(onSubmit)}>
          {submitting ? 'Updating…' : 'Update password'}
        </Button>
      </View>
    </Screen>
  );
}
