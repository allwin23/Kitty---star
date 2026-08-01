import { Image, Text, View } from 'react-native';

import { palette, radius } from '@/theme';

type AvatarProps = { label: string; size?: number; source?: string };

export function Avatar({ label, size = 40, source }: AvatarProps) {
  const initials = label.trim().slice(0, 1).toUpperCase();

  if (source) {
    return (
      <Image
        accessibilityLabel={label}
        source={{ uri: source }}
        style={{
          borderRadius: radius.full,
          height: size,
          width: size,
          borderWidth: 2,
          borderColor: 'rgba(255, 255, 255, 0.8)',
        }}
      />
    );
  }

  return (
    <View
      accessibilityLabel={label}
      style={{
        alignItems: 'center',
        backgroundColor: palette.cherryBloom,
        borderRadius: radius.full,
        height: size,
        justifyContent: 'center',
        width: size,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        shadowColor: palette.cherryBloom,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Text style={{ color: palette.warmWhite, fontWeight: '700', fontSize: size * 0.45 }}>
        {initials}
      </Text>
    </View>
  );
}

