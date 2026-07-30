import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Screen } from '@/components/ui';
import { toReadableError } from '@/features/auth/errors';
import { FormField } from '@/features/auth/form-field';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';
import { colors, spacing, typography } from '@/theme';

export default function ForgotPasswordScreen() {
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<ForgotPasswordFormValues>({
    defaultValues: { email: '' },
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async ({ email }: ForgotPasswordFormValues) => {
    setSubmitting(true);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'studypartner://reset-password',
    });
    setSubmitting(false);
    setMessage(
      error ? toReadableError(error) : 'Check your email for password reset instructions.',
    );
  };

  return (
    <Screen>
      <View style={{ flex: 1, gap: spacing.lg, justifyContent: 'center' }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={typography.heading}>Reset password</Text>
          <Text style={{ color: colors.light.mutedText }}>
            We will send reset instructions to your email.
          </Text>
        </View>
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <FormField
              autoCapitalize="none"
              autoComplete="email"
              error={error?.message}
              keyboardType="email-address"
              label="Email"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {message ? <Text style={{ color: colors.light.text }}>{message}</Text> : null}
        <Button disabled={submitting} onPress={handleSubmit(onSubmit)}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </Button>
        <Link href="/(auth)/login">Back to sign in</Link>
      </View>
    </Screen>
  );
}
