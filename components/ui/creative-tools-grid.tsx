import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  Bot,
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
}

const TOOLS: ToolItem[] = [
  {
    id: 'companion',
    title: 'Companion',
    subtitle: 'Mascot Engine',
    route: '/(app)/companion',
    icon: Bot,
  },
  {
    id: 'accountability',
    title: 'Accountability',
    subtitle: 'Daily Plan',
    route: '/(app)/accountability',
    icon: CheckCircle2,
  },
  {
    id: 'journey',
    title: 'Journey',
    subtitle: 'XP Rewards',
    route: '/(app)/journey',
    icon: Compass,
  },
  {
    id: 'achievements',
    title: 'Achievements',
    subtitle: 'Badges Hub',
    route: '/(app)/achievements',
    icon: Trophy,
  },
  {
    id: 'pyq',
    title: 'Practice',
    subtitle: 'Exam PYQs',
    route: '/(app)/pyq',
    icon: BookOpen,
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    subtitle: 'Spaced SRS',
    route: '/(app)/flashcards',
    icon: Zap,
  },
  {
    id: 'water',
    title: 'Hydration',
    subtitle: 'Water Tracker',
    route: '/(app)/water',
    icon: Droplets,
  },
  {
    id: 'english',
    title: 'English',
    subtitle: 'Grammar & Vocab',
    route: '/(app)/english',
    icon: MessageSquare,
  },
];

function ToolCard({ item }: { item: ToolItem }) {
  const router = useRouter();
  const scale = useSharedValue(1);

  const Icon = item.icon;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 8, stiffness: 200 });
  };

  return (
    <Pressable
      onPress={() => router.push(item.route as any)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.cardPressable}
    >
      <Animated.View style={[styles.toolCard, animatedStyle]}>
        {/* Large Translucent Pink Watermark Icon on the Right */}
        <View style={styles.watermarkContainer} pointerEvents="none">
          <Icon size={72} color="rgba(240, 115, 146, 0.16)" strokeWidth={1.8} />
        </View>

        {/* Header Row: Minimal Black Icon in Soft Pink Container + Chevron */}
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Icon size={20} color="#121218" strokeWidth={2.4} />
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
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 243, 245, 0.75)',
    borderColor: 'rgba(250, 215, 224, 0.75)',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: spacing[16],
    gap: spacing[12],
    shadowColor: palette.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 4,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        } as any)
      : {}),
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
  },
  subtitleText: {
    fontSize: 12,
    lineHeight: 16,
    color: palette.textSecondary,
    fontWeight: '500',
  },
});
