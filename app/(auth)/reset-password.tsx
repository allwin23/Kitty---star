import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Card, Screen } from '@/components/ui';
import { toReadableError } from '@/features/auth/errors';
import { FormField } from '@/features/auth/form-field';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';
import { palette, spacing } from '@/theme';

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
    <Screen centered>
      <View style={{ width: '100%', maxWidth: 400, paddingHorizontal: spacing[16] }}>
        <Card style={{ gap: spacing[24], paddingVertical: spacing[32] }}>
          <View style={{ alignItems: 'center', gap: spacing[8] }}>
            <Text style={{ fontSize: 44 }}>🔐🌸</Text>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                color: palette.textPrimary,
                letterSpacing: -0.3,
              }}
            >
              New Password
            </Text>
            <Text
              style={{
                color: palette.textSecondary,
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              Set a strong password for your study companion account (at least 8 characters).
            </Text>
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

          {message ? (
            <Text
              style={{
                color: palette.cherryBloom,
                fontSize: 13,
                textAlign: 'center',
                fontWeight: '600',
              }}
            >
              {message}
            </Text>
          ) : null}

          <Button disabled={submitting} onPress={handleSubmit(onSubmit)}>
            {submitting ? 'Updating…' : 'Update Password'}
          </Button>
        </Card>
      </View>
    </Screen>
  );
}
