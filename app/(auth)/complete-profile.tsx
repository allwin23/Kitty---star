import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';

import { Avatar, Button, Card, Screen } from '@/components/ui';
import { pickAndUploadAvatar } from '@/features/auth/avatar';
import { FormField } from '@/features/auth/form-field';
import { completeProfileSchema, type CompleteProfileFormValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/stores';
import { palette, spacing } from '@/theme';

export default function CompleteProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const loading = useAuthStore((state) => state.loading);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectingAvatar, setSelectingAvatar] = useState(false);
  const { control, handleSubmit } = useForm<CompleteProfileFormValues>({
    defaultValues: { fullName: profile?.full_name ?? '' },
    resolver: zodResolver(completeProfileSchema),
  });

  const chooseAvatar = async () => {
    if (!user) return;
    setSelectingAvatar(true);
    setMessage(null);
    const result = await pickAndUploadAvatar(user.id);
    setSelectingAvatar(false);
    if (result.error) setMessage(result.error);
    if (result.url) setAvatarUrl(result.url);
  };

  const onSubmit = async ({ fullName }: CompleteProfileFormValues) => {
    setMessage(null);
    const result = await updateProfile({ avatar_url: avatarUrl, full_name: fullName.trim() });
    if (result.error) setMessage(result.error);
  };

  return (
    <Screen centered>
      <View style={{ width: '100%', maxWidth: 400, paddingHorizontal: spacing[16] }}>
        <Card style={{ gap: spacing[24], paddingVertical: spacing[32] }}>
          <View style={{ alignItems: 'center', gap: spacing[8] }}>
            <Text style={{ fontSize: 44 }}>👤🌸</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: palette.textPrimary, letterSpacing: -0.3 }}>
              Complete Your Profile
            </Text>
            <Text style={{ color: palette.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              Add the details your study partner will see in your companion journal.
            </Text>
          </View>

          <View style={{ alignItems: 'center', gap: spacing[12] }}>
            <Avatar
              label={profile?.full_name ?? user?.email ?? 'User'}
              size={88}
              source={avatarUrl ?? undefined}
            />
            <Button variant="secondary" disabled={selectingAvatar || loading} onPress={chooseAvatar}>
              {selectingAvatar ? 'Uploading Photo…' : 'Choose Avatar'}
            </Button>
          </View>

          <Controller
            control={control}
            name="fullName"
            render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
              <FormField
                autoComplete="name"
                error={error?.message}
                label="Full name"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />

          {message ? (
            <Text style={{ color: palette.statusDanger, fontSize: 13, textAlign: 'center', fontWeight: '600' }}>
              {message}
            </Text>
          ) : null}

          <Button disabled={loading || selectingAvatar} onPress={handleSubmit(onSubmit)}>
            {loading ? 'Saving…' : 'Continue'}
          </Button>
        </Card>
      </View>
    </Screen>
  );
}

