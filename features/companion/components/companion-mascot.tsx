import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, useColorScheme, View } from 'react-native';

import type { MascotAnimationPose, MascotEmotionState } from '../types';
import { colors, radius, spacing } from '@/theme';

export interface CompanionMascotProps {
  pose?: MascotAnimationPose;
  emotion?: MascotEmotionState;
  skin?: string; // 'classic_cat' | 'golden_kitty' | 'space_explorer' | 'cyber_cat'
  decoration?: string;
  size?: number;
}

export function CompanionMascot({
  pose = 'idle',
  emotion = 'happy',
  skin = 'classic_cat',
  decoration = 'party_hat',
  size = 72,
}: CompanionMascotProps) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  // Animation values
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset animations
    bounceAnim.setValue(0);
    scaleAnim.setValue(1);
    rotateAnim.setValue(0);

    if (pose === 'celebrate' || pose === 'jump') {
      // Bouncing & Scaling sequence
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -14,
            duration: 350,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 350,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        { iterations: 6 },
      ).start();
    } else if (pose === 'wave') {
      // Waving tilt
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(rotateAnim, { toValue: -1, duration: 250, useNativeDriver: true }),
          Animated.timing(rotateAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
        { iterations: 4 },
      ).start();
    } else if (pose === 'stretch') {
      // Stretch scaling
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ]).start();
    }
  }, [pose]);

  // Skin Theme Map
  const getSkinTheme = (skinId: string) => {
    switch (skinId) {
      case 'golden_kitty':
        return { avatar: '🐱✨', bg: '#fef08a', border: '#eab308', halo: '👑' };
      case 'space_explorer':
        return { avatar: '🐱🚀', bg: '#e0e7ff', border: '#6366f1', halo: '🌌' };
      case 'cyber_cat':
        return { avatar: '🐱⚡', bg: '#ccfbf1', border: '#14b8a6', halo: '🕶️' };
      case 'classic_cat':
      default:
        return { avatar: '🐱', bg: `${palette.primary}20`, border: palette.primary, halo: '' };
    }
  };

  const theme = getSkinTheme(skin);

  // Expression / Accessory map
  const getExpressionEmoji = () => {
    switch (pose) {
      case 'celebrate':
      case 'confetti':
        return '🎉';
      case 'hold_bottle':
        return '🥤';
      case 'sleeping':
      case 'sleep':
        return '💤';
      case 'quiet_studying':
        return '📖';
      case 'serious':
        return '👓';
      case 'concerned':
        return '🥺';
      case 'stretch':
        return '🌅';
      case 'cheer':
        return '🙌';
      case 'jump':
        return '✨';
      default:
        return decoration === 'party_hat' ? '🥳' : '✨';
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.mascotCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.bg,
            borderColor: theme.border,
            transform: [
              { translateY: bounceAnim },
              { scale: scaleAnim },
              {
                rotate: rotateAnim.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: ['-12deg', '0deg', '12deg'],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={{ fontSize: size * 0.55 }}>{theme.avatar}</Text>

        {/* Accessory / Pose Overlay */}
        <View style={styles.accessoryBadge}>
          <Text style={{ fontSize: size * 0.26 }}>{getExpressionEmoji()}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotCircle: {
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    elevation: 4,
  },
  accessoryBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 2,
    elevation: 3,
  },
});
