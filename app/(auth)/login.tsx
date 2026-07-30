import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Screen } from '@/components/ui';
import { FormField } from '@/features/auth/form-field';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/stores';
import { colors, spacing, typography } from '@/theme';

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
    <Screen>
      <View style={{ flex: 1, gap: spacing.lg, justifyContent: 'center' }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={typography.heading}>Welcome back</Text>
          <Text style={{ color: colors.light.mutedText }}>
            Sign in to continue studying together.
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
        {submitError ? <Text style={{ color: colors.light.danger }}>{submitError}</Text> : null}
        <Button disabled={loading} onPress={handleSubmit(onSubmit)}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
        <Link href="/(auth)/forgot-password">Forgot password?</Link>
        <Link href="/(auth)/signup">Need an account? Sign up</Link>
      </View>
    </Screen>
  );
}
