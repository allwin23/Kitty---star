import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Card, Screen } from '@/components/ui';
import { toReadableError } from '@/features/auth/errors';
import { FormField } from '@/features/auth/form-field';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';
import { palette, spacing } from '@/theme';

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
    <Screen centered>
      <View style={{ width: '100%', maxWidth: 400, paddingHorizontal: spacing[16] }}>
        <Card style={{ gap: spacing[24], paddingVertical: spacing[32] }}>
          <View style={{ alignItems: 'center', gap: spacing[8] }}>
            <Text style={{ fontSize: 44 }}>🔑🌸</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: palette.textPrimary, letterSpacing: -0.3 }}>
              Reset Password
            </Text>
            <Text style={{ color: palette.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              We will send reset instructions directly to your email address.
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

          {message ? (
            <Text style={{ color: palette.cherryBloom, fontSize: 13, textAlign: 'center', fontWeight: '600' }}>
              {message}
            </Text>
          ) : null}

          <Button disabled={submitting} onPress={handleSubmit(onSubmit)}>
            {submitting ? 'Sending…' : 'Send Reset Link'}
          </Button>

          <View style={{ alignItems: 'center' }}>
            <Link href="/(auth)/login" style={{ color: palette.cherryBloom, fontWeight: '700', fontSize: 14 }}>
              Back to Sign In
            </Link>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

