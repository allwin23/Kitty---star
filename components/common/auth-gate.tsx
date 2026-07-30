import { useEffect } from 'react';

import { useRouter, useSegments } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Loading, Screen } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { colors, spacing } from '@/theme';

export function AuthGate() {
  const initialize = useAuthStore((state) => state.initialize);
  const loading = useAuthStore((state) => state.loading);
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const error = useAuthStore((state) => state.error);
  const router = useRouter();
  const routeSegments = useSegments() as readonly string[];
  const group = routeSegments[0];

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (loading) return;

    if (!session) {
      if (group !== '(auth)') router.replace('/(auth)/login');
      return;
    }

    if (!profile) return;

    if (routeSegments[1] === 'reset-password') return;

    if (!profile.full_name) {
      if (routeSegments[1] !== 'complete-profile') router.replace('/(auth)/complete-profile');
      return;
    }

    if (!profile.partner_id) {
      if (routeSegments[1] !== 'partner-linking') router.replace('/(auth)/partner-linking');
      return;
    }

    if (group !== '(app)') router.replace('/(app)/home');
  }, [group, loading, profile, routeSegments, router, session]);

  if (loading) {
    return (
      <Screen centered>
        <Loading />
      </Screen>
    );
  }

  if (session && !profile) {
    return (
      <Screen centered>
        <View style={{ gap: spacing.md }}>
          <Text style={{ color: colors.light.danger }}>
            {error ?? 'We could not load your profile.'}
          </Text>
          <Button onPress={() => void initialize()}>Try again</Button>
        </View>
      </Screen>
    );
  }

  return null;
}
