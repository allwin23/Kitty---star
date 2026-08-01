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
  BarChart2,
  type LucideIcon,
} from 'lucide-react-native';

import { palette } from '@/theme';

type TabType = 'home' | 'accountability' | 'pomodoro' | 'journey' | 'statistics' | string;

const iconMap: Record<string, LucideIcon> = {
  home: Home,
  accountability: CheckSquare,
  pomodoro: Timer,
  journey: Compass,
  statistics: BarChart2,
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
      scale.value = withTiming(1.12, { duration: 180 });
      glowOpacity.value = withTiming(1, { duration: 180 });
    } else {
      scale.value = withTiming(1, { duration: 160 });
      glowOpacity.value = withTiming(0, { duration: 160 });
    }
  }, [focused, scale, glowOpacity]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Active Light Glass Highlight Circle */}
      <Animated.View style={[styles.glowRing, animatedGlowStyle]} />

      {/* Animated Icon */}
      <Animated.View style={[styles.iconWrapper, animatedIconStyle]}>
        <IconComponent
          size={22}
          color={focused ? palette.danger : 'rgba(30, 20, 25, 0.50)'}
          strokeWidth={focused ? 2.5 : 2.0}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(232, 77, 114, 0.12)',
    borderColor: 'rgba(232, 77, 114, 0.25)',
    borderWidth: 1,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
