import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Card, Screen } from '@/components/ui';
import { FormField } from '@/features/auth/form-field';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/stores';
import { palette, spacing } from '@/theme';

export default function LoginScreen() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const { control, handleSubmit } = useForm<LoginFormValues>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    const result = await login(values.email.trim(), values.password);
    if (result.error) setSubmitError(result.error);
  };

  return (
    <Screen centered>
      <View style={{ width: '100%', gap: spacing[24] }}>
        <Card style={{ gap: spacing[24], paddingVertical: spacing[32] }}>
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
              Welcome back
            </Text>
            <Text style={{ color: palette.textSecondary, fontSize: 14, textAlign: 'center' }}>
              Sign in to enter your digital study companion space.
            </Text>
          </View>

          <View style={{ gap: spacing[16] }}>
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
                  autoComplete="password"
                  error={error?.message}
                  label="Password"
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
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </View>

          <View style={{ alignItems: 'center', gap: spacing[12] }}>
            <Link
              href="/(auth)/forgot-password"
              style={{ color: palette.cherryBloom, fontWeight: '600', fontSize: 14 }}
            >
              Forgot password?
            </Link>
            <Link
              href="/(auth)/signup"
              style={{ color: palette.textSecondary, fontWeight: '600', fontSize: 14 }}
            >
              Need an account? <Text style={{ color: palette.cherryBloom }}>Sign up</Text>
            </Link>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
