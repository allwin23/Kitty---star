import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Screen } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { colors, spacing, typography } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const loading = useAuthStore((state) => state.loading);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    setMessage(null);
    const result = await logout();
    if (result.error) setMessage(result.error);
  };

  return (
    <Screen>
      <View style={{ flex: 1, gap: spacing.lg, justifyContent: 'center' }}>
        <Text style={typography.heading}>Home</Text>
        <Card>
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.light.mutedText }}>User name</Text>
            <Text style={typography.title}>{profile?.full_name}</Text>
            <Text style={{ color: colors.light.mutedText }}>User email</Text>
            <Text style={typography.body}>{user?.email}</Text>
            <Text style={{ color: colors.light.mutedText }}>Partner connected</Text>
            <Text style={typography.body}>{profile?.partner_id ? 'Yes' : 'No'}</Text>
          </View>
        </Card>
        {message ? <Text style={{ color: colors.light.danger }}>{message}</Text> : null}
        <Button disabled={loading} onPress={() => void handleLogout()}>
          {loading ? 'Signing out…' : 'Logout'}
        </Button>
        <Button onPress={() => router.push('/(app)/testing')}>Open backend test lab</Button>
      </View>
    </Screen>
  );
}
