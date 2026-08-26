import { useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  CheckCircle2,
  Flame,
  Heart,
  Sparkles,
  Star,
  Timer,
  Trophy,
} from 'lucide-react-native';

import { Card } from '@/components/ui';
import { useGrowthAnimStore } from '@/stores/growth-anim-store';
import { palette, radius, spacing } from '@/theme';

export interface GrowthStatsData {
  xp: number;
  level: number;
  current_streak: number;
  approved_days: number;
  total_pomodoros: number;
}

export interface GrowthStatsAnimatedCardProps {
  stats: GrowthStatsData;
  isFocused?: boolean;
}

export function GrowthStatsAnimatedCard({ stats, isFocused = true }: GrowthStatsAnimatedCardProps) {
  const previousStatsRef = useRef<GrowthStatsData>(stats);

  // Reanimated Shared Values for Stats
  const levelSpin = useSharedValue(0); // 0 to 3 (3 full 360 degree spins)
  const levelScale = useSharedValue(1);

  const xpScale = useSharedValue(1);
  const xpGlow = useSharedValue(0);
  const [xpBadgeText, setXpBadgeText] = useState<string | null>(null);
  const xpBadgeY = useSharedValue(0);
  const xpBadgeOpacity = useSharedValue(0);

  const streakFlameScale = useSharedValue(1);
  const streakFlameOpacity = useSharedValue(1);

  const approvedScale = useSharedValue(1);
  const approvedGlow = useSharedValue(0);

  const pomodoroRotate = useSharedValue(0);
  const pomodoroScale = useSharedValue(1);

  // Flying Star Particles State
  const [flyingStars, setFlyingStars] = useState<
    Array<{ id: string; startX: number; startY: number; delay: number }>
  >([]);

  // Continuous Pomodoro Ring Rotate
  useEffect(() => {
    pomodoroRotate.value = withRepeat(
      withTiming(360, { duration: 14000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  // Trigger animations when stats change or queued actions are consumed on focus
  useEffect(() => {
    if (!isFocused) return;

    const queued = useGrowthAnimStore.getState().consumeQueue();
    const prev = previousStatsRef.current;

    const levelDiff = (stats.level - prev.level) + queued.levelUps;
    const xpDiff = (stats.xp - prev.xp) + queued.xp;
    const streakDiff = (stats.current_streak - prev.current_streak) + queued.streakIncrements;
    const approvedDiff = (stats.approved_days - prev.approved_days) + queued.approvedIncrements;
    const pomodoroDiff = (stats.total_pomodoros - prev.total_pomodoros) + queued.pomodoroIncrements;

    // 1. LEVEL UP 360° SPIN ANIMATION (3 full 360° turns, gracefully paced)
    if (levelDiff > 0) {
      levelSpin.value = 0;
      levelSpin.value = withDelay(
        300,
        withSequence(
          withTiming(3, { duration: 3200, easing: Easing.out(Easing.cubic) }),
          withSpring(3, { damping: 12 })
        )
      );
      levelScale.value = withDelay(
        300,
        withSequence(
          withTiming(1.4, { duration: 1600, easing: Easing.out(Easing.quad) }),
          withTiming(1.0, { duration: 1600, easing: Easing.inOut(Easing.quad) })
        )
      );
    }

    // 2. XP FLYING STARS & POP ANIMATION (Slower pacing for visual enjoyment)
    if (xpDiff > 0 || queued.xp > 0) {
      const gainAmount = xpDiff > 0 ? xpDiff : queued.xp > 0 ? queued.xp : 20;
      setXpBadgeText(`+${gainAmount} XP`);

      // Spawn 4 flying star particles with staggered delays
      const newStars = Array.from({ length: 4 }).map((_, i) => ({
        id: `star-${Date.now()}-${i}`,
        startX: (i - 1.5) * 45,
        startY: 180 + i * 10,
        delay: 350 + i * 220,
      }));
      setFlyingStars(newStars);

      // Floating +XP badge
      xpBadgeY.value = 0;
      xpBadgeOpacity.value = 1;
      xpBadgeY.value = withTiming(-42, { duration: 2200, easing: Easing.out(Easing.cubic) });
      xpBadgeOpacity.value = withDelay(1500, withTiming(0, { duration: 700 }));

      // Scale pop for XP box
      xpScale.value = withDelay(
        600,
        withSequence(
          withSpring(1.35, { damping: 8, stiffness: 180 }),
          withSpring(1.0, { damping: 12, stiffness: 150 })
        )
      );
      xpGlow.value = withDelay(
        500,
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0, { duration: 900 })
        )
      );
    }

    // 3. STREAK GLOW ANIMATION (STAYS IN PLACE, GLOWS/PULSES ONLY ON STREAK UPDATE)
    if (streakDiff > 0) {
      streakFlameScale.value = withSequence(
        withTiming(1.38, { duration: 600, easing: Easing.out(Easing.back(1.5)) }),
        withTiming(1.1, { duration: 500 }),
        withTiming(1.28, { duration: 500 }),
        withTiming(1.0, { duration: 600, easing: Easing.out(Easing.quad) })
      );
      streakFlameOpacity.value = withSequence(
        withTiming(1.0, { duration: 400 }),
        withTiming(0.7, { duration: 500 }),
        withTiming(1.0, { duration: 600 })
      );
    }

    // 4. APPROVED DAYS STAMP POP (Slower paced)
    if (approvedDiff > 0) {
      approvedScale.value = withSequence(
        withTiming(1.45, { duration: 700, easing: Easing.out(Easing.cubic) }),
        withTiming(1.0, { duration: 700, easing: Easing.out(Easing.quad) })
      );
      approvedGlow.value = withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0, { duration: 800 })
      );
    }

    // 5. POMODORO COUNTER PULSE (Slower paced)
    if (pomodoroDiff > 0) {
      pomodoroScale.value = withSequence(
        withTiming(1.4, { duration: 700, easing: Easing.out(Easing.cubic) }),
        withTiming(1.0, { duration: 700, easing: Easing.out(Easing.quad) })
      );
    }

    previousStatsRef.current = stats;
  }, [stats, isFocused]);

  // Animated Styles
  const levelStyle = useAnimatedStyle(() => ({
    transform: [
      { rotateY: `${levelSpin.value * 360}deg` },
      { scale: levelScale.value },
    ],
  }));

  const xpStyle = useAnimatedStyle(() => ({
    transform: [{ scale: xpScale.value }],
  }));

  const xpGlowStyle = useAnimatedStyle(() => ({
    opacity: xpGlow.value,
  }));

  const xpBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: xpBadgeY.value }],
    opacity: xpBadgeOpacity.value,
  }));

  const streakStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakFlameScale.value }],
    opacity: streakFlameOpacity.value,
  }));

  const approvedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: approvedScale.value }],
  }));

  const pomodoroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pomodoroScale.value }],
  }));

  const pomodoroRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${pomodoroRotate.value}deg` }],
  }));

  return (
    <Card style={styles.cardContainer}>
      <View style={{ gap: spacing.md }}>
        {/* Card Title */}
        <View style={styles.headerRow}>
          <Sparkles size={16} color={palette.danger} strokeWidth={2.4} />
          <Text style={styles.headerText}>
            YOUR GROWTH & STATS
          </Text>
        </View>

        {/* 5 Growth Items Container */}
        <View style={styles.statsGrid}>
          {/* 1. LEVEL */}
          <View style={styles.statCol}>
            <Animated.View style={[styles.iconWrapper, levelStyle]}>
              <View style={styles.levelIconBadge}>
                <Trophy size={16} color={palette.danger} strokeWidth={2.4} />
              </View>
              <Text style={styles.statValue}>{stats.level}</Text>
            </Animated.View>
            <Text style={styles.statLabel}>Level</Text>
          </View>

          {/* 2. XP */}
          <View style={[styles.statCol, { position: 'relative' }]}>
            {/* XP Floating Pop Badge */}
            {xpBadgeText ? (
              <Animated.View style={[styles.xpPopBadge, xpBadgeStyle]}>
                <Text style={styles.xpPopText}>{xpBadgeText}</Text>
              </Animated.View>
            ) : null}

            <Animated.View style={[styles.iconWrapper, xpStyle]}>
              <Animated.View style={[styles.xpGlowRing, xpGlowStyle]} />
              <Star size={16} color="#FF9F1C" fill="#FF9F1C" />
              <Text style={[styles.statValue, { color: '#FF9F1C' }]}>{stats.xp}</Text>
            </Animated.View>
            <Text style={styles.statLabel}>XP</Text>
          </View>

          {/* 3. STREAK (STATIONARY IN ONE PLACE, GLOWS/PULSES ONLY ON STREAK UPDATE) */}
          <View style={styles.statCol}>
            <Animated.View style={[styles.iconWrapper, streakStyle]}>
              <View style={styles.flameContainer}>
                <Heart size={18} color={palette.danger} fill={palette.danger} style={{ position: 'absolute' }} />
                <Flame size={20} color="#FF4500" fill="#FFA500" strokeWidth={2} />
              </View>
              <Text style={[styles.statValue, { color: palette.danger }]}>
                {stats.current_streak}d
              </Text>
            </Animated.View>
            <Text style={styles.statLabel}>Streak</Text>
          </View>

          {/* 4. APPROVED DAYS */}
          <View style={styles.statCol}>
            <Animated.View style={[styles.iconWrapper, approvedStyle]}>
              <View style={styles.approvedIconBadge}>
                <CheckCircle2 size={16} color="#16a34a" strokeWidth={2.4} />
              </View>
              <Text style={[styles.statValue, { color: '#16a34a' }]}>
                {stats.approved_days}
              </Text>
            </Animated.View>
            <Text style={styles.statLabel}>Approved</Text>
          </View>

          {/* 5. POMODOROS */}
          <View style={styles.statCol}>
            <Animated.View style={[styles.iconWrapper, pomodoroStyle]}>
              <Animated.View style={[styles.pomodoroRing, pomodoroRingStyle]} />
              <Timer size={16} color={palette.danger} strokeWidth={2.2} />
              <Text style={styles.statValue}>{stats.total_pomodoros}</Text>
            </Animated.View>
            <Text style={styles.statLabel}>Pomodoros</Text>
          </View>
        </View>

        {/* Flying Star Particle Layer */}
        {flyingStars.map((star) => (
          <FlyingStarParticle
            key={star.id}
            startX={star.startX}
            startY={star.startY}
            delay={star.delay}
            onComplete={() => {
              setFlyingStars((prev) => prev.filter((s) => s.id !== star.id));
            }}
          />
        ))}
      </View>
    </Card>
  );
}

/** Component for individual flying star particle with slower flight duration */
function FlyingStarParticle({
  startX,
  startY,
  delay,
  onComplete,
}: {
  startX: number;
  startY: number;
  delay: number;
  onComplete: () => void;
}) {
  const translateX = useSharedValue(startX);
  const translateY = useSharedValue(startY);
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withTiming(1.3, { duration: 400 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 350 }));

    translateX.value = withDelay(
      delay,
      withTiming(-35, { duration: 1400, easing: Easing.out(Easing.cubic) })
    );

    translateY.value = withDelay(
      delay,
      withTiming(-120, { duration: 1400, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) {
          scale.value = withTiming(0, { duration: 250 });
          opacity.value = withTiming(0, { duration: 250 }, () => {
            runOnJS(onComplete)();
          });
        }
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.flyingStar, animatedStyle]}>
      <Star size={18} color="#FF9F1C" fill="#FF9F1C" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: 'rgba(255, 243, 245, 0.88)',
    borderColor: 'rgba(250, 215, 224, 0.85)',
    borderWidth: 1.5,
    borderRadius: 24,
    overflow: 'visible',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '800',
    color: palette.danger,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: spacing.xs,
  },
  iconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  levelIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(232, 77, 114, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontWeight: '800',
    fontSize: 17,
    color: palette.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statLabel: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  xpPopBadge: {
    position: 'absolute',
    top: -18,
    alignSelf: 'center',
    backgroundColor: '#FF9F1C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    zIndex: 10,
  },
  xpPopText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  xpGlowRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 159, 28, 0.25)',
  },
  flameContainer: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvedIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pomodoroRing: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(232, 77, 114, 0.35)',
    borderStyle: 'dashed',
  },
  flyingStar: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    zIndex: 99,
  },
});
