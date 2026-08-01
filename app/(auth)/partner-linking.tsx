import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';

import { Button, Card, Screen } from '@/components/ui';
import { connectWithInvite, createPartnerInvite } from '@/features/auth/invites';
import { FormField } from '@/features/auth/form-field';
import { inviteCodeSchema, type InviteCodeFormValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/stores';
import { palette, spacing } from '@/theme';

export default function PartnerLinkingScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const logout = useAuthStore((state) => state.logout);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const { control, handleSubmit } = useForm<InviteCodeFormValues>({
    defaultValues: { code: '' },
    resolver: zodResolver(inviteCodeSchema),
  });

  const generateCode = async () => {
    if (!user) return;
    setGenerating(true);
    setMessage(null);
    const result = await createPartnerInvite(user.id);
    setGenerating(false);
    if (result.error) setMessage(result.error);
    if (result.code) setCreatedCode(result.code);
  };

  const connect = async ({ code }: InviteCodeFormValues) => {
    setConnecting(true);
    setMessage(null);
    const result = await connectWithInvite(code.trim().toUpperCase());
    if (!result.error) {
      const refreshed = await refreshProfile();
      if (refreshed.error) setMessage(refreshed.error);
    } else {
      setMessage(result.error);
    }
    setConnecting(false);
  };

  const switchAccount = async () => {
    setSwitchingAccount(true);
    setMessage(null);
    const result = await logout();
    setSwitchingAccount(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    router.replace('/(auth)/login');
  };

  return (
    <Screen centered>
      <View style={{ width: '100%', maxWidth: 420, paddingHorizontal: spacing[16], gap: spacing[16] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
          <Button
            variant="tertiary"
            disabled={generating || connecting || switchingAccount}
            onPress={() => void switchAccount()}
          >
            {switchingAccount ? 'Signing Out…' : '← Use Different Account'}
          </Button>
        </View>

        <Card style={{ gap: spacing[24], paddingVertical: spacing[24] }}>
          <View style={{ alignItems: 'center', gap: spacing[8] }}>
            <Text style={{ fontSize: 40 }}>👥🌸</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: palette.textPrimary, letterSpacing: -0.3 }}>
              Link Study Partner
            </Text>
            <Text style={{ color: palette.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              Invite a study companion or join using their unique invite code.
            </Text>
          </View>

          {/* Section A: Create Invite */}
          <View style={{ gap: spacing[12] }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: palette.textPrimary }}>Create an Invite</Text>
            <Text style={{ color: palette.textSecondary, fontSize: 13 }}>
              Invite codes expire automatically after 24 hours.
            </Text>
            {createdCode ? (
              <View style={{ backgroundColor: palette.blush, padding: spacing[12], borderRadius: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, fontWeight: '800', color: palette.cherryBloom, letterSpacing: 4, fontFamily: "'Martian Mono', monospace" }}>
                  {createdCode}
                </Text>
              </View>
            ) : null}
            <Button disabled={generating || connecting} onPress={generateCode}>
              {generating ? 'Generating…' : 'Generate Invite Code'}
            </Button>
          </View>

          <View style={{ height: 1, backgroundColor: palette.softRose }} />

          {/* Section B: Join with Invite */}
          <View style={{ gap: spacing[12] }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: palette.textPrimary }}>Join with an Invite</Text>
            <Controller
              control={control}
              name="code"
              render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
                <FormField
                  autoCapitalize="characters"
                  error={error?.message}
                  label="Invite code"
                  maxLength={8}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            <Button variant="secondary" disabled={connecting || generating} onPress={handleSubmit(connect)}>
              {connecting ? 'Connecting…' : 'Connect Partner'}
            </Button>
          </View>

          {message ? (
            <Text style={{ color: palette.statusDanger, fontSize: 13, textAlign: 'center', fontWeight: '600' }}>
              {message}
            </Text>
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}

