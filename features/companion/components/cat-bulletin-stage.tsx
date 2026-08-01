import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ChevronRight, Heart, Sparkles, Star } from 'lucide-react-native';

import { useCompanionQueueStore } from '../companion-queue-store';
import type { CompanionTag } from '../cat-scenarios';
import { palette, radius, spacing } from '@/theme';

// Fallback asset image for cat stage
const FALLBACK_CAT_IMAGE = require('../../../assets/icon.png');

/**
 * 🐱 CAT SCENARIO IMAGE MAPPING
 * You can replace any of the images below with local assets (e.g. require('../../../assets/cat_sleeping.png'))
 * or remote image URIs (e.g. { uri: 'https://example.com/cat.png' }).
 */
const IMAGE_ASSET_MAP: Record<string, any> = {
  cat_studying_pomodoro: FALLBACK_CAT_IMAGE,
  cat_drinking_water: FALLBACK_CAT_IMAGE,
  cat_writing_english: FALLBACK_CAT_IMAGE,
  cat_practicing_pyq: FALLBACK_CAT_IMAGE,
  cat_flashcard_revision: FALLBACK_CAT_IMAGE,
  cat_goal_achieved: FALLBACK_CAT_IMAGE,
  cat_trophy_award: FALLBACK_CAT_IMAGE,
  cat_lunch_time: FALLBACK_CAT_IMAGE,
  cat_evening_snack: FALLBACK_CAT_IMAGE,
  cat_sleeping_night: FALLBACK_CAT_IMAGE,
  cat_morning_wake: FALLBACK_CAT_IMAGE,
  cat_notification_alert: FALLBACK_CAT_IMAGE,
  cat_partner_wave: FALLBACK_CAT_IMAGE,
  cat_idle_reading: FALLBACK_CAT_IMAGE,
  cat_late_night_study: FALLBACK_CAT_IMAGE,
  cat_hero: FALLBACK_CAT_IMAGE,
};

export function CatBulletinStage() {
  const activeScenario = useCompanionQueueStore((s) => s.activeScenario);
  const queue = useCompanionQueueStore((s) => s.queue);
  const nextScenario = useCompanionQueueStore((s) => s.nextScenario);

  // Typewriter Typed Text State
  const [displayedSubtext, setDisplayedSubtext] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  // Reanimated Shared Values for LED Dot & Card Transitions
  const ledOpacity = useSharedValue(1);

  // Auto-rotation & Blinking LED
  useEffect(() => {
    ledOpacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 600 }),
        withTiming(1.0, { duration: 600 })
      ),
      -1,
      true
    );

    // Auto-advance bulletin board every 6.5 seconds
    const interval = setInterval(() => {
      useCompanionQueueStore.getState().nextScenario();
    }, 6500);

    return () => clearInterval(interval);
  }, []);

  // Constant & Continuous Typewriter Typing Loop
  useEffect(() => {
    setDisplayedSubtext('');
    let charIdx = 0;
    const fullText = activeScenario.subtext;

    const timer = setInterval(() => {
      if (charIdx <= fullText.length) {
        setDisplayedSubtext(fullText.slice(0, charIdx));
        charIdx++;
      } else if (charIdx > fullText.length + 28) {
        // Reset and re-type sentence constantly
        charIdx = 0;
        setDisplayedSubtext('');
      } else {
        // Short pause at full sentence before looping
        charIdx++;
      }
    }, 38);

    return () => clearInterval(timer);
  }, [activeScenario]);

  // Cursor Blinking Effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  const animatedLedStyle = useAnimatedStyle(() => ({
    opacity: ledOpacity.value,
  }));

  const imageSource = IMAGE_ASSET_MAP[activeScenario.imageKey] || IMAGE_ASSET_MAP.cat_hero;

  return (
    <View style={styles.stageParentRow}>
      {/* CARD 1: DEDICATED PALE PINK FROSTED GLASS CAT IMAGE CARD */}
      <View style={styles.catImageCardContainer}>
        <View style={styles.catImageFixedFrame}>
          <Image
            source={imageSource}
            style={styles.catImageFixed}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* CARD 2: DEDICATED CHERRY DIGITAL BULLETIN BOARD CARD */}
      <View style={styles.digitalBulletinCardContainer}>
        {/* Background Watermark Layer (Hearts & Stars scattered all over) */}
        <View style={styles.watermarkContainer} pointerEvents="none">
          {/* Top Left Heart */}
          <Heart
            size={38}
            color="rgba(255, 255, 255, 0.22)"
            fill="rgba(255, 255, 255, 0.16)"
            style={{ position: 'absolute', top: 6, left: 12, transform: [{ rotate: '-20deg' }] }}
          />
          {/* Top Center Star */}
          <Star
            size={28}
            color="rgba(255, 255, 255, 0.20)"
            fill="rgba(255, 255, 255, 0.14)"
            style={{ position: 'absolute', top: 8, left: '42%', transform: [{ rotate: '15deg' }] }}
          />
          {/* Top Right Sparkles */}
          <Sparkles
            size={44}
            color="rgba(255, 255, 255, 0.24)"
            style={{ position: 'absolute', top: -6, right: 18, transform: [{ rotate: '25deg' }] }}
          />

          {/* Middle Left Sparkles */}
          <Sparkles
            size={32}
            color="rgba(255, 255, 255, 0.18)"
            style={{ position: 'absolute', top: '42%', left: 8 }}
          />
          {/* Middle Center Heart */}
          <Heart
            size={48}
            color="rgba(255, 255, 255, 0.22)"
            fill="rgba(255, 255, 255, 0.15)"
            style={{ position: 'absolute', top: '35%', left: '45%', transform: [{ rotate: '12deg' }] }}
          />
          {/* Middle Right Star */}
          <Star
            size={34}
            color="rgba(255, 255, 255, 0.20)"
            fill="rgba(255, 255, 255, 0.14)"
            style={{ position: 'absolute', top: '40%', right: 10, transform: [{ rotate: '-10deg' }] }}
          />

          {/* Bottom Left Heart */}
          <Heart
            size={52}
            color="rgba(255, 255, 255, 0.25)"
            fill="rgba(255, 255, 255, 0.18)"
            style={{ position: 'absolute', bottom: -12, left: -8, transform: [{ rotate: '-15deg' }] }}
          />
          {/* Bottom Center Sparkles */}
          <Sparkles
            size={36}
            color="rgba(255, 255, 255, 0.20)"
            style={{ position: 'absolute', bottom: 4, left: '38%', transform: [{ rotate: '-25deg' }] }}
          />
          {/* Bottom Right Heart & Star */}
          <Heart
            size={42}
            color="rgba(255, 255, 255, 0.22)"
            fill="rgba(255, 255, 255, 0.16)"
            style={{ position: 'absolute', bottom: -10, right: 28, transform: [{ rotate: '18deg' }] }}
          />
          <Star
            size={30}
            color="rgba(255, 255, 255, 0.20)"
            fill="rgba(255, 255, 255, 0.15)"
            style={{ position: 'absolute', bottom: 6, right: -4, transform: [{ rotate: '10deg' }] }}
          />
        </View>

        {/* Top Header Bar */}
        <View style={styles.billboardHeaderRow}>
          {/* Live LED Indicator */}
          <View style={styles.liveLedWrapper}>
            <Animated.View style={[styles.liveLedDot, animatedLedStyle]} />
            <Text style={styles.liveText}>LIVE TICKER</Text>
          </View>

          {/* Digital Tag Pill */}
          <View style={styles.digitalTagPill}>
            <Text style={styles.digitalTagText}>
              {activeScenario.tag}
            </Text>
          </View>
        </View>

        {/* Headline & Typewriter Subtext */}
        <View style={styles.textContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Sparkles size={14} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.cherryHeadlineText} numberOfLines={1}>
              {activeScenario.headline}
            </Text>
          </View>

          <Text style={styles.cherrySubtextText} numberOfLines={2}>
            {displayedSubtext}
            <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
              {showCursor ? '|' : ' '}
            </Text>
          </Text>
        </View>

        {/* Bottom Queue Indicator */}
        {queue.length > 0 ? (
          <Pressable onPress={nextScenario} style={styles.nextQueueBtn}>
            <Text style={styles.nextQueueText}>
              +{queue.length} Queued
            </Text>
            <ChevronRight size={12} color="#FFFFFF" strokeWidth={2.4} />
          </Pressable>
        ) : (
          <View style={{ height: 16 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stageParentRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md, // Clean space between the two separated cards
  },

  /* 1. LEFT IMAGE CARD — PALE PINK FROSTED GLASS EFFECT */
  catImageCardContainer: {
    width: 125,
    height: 145,
    backgroundColor: 'rgba(255, 243, 245, 0.92)', // Signature Pale Pink Glass
    borderColor: 'rgba(250, 215, 224, 0.90)',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(12px) saturate(160%)',
          WebkitBackdropFilter: 'blur(12px) saturate(160%)',
        } as any)
      : {}),
  },
  catImageFixedFrame: {
    width: 112,
    height: 112,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(250, 215, 224, 0.70)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  catImageFixed: {
    width: '88%',
    height: '88%',
  },

  /* WATERMARK BACKDROP STYLES */
  watermarkContainer: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    overflow: 'hidden',
    zIndex: 0,
  },
  watermarkHeartLeft: {
    position: 'absolute',
    bottom: -14,
    left: -12,
    transform: [{ rotate: '-15deg' }],
  },
  watermarkStarsRight: {
    position: 'absolute',
    top: -8,
    right: 20,
    transform: [{ rotate: '20deg' }],
  },
  watermarkStarCenter: {
    position: 'absolute',
    right: 10,
    bottom: 6,
    transform: [{ rotate: '12deg' }],
  },

  /* 2. RIGHT BULLETIN CARD — RICH CHERRY COLOR & CRISP WHITE TEXT */
  digitalBulletinCardContainer: {
    flex: 1,
    height: 145,
    backgroundColor: palette.danger, // Rich Cherry Color (#E84D72 / #D94C61)
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: spacing.md,
    justifyContent: 'space-between',
    shadowColor: palette.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
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
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  digitalTagPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderColor: 'rgba(255, 255, 255, 0.40)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  digitalTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  cherryHeadlineText: {
    color: '#FFFFFF', // Crisp White Text
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cherrySubtextText: {
    color: 'rgba(255, 255, 255, 0.95)', // Pale Cream White Subtext
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  nextQueueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderColor: 'rgba(255, 255, 255, 0.40)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 3,
  },
  nextQueueText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
