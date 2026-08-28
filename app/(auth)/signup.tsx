import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Card, Screen } from '@/components/ui';
import { FormField } from '@/features/auth/form-field';
import { signupSchema, type SignupFormValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/stores';
import { palette, spacing } from '@/theme';

export default function SignupScreen() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const signup = useAuthStore((state) => state.signup);
  const loading = useAuthStore((state) => state.loading);
  const { control, handleSubmit } = useForm<SignupFormValues>({
    defaultValues: { confirmPassword: '', email: '', password: '' },
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (values: SignupFormValues) => {
    setSubmitError(null);
    const result = await signup(values.email.trim(), values.password);
    if (result.error) setSubmitError(result.error);
  };

  return (
    <Screen centered>
      <View style={{ width: '100%', gap: spacing[24] }}>
        <Card style={{ gap: spacing[20], paddingVertical: spacing[32] }}>
          <View style={{ gap: spacing[8], alignItems: 'center' }}>
            <Text style={{ fontSize: 32 }}>🐱🌸</Text>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                color: palette.textPrimary,
                letterSpacing: -0.3,
              }}
            >
              Create your account
            </Text>
            <Text style={{ color: palette.textSecondary, fontSize: 14, textAlign: 'center' }}>
              Build a consistent study habit with your digital companion.
            </Text>
          </View>

          <View style={{ gap: spacing[12] }}>
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
            <Controller
              control={control}
              name="password"
              render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
                <FormField
                  autoComplete="new-password"
                  error={error?.message}
                  label="Password"
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
                  label="Confirm password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  secureTextEntry
                  value={value}
                />
              )}
            />

            {submitError ? (
              <Text style={{ color: palette.danger, fontSize: 13, textAlign: 'center' }}>
                {submitError}
              </Text>
            ) : null}

            <Button variant="primary" size="lg" disabled={loading} onPress={handleSubmit(onSubmit)}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </View>

          <View style={{ alignItems: 'center' }}>
            <Link
              href="/(auth)/login"
              style={{ color: palette.textSecondary, fontWeight: '600', fontSize: 14 }}
            >
              Already have an account? <Text style={{ color: palette.cherryBloom }}>Sign in</Text>
            </Link>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
