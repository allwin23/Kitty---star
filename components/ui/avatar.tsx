import { Image, Text, useColorScheme, View } from 'react-native';

import { colors, radius } from '@/theme';

type AvatarProps = { label: string; size?: number; source?: string };

export function Avatar({ label, size = 40, source }: AvatarProps) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const initials = label.trim().slice(0, 1).toUpperCase();

  if (source) {
    return (
      <Image
        accessibilityLabel={label}
        source={{ uri: source }}
        style={{ borderRadius: radius.full, height: size, width: size }}
      />
    );
  }

  return (
    <View
      accessibilityLabel={label}
      style={{
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: radius.full,
        height: size,
        justifyContent: 'center',
        width: size,
      }}
    >
      <Text style={{ color: palette.primaryText, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}
