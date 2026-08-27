import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

// Individual Floating Particle Node inside Nav Bar
function FloatingParticle({
  type,
  initialX,
  initialY,
  scale: baseScale = 1,
  duration = 3000,
}: {
  type: 'heart' | 'star' | 'cat' | 'sparkle';
  initialX: number;
  initialY: number;
  scale?: number;
  duration?: number;
}) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0.24);
  const scale = useSharedValue(baseScale);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: duration / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(3, { duration: duration / 2, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    translateX.value = withRepeat(
      withSequence(
        withTiming(3, { duration: duration * 0.7, easing: Easing.inOut(Easing.sin) }),
        withTiming(-3, { duration: duration * 0.7, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.52, { duration: duration * 0.4 }),
        withTiming(0.18, { duration: duration * 0.6 })
      ),
      -1,
      true
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(baseScale * 1.1, { duration: duration * 0.5 }),
        withTiming(baseScale * 0.9, { duration: duration * 0.5 })
      ),
      -1,
      true
    );
  }, [translateY, translateX, opacity, scale, duration, baseScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.particle, { left: `${initialX}%`, top: initialY }, animatedStyle]}>
      {type === 'heart' && (
        <Svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="#A61F45"
          />
        </Svg>
      )}

      {type === 'star' && (
        <Svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill="#FFD07B"
          />
        </Svg>
      )}

      {type === 'cat' && (
        <Svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <Defs>
            <LinearGradient id="catParticleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#C73A57" />
              <Stop offset="100%" stopColor="#A61F45" />
            </LinearGradient>
          </Defs>
          <Path
            d="M12 5C7.58 5 4 8.58 4 13c0 3.5 2.2 6.5 5.5 7.6L12 21l2.5-.4C17.8 19.5 20 16.5 20 13c0-4.42-3.58-8-8-8z"
            fill="url(#catParticleGrad)"
            opacity={0.8}
          />
          <Path d="M4 11L1 4l7 3" fill="url(#catParticleGrad)" />
          <Path d="M20 11l3-7-7 3" fill="url(#catParticleGrad)" />
        </Svg>
      )}

      {type === 'sparkle' && (
        <Svg width="8" height="8" viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"
            fill="#A61F45"
            opacity={0.5}
          />
        </Svg>
      )}
    </Animated.View>
  );
}

export function NavBouquetBackdrop() {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Soft Ambient Deep Cherry Glow */}
      <View style={styles.ambientGlow} />

      {/* Bouquet Particle Cluster spanning from 1.5% to 96.5% */}
      <FloatingParticle type="cat" initialX={1.5} initialY={14} scale={0.9} duration={3200} />
      <FloatingParticle type="star" initialX={12} initialY={30} scale={0.85} duration={2800} />
      <FloatingParticle type="star" initialX={24} initialY={14} scale={0.9} duration={3400} />
      <FloatingParticle type="sparkle" initialX={36} initialY={32} scale={0.8} duration={2600} />
      <FloatingParticle type="star" initialX={48} initialY={14} scale={0.95} duration={3100} />
      <FloatingParticle type="star" initialX={60} initialY={30} scale={0.85} duration={2900} />
      <FloatingParticle type="cat" initialX={72} initialY={14} scale={0.9} duration={3500} />
      <FloatingParticle type="sparkle" initialX={84} initialY={28} scale={0.8} duration={2700} />
      <FloatingParticle type="star" initialX={96} initialY={12} scale={0.85} duration={3000} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 999,
  },
  ambientGlow: {
    position: 'absolute',
    top: 2,
    left: '1%',
    right: '1%',
    bottom: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(166, 31, 69, 0.08)',
  },
  particle: {
    position: 'absolute',
    zIndex: 1,
  },
});
