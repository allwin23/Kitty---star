import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';
import { toReadableError } from '@/features/auth/errors';

export async function pickAndUploadAvatar(
  userId: string,
): Promise<{ error?: string; url?: string }> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return { error: 'Photo library permission is required to select an avatar.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: [1, 1],
    mediaTypes: ['images'],
    quality: 0.8,
  });

  if (result.canceled) return {};

  const asset = result.assets[0];
  if (!asset) return { error: 'No image was selected.' };

  try {
    const response = await fetch(asset.uri);
    const file = await response.arrayBuffer();
    const extension = asset.mimeType?.split('/')[1] ?? 'jpg';
    const path = `${userId}/avatar.${extension}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
      contentType: asset.mimeType ?? 'image/jpeg',
      upsert: true,
    });

    if (uploadError) return { error: toReadableError(uploadError) };

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (error) {
    return { error: toReadableError(error instanceof Error ? error : undefined) };
  }
}
