import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Screen } from '@/components/ui';
import { FormField } from '@/features/auth/form-field';
import { signupSchema, type SignupFormValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/stores';
import { colors, spacing, typography } from '@/theme';

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
    <Screen>
      <View style={{ flex: 1, gap: spacing.lg, justifyContent: 'center' }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={typography.heading}>Create your account</Text>
          <Text style={{ color: colors.light.mutedText }}>
            Build a consistent study habit with a partner.
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
        {submitError ? <Text style={{ color: colors.light.danger }}>{submitError}</Text> : null}
        <Button disabled={loading} onPress={handleSubmit(onSubmit)}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
        <Link href="/(auth)/login">Already have an account? Sign in</Link>
      </View>
    </Screen>
  );
}
