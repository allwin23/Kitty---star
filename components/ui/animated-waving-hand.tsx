import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withRepeat,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';

export function AnimatedWavingHand({ size = 26 }: { size?: number }) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const sparkleOpacity = useSharedValue(0.4);

  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(-14, { duration: 350, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(22, { duration: 400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(-10, { duration: 350, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(18, { duration: 350, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(0, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(0, { duration: 1000 }),
      ),
      -1,
      true,
    );

    sparkleOpacity.value = withRepeat(
      withSequence(withTiming(0.9, { duration: 800 }), withTiming(0.3, { duration: 800 })),
      -1,
      true,
    );
  }, [rotation, sparkleOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
    transform: [{ scale: 0.9 + sparkleOpacity.value * 0.2 }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(1.3, { damping: 6, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 150 }),
    );
    rotation.value = withSequence(
      withTiming(-28, { duration: 120 }),
      withTiming(28, { duration: 120 }),
      withTiming(-20, { duration: 120 }),
      withTiming(20, { duration: 120 }),
      withTiming(0, { duration: 200 }),
    );
  };

  return (
    <Pressable onPress={handlePress} style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }]}
      >
        {/* Glow & Sparkle Backdrop */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: size * 1.2,
              height: size * 1.2,
              borderRadius: 999,
              backgroundColor: 'rgba(240, 115, 146, 0.22)',
              filter: 'blur(3px)',
            },
            sparkleStyle,
          ]}
        />

        {/* Animated Hand */}
        <Animated.View style={[{ transformOrigin: '70% 85%' }, animatedStyle]}>
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Defs>
              <LinearGradient id="handGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FFD07B" />
                <Stop offset="50%" stopColor="#FFAE42" />
                <Stop offset="100%" stopColor="#E67E22" />
              </LinearGradient>
              <LinearGradient id="cuffGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#F07392" />
                <Stop offset="100%" stopColor="#C73A57" />
              </LinearGradient>
            </Defs>

            {/* Sparkle Stars around hand */}
            <Circle cx="3" cy="4" r="1.2" fill="#FFE58F" />
            <Circle cx="21" cy="5" r="1.5" fill="#FFF" />
            <Circle cx="2" cy="18" r="1" fill="#FF85C0" />

            {/* Stylized Hand Vector */}
            <Path
              d="M18 11V6a1.5 1.5 0 0 0-3 0v4.5M15 9.5V4a1.5 1.5 0 0 0-3 0v6M12 9.5V5a1.5 1.5 0 0 0-3 0v6.5M9.5 11.5V7.5a1.5 1.5 0 0 0-3 0v6c0 3.5 2.5 6.5 6 6.5h1c4 0 6.5-2.5 6.5-6v-3a1.5 1.5 0 0 0-3 0"
              stroke="url(#handGradient)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="rgba(255, 208, 123, 0.15)"
            />
            {/* Wrist Cuff Detail */}
            <Path
              d="M6.5 20.5h11"
              stroke="url(#cuffGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
