import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import {
  Home,
  CheckSquare,
  Timer,
  Compass,
  type LucideIcon,
} from 'lucide-react-native';

type TabType = 'home' | 'accountability' | 'pomodoro' | 'journey' | string;

const iconMap: Record<string, LucideIcon> = {
  home: Home,
  accountability: CheckSquare,
  pomodoro: Timer,
  journey: Compass,
};

export function AnimatedTabIcon({
  name,
  focused,
}: {
  name: TabType;
  focused: boolean;
}) {
  const IconComponent = iconMap[name] || Home;

  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withSpring(1.25, { damping: 8, stiffness: 300 }),
        withSpring(1.08, { damping: 10, stiffness: 200 })
      );
      glowOpacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      glowOpacity.value = withTiming(0, { duration: 180 });
    }
  }, [focused, scale, glowOpacity]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowOpacity.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Active Light Glass Highlight Circle */}
      <Animated.View style={[styles.glowRing, animatedGlowStyle]} />

      {/* Animated Black Icon */}
      <Animated.View style={[styles.iconWrapper, animatedIconStyle]}>
        <IconComponent
          size={23}
          color={focused ? '#000000' : 'rgba(0, 0, 0, 0.40)'}
          strokeWidth={focused ? 2.6 : 1.9}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
