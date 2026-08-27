import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { useNotificationStore } from '@/stores/notification-store';
import { palette, radius } from '@/theme';

const AnimatedBell = Animated.createAnimatedComponent(Bell);

export function NotificationBadge() {
  const router = useRouter();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  // Shared Animation Values
  const rotation = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(1);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // High-degree animation sequences
  useEffect(() => {
    if (unreadCount > 0) {
      // Energetic Bell Ringing Sequence
      rotation.value = withRepeat(
        withSequence(
          withTiming(-18, { duration: 100, easing: Easing.out(Easing.ease) }),
          withTiming(18, { duration: 100, easing: Easing.out(Easing.ease) }),
          withTiming(-14, { duration: 90 }),
          withTiming(14, { duration: 90 }),
          withTiming(-8, { duration: 80 }),
          withTiming(8, { duration: 80 }),
          withTiming(0, { duration: 150 }),
          withTiming(0, { duration: 1800 }) // pause between ring alerts
        ),
        -1,
        false
      );

      // Glowing Ripple Ring Animation
      pulseScale.value = withRepeat(
        withTiming(1.45, { duration: 1200, easing: Easing.out(Easing.quad) }),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 300 }),
          withTiming(0, { duration: 900 })
        ),
        -1,
        false
      );

      // Badge Pulse
      badgeScale.value = withRepeat(
        withSequence(
          withSpring(1.2, { damping: 4, stiffness: 200 }),
          withSpring(1, { damping: 6, stiffness: 150 })
        ),
        -1,
        true
      );
    } else {
      // Gentle Idle Swaying
      rotation.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(6, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1200 })
        ),
        -1,
        true
      );
      pulseOpacity.value = withTiming(0, { duration: 300 });
      pulseScale.value = 1;
      badgeScale.value = 1;
    }
  }, [unreadCount, rotation, pulseScale, pulseOpacity, badgeScale]);

  // Animated Styles
  const bellAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.85, { damping: 10, stiffness: 400 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 8, stiffness: 250 });
    rotation.value = withSequence(
      withTiming(-25, { duration: 80 }),
      withTiming(25, { duration: 80 }),
      withTiming(-15, { duration: 80 }),
      withTiming(15, { duration: 80 }),
      withTiming(0, { duration: 120 })
    );
  };

  return (
    <Pressable
      onPress={() => router.push('/(app)/notifications')}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.wrapper}
    >
      {/* Animated Glowing Ripple */}
      <Animated.View style={[styles.pulseRing, pulseAnimatedStyle]} />

      {/* Main Glass Button */}
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        <Animated.View style={[{ transformOrigin: 'top center' }, bellAnimatedStyle]}>
          <Bell size={22} color="#FFFFFF" strokeWidth={2.4} />
        </Animated.View>

        {unreadCount > 0 ? (
          <Animated.View style={[styles.badge, badgeAnimatedStyle]}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.dotIndicator} />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 48,
    height: 48,
  },
  pulseRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: 'rgba(232, 77, 114, 0.45)',
  },
  container: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: 'rgba(18, 18, 24, 0.90)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    elevation: 4,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        } as any)
      : {}),
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: palette.cherryBloom,
    borderRadius: radius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#121218',
    elevation: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  dotIndicator: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#63C58B',
  },
});
