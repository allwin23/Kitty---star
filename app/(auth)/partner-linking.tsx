import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Card, Screen } from '@/components/ui';
import { connectWithInvite, createPartnerInvite } from '@/features/auth/invites';
import { FormField } from '@/features/auth/form-field';
import { inviteCodeSchema, type InviteCodeFormValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/stores';
import { colors, spacing, typography } from '@/theme';

export default function PartnerLinkingScreen() {
  const user = useAuthStore((state) => state.user);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [connecting, setConnecting] = useState(false);
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

  return (
    <Screen>
      <View style={{ flex: 1, gap: spacing.lg, justifyContent: 'center' }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={typography.heading}>Link your partner</Text>
          <Text style={{ color: colors.light.mutedText }}>
            Invite a study partner or join with their code.
          </Text>
        </View>
        <Card>
          <View style={{ gap: spacing.sm }}>
            <Text style={{ fontWeight: '700' }}>Create an invite</Text>
            <Text style={{ color: colors.light.mutedText }}>
              Invite codes expire after 24 hours.
            </Text>
            {createdCode ? (
              <Text style={[typography.title, { letterSpacing: 2 }]}>{createdCode}</Text>
            ) : null}
            <Button disabled={generating || connecting} onPress={generateCode}>
              {generating ? 'Generating…' : 'Generate invite code'}
            </Button>
          </View>
        </Card>
        <Card>
          <View style={{ gap: spacing.sm }}>
            <Text style={{ fontWeight: '700' }}>Join with an invite</Text>
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
            <Button disabled={connecting || generating} onPress={handleSubmit(connect)}>
              {connecting ? 'Connecting…' : 'Connect'}
            </Button>
          </View>
        </Card>
        {message ? <Text style={{ color: colors.light.danger }}>{message}</Text> : null}
      </View>
    </Screen>
  );
}
