import { useEffect } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ChevronRight, Sparkles } from 'lucide-react-native';

import { useCompanionQueueStore } from '../companion-queue-store';
import type { CompanionTag } from '../cat-scenarios';
import { palette, radius, spacing } from '@/theme';

// Fallback asset image for cat stage
const FALLBACK_CAT_IMAGE = require('../../../assets/icon.png');

// Image assets mapping for cat picture display
const IMAGE_ASSET_MAP: Record<string, any> = {
  cat_studying_pomodoro: FALLBACK_CAT_IMAGE,
  cat_drinking_water: FALLBACK_CAT_IMAGE,
  cat_hero: FALLBACK_CAT_IMAGE,
};

const DIGITAL_TAG_MAP: Record<CompanionTag, { bg: string; text: string; border: string }> = {
  '[TOOL]': { bg: 'rgba(232, 77, 114, 0.20)', text: '#FF4D79', border: '#E84D72' },
  '[NOTIFICATION]': { bg: 'rgba(249, 115, 22, 0.20)', text: '#FF9F1C', border: '#F97316' },
  '[PARTNER]': { bg: 'rgba(168, 85, 247, 0.20)', text: '#C084FC', border: '#A855F7' },
  '[ROUTINE]': { bg: 'rgba(16, 185, 129, 0.20)', text: '#34D399', border: '#10B981' },
  '[IDLE]': { bg: 'rgba(6, 182, 212, 0.20)', text: '#22D3EE', border: '#06B6D4' },
};

export function CatBulletinStage() {
  const activeScenario = useCompanionQueueStore((s) => s.activeScenario);
  const queue = useCompanionQueueStore((s) => s.queue);
  const nextScenario = useCompanionQueueStore((s) => s.nextScenario);

  // Digital LED Blinking Dot & Text Ejection animations
  const ledOpacity = useSharedValue(1);
  const textOpacity = useSharedValue(1);
  const textTranslateY = useSharedValue(0);

  useEffect(() => {
    // Continuous LED blinking pulse
    ledOpacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 600 }),
        withTiming(1.0, { duration: 600 })
      ),
      -1,
      true
    );

    // Auto-advance bulletin board every 6 seconds so the board is NEVER static!
    const interval = setInterval(() => {
      useCompanionQueueStore.getState().nextScenario();
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Eject text animation when active scenario updates
    textOpacity.value = 0;
    textTranslateY.value = 8;

    textOpacity.value = withTiming(1, { duration: 300 });
    textTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
  }, [activeScenario]);

  const animatedLedStyle = useAnimatedStyle(() => ({
    opacity: ledOpacity.value,
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const tagStyle = DIGITAL_TAG_MAP[activeScenario.tag] || DIGITAL_TAG_MAP['[IDLE]'];
  const imageSource = IMAGE_ASSET_MAP[activeScenario.imageKey] || IMAGE_ASSET_MAP.cat_hero;

  return (
    <View style={styles.digitalCardContainer}>
      {/* 50% Left: Fixed Cat Picture Frame */}
      <View style={styles.leftFixedContainer}>
        <View style={styles.fixedImageFrame}>
          <Image
            source={imageSource}
            style={styles.catImageFixed}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* 50% Right: Digital LCD Bulletin Billboard */}
      <View style={styles.rightDigitalBillboard}>
        {/* Top Digital Status Bar */}
        <View style={styles.billboardHeaderRow}>
          {/* Live LED Dot */}
          <View style={styles.liveLedWrapper}>
            <Animated.View style={[styles.liveLedDot, animatedLedStyle]} />
            <Text style={styles.liveText}>LIVE TICKER</Text>
          </View>

          {/* Digital Tag Pill */}
          <View style={[styles.digitalTagPill, { backgroundColor: tagStyle.bg, borderColor: tagStyle.border }]}>
            <Text style={[styles.digitalTagText, { color: tagStyle.text }]}>
              {activeScenario.tag}
            </Text>
          </View>
        </View>

        {/* Ejected Digital Bulletin Text */}
        <Animated.View style={[{ flex: 1, justifyContent: 'center', gap: 4 }, animatedTextStyle]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Sparkles size={13} color={tagStyle.text} strokeWidth={2.4} />
            <Text style={styles.digitalHeadlineText} numberOfLines={1}>
              {activeScenario.headline}
            </Text>
          </View>

          <Text style={styles.digitalSubtextText} numberOfLines={2}>
            {activeScenario.subtext}
          </Text>
        </Animated.View>

        {/* Bottom Queue Bar */}
        {queue.length > 0 ? (
          <Pressable onPress={nextScenario} style={styles.nextQueueBtn}>
            <Text style={styles.nextQueueText}>
              +{queue.length} Queued Event{queue.length > 1 ? 's' : ''}
            </Text>
            <ChevronRight size={12} color="#FF4D79" strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  digitalCardContainer: {
    backgroundColor: '#1E1418',
    borderColor: 'rgba(232, 77, 114, 0.45)',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#E84D72',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 145,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        } as any)
      : {}),
  },
  leftFixedContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixedImageFrame: {
    width: 115,
    height: 115,
    borderRadius: 18,
    backgroundColor: '#2A1B22',
    borderColor: 'rgba(250, 215, 224, 0.25)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  catImageFixed: {
    width: '88%',
    height: '88%',
  },
  rightDigitalBillboard: {
    flex: 1,
    height: 120,
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingRight: 4,
  },
  billboardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveLedWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveLedDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  liveText: {
    color: 'rgba(255, 255, 255, 0.60)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  digitalTagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  digitalTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  digitalHeadlineText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: -0.2,
  },
  digitalSubtextText: {
    color: 'rgba(255, 243, 245, 0.82)',
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
  nextQueueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 77, 121, 0.16)',
    borderColor: 'rgba(255, 77, 121, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 3,
  },
  nextQueueText: {
    color: '#FF4D79',
    fontSize: 10,
    fontWeight: '800',
  },
});
