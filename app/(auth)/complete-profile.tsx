import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';

import { Avatar, Button, Screen } from '@/components/ui';
import { pickAndUploadAvatar } from '@/features/auth/avatar';
import { FormField } from '@/features/auth/form-field';
import { completeProfileSchema, type CompleteProfileFormValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/stores';
import { colors, spacing, typography } from '@/theme';

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
    <Screen>
      <View style={{ flex: 1, gap: spacing.lg, justifyContent: 'center' }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={typography.heading}>Complete your profile</Text>
          <Text style={{ color: colors.light.mutedText }}>
            Add the details your study partner will see.
          </Text>
        </View>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Avatar
            label={profile?.full_name ?? user?.email ?? 'User'}
            size={80}
            source={avatarUrl ?? undefined}
          />
          <Button disabled={selectingAvatar || loading} onPress={chooseAvatar}>
            {selectingAvatar ? 'Uploading photo…' : 'Choose avatar (optional)'}
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
        {message ? <Text style={{ color: colors.light.danger }}>{message}</Text> : null}
        <Button disabled={loading || selectingAvatar} onPress={handleSubmit(onSubmit)}>
          {loading ? 'Saving…' : 'Continue'}
        </Button>
      </View>
    </Screen>
  );
}
