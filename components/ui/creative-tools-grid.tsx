import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  BarChart2,
  CheckCircle2,
  Compass,
  Trophy,
  BookOpen,
  Zap,
  Droplets,
  MessageSquare,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react-native';
import { palette, spacing } from '@/theme';

interface ToolItem {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  icon: LucideIcon;
  delayOffset: number;
}

const TOOLS: ToolItem[] = [
  {
    id: 'accountability',
    title: 'Accountability',
    subtitle: 'Daily Plan',
    route: '/(app)/accountability',
    icon: CheckCircle2,
    delayOffset: 300,
  },
  {
    id: 'journey',
    title: 'Journey',
    subtitle: 'XP Rewards',
    route: '/(app)/journey',
    icon: Compass,
    delayOffset: 600,
  },
  {
    id: 'achievements',
    title: 'Achievements',
    subtitle: 'Badges Hub',
    route: '/(app)/achievements',
    icon: Trophy,
    delayOffset: 900,
  },
  {
    id: 'pyq',
    title: 'Practice',
    subtitle: 'Exam PYQs',
    route: '/(app)/pyq',
    icon: BookOpen,
    delayOffset: 200,
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    subtitle: 'Spaced SRS',
    route: '/(app)/flashcards',
    icon: Zap,
    delayOffset: 500,
  },
  {
    id: 'water',
    title: 'Hydration',
    subtitle: 'Water Tracker',
    route: '/(app)/water',
    icon: Droplets,
    delayOffset: 800,
  },
  {
    id: 'english',
    title: 'English',
    subtitle: 'Grammar & Vocab',
    route: '/(app)/english',
    icon: MessageSquare,
    delayOffset: 1100,
  },
  {
    id: 'statistics',
    title: 'Statistics',
    subtitle: 'Study Analytics',
    route: '/(app)/statistics',
    icon: BarChart2,
    delayOffset: 1200,
  },
];

// Continuous Animated Tool Icon switching through 3 micro-animation patterns
function AnimatedToolIcon({ icon: Icon, delayOffset }: { icon: LucideIcon; delayOffset: number }) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Pattern 1: Pendulum Swing / Wiggle
      rotation.value = withRepeat(
        withSequence(
          withTiming(-14, { duration: 350, easing: Easing.inOut(Easing.quad) }),
          withTiming(14, { duration: 450, easing: Easing.inOut(Easing.quad) }),
          withTiming(-8, { duration: 350, easing: Easing.inOut(Easing.quad) }),
          withTiming(8, { duration: 350, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 500, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1500 }) // pause before next cycle
        ),
        -1,
        false
      );

      // Pattern 2: Pulse Scale Breathing
      scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200 }),
          withTiming(1.22, { duration: 400, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.95, { duration: 350, easing: Easing.inOut(Easing.quad) }),
          withTiming(1.15, { duration: 350, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 500 }),
          withTiming(1, { duration: 1200 })
        ),
        -1,
        false
      );

      // Pattern 3: Floating Vertical Bounce
      translateY.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 700 }),
          withTiming(-5, { duration: 400, easing: Easing.inOut(Easing.quad) }),
          withTiming(2, { duration: 300, easing: Easing.inOut(Easing.quad) }),
          withTiming(-3, { duration: 300, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 450 }),
          withTiming(0, { duration: 1350 })
        ),
        -1,
        false
      );
    }, delayOffset);

    return () => clearTimeout(timer);
  }, [rotation, scale, translateY, delayOffset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Icon size={20} color="#121218" strokeWidth={2.4} />
    </Animated.View>
  );
}

function ToolCard({ item }: { item: ToolItem }) {
  const router = useRouter();
  const cardScale = useSharedValue(1);

  const Icon = item.icon;

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handlePressIn = () => {
    cardScale.value = withSpring(0.96, { damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    cardScale.value = withSpring(1, { damping: 8, stiffness: 200 });
  };

  return (
    <Pressable
      onPress={() => router.push(item.route as any)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.cardPressable}
    >
      <Animated.View style={[styles.toolCard, cardAnimatedStyle]}>
        {/* Large Translucent Pink Watermark Icon on the Right */}
        <View style={styles.watermarkContainer} pointerEvents="none">
          <Icon size={72} color="rgba(240, 115, 146, 0.16)" strokeWidth={1.8} />
        </View>

        {/* Header Row: Continuous Animated Icon in Soft Pink Container + Chevron */}
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <AnimatedToolIcon icon={Icon} delayOffset={item.delayOffset} />
          </View>

          <ChevronRight size={16} color={palette.danger} style={{ zIndex: 2 }} />
        </View>

        {/* Body: Title (palette.danger) + Subtitle */}
        <View style={styles.cardBody}>
          <Text style={styles.titleText}>{item.title}</Text>
          <Text style={styles.subtitleText}>{item.subtitle}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function CreativeToolsGrid() {
  return (
    <View style={styles.gridContainer}>
      {TOOLS.map((tool) => (
        <ToolCard key={tool.id} item={tool} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[12],
    marginTop: spacing[4],
  },
  cardPressable: {
    width: '48%',
    flexGrow: 1,
    flexShrink: 0,
    minWidth: 140,
  },
  toolCard: {
    position: 'relative',
    backgroundColor: 'rgba(255, 243, 245, 0.95)',
    borderColor: 'rgba(250, 215, 224, 0.90)',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: spacing[16],
    gap: spacing[12],
    elevation: 4,
  },
  watermarkContainer: {
    position: 'absolute',
    top: -8,
    right: -12,
    zIndex: 0,
    transform: [{ rotate: '12deg' }],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(232, 77, 114, 0.14)',
    borderColor: 'rgba(232, 77, 114, 0.30)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    gap: 2,
    zIndex: 2,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.danger,
    letterSpacing: -0.2,
    backgroundColor: 'transparent',
  },
  subtitleText: {
    fontSize: 12,
    lineHeight: 16,
    color: palette.textSecondary,
    fontWeight: '500',
    backgroundColor: 'transparent',
  },
});
