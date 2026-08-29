import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ChevronRight, Sparkles, Star } from 'lucide-react-native';

import { useCompanionQueueStore } from '../companion-queue-store';
import { palette, radius, spacing } from '@/theme';

// Fallback asset image for cat stage
const FALLBACK_CAT_IMAGE = require('../../../assets/icon.png');

/**
 * 🐱 CAT SCENARIO IMAGE MAPPING
 * You can replace any of the images below with local assets (e.g. require('../../../assets/cat_sleeping.png'))
 * or remote image URIs (e.g. { uri: 'https://example.com/cat.png' }).
 */
const IMAGE_ASSET_MAP: Record<string, any> = {
  cat_studying_pomodoro: require('../../../assets/images/companion/cat_studying_pomodoro.png'),
  'Screenshot 2026-08-01 174940': require('../../../assets/images/companion/Screenshot 2026-08-01 174940.png'),
  'Screenshot 2026-08-01 174946': require('../../../assets/images/companion/Screenshot 2026-08-01 174946.png'),
  'Screenshot 2026-08-01 174956': require('../../../assets/images/companion/Screenshot 2026-08-01 174956.png'),
  'Screenshot 2026-08-01 175001': require('../../../assets/images/companion/Screenshot 2026-08-01 175001.png'),
  'Screenshot 2026-08-01 175007': require('../../../assets/images/companion/Screenshot 2026-08-01 175007.png'),
  'Screenshot 2026-08-01 175012': require('../../../assets/images/companion/Screenshot 2026-08-01 175012.png'),
  'Screenshot 2026-08-01 175017': require('../../../assets/images/companion/Screenshot 2026-08-01 175017.png'),
  'Screenshot 2026-08-01 175024': require('../../../assets/images/companion/Screenshot 2026-08-01 175024.png'),
  'Screenshot 2026-08-01 175031': require('../../../assets/images/companion/Screenshot 2026-08-01 175031.png'),
  'Screenshot 2026-08-01 175038': require('../../../assets/images/companion/Screenshot 2026-08-01 175038.png'),
  'Screenshot 2026-08-01 175043': require('../../../assets/images/companion/Screenshot 2026-08-01 175043.png'),
  'Screenshot 2026-08-01 180441': require('../../../assets/images/companion/Screenshot 2026-08-01 180441.png'),
  'Screenshot 2026-08-01 180447': require('../../../assets/images/companion/Screenshot 2026-08-01 180447.png'),
  'Screenshot 2026-08-01 180453': require('../../../assets/images/companion/Screenshot 2026-08-01 180453.png'),
  'Screenshot 2026-08-01 180458': require('../../../assets/images/companion/Screenshot 2026-08-01 180458.png'),
  'Screenshot 2026-08-01 180504': require('../../../assets/images/companion/Screenshot 2026-08-01 180504.png'),
  'Screenshot 2026-08-01 180510': require('../../../assets/images/companion/Screenshot 2026-08-01 180510.png'),
  'Screenshot 2026-08-01 180514': require('../../../assets/images/companion/Screenshot 2026-08-01 180514.png'),
  'ChatGPT Image Aug 1, 2026, 06_05_38 PM': require('../../../assets/images/companion/ChatGPT Image Aug 1, 2026, 06_05_38 PM.png'),
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
      withSequence(withTiming(0.2, { duration: 600 }), withTiming(1.0, { duration: 600 })),
      -1,
      true,
    );

    // Auto-advance bulletin board every 45 seconds so users can read content & enjoy cat images
    const interval = setInterval(() => {
      useCompanionQueueStore.getState().nextScenario();
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  // Constant & Continuous Typewriter Typing Loop (holds static text for ~42 seconds before subtle loop)
  useEffect(() => {
    setDisplayedSubtext('');
    let charIdx = 0;
    const fullText = activeScenario.subtext;

    const timer = setInterval(() => {
      if (charIdx <= fullText.length) {
        setDisplayedSubtext(fullText.slice(0, charIdx));
        charIdx++;
      } else if (charIdx > fullText.length + 1100) {
        // Hold static for ~42 seconds after typing finishes, then re-type
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

  const imageSource =
    IMAGE_ASSET_MAP[activeScenario.imageKey] ||
    IMAGE_ASSET_MAP.cat_studying_pomodoro ||
    FALLBACK_CAT_IMAGE;

  return (
    <View style={styles.stageParentRow}>
      {/* CARD 1: DEDICATED PALE PINK FROSTED GLASS CAT IMAGE CARD */}
      <View
        style={[
          styles.catImageCardContainer,
          Platform.OS === 'web' &&
            ({
              elevation: 3,
              backdropFilter: 'blur(12px) saturate(160%)',
              WebkitBackdropFilter: 'blur(12px) saturate(160%)',
            } as any),
        ]}
      >
        <View style={styles.catImageFixedFrame}>
          <Image source={imageSource} style={styles.catImageFixed} resizeMode="contain" />
        </View>
      </View>

      {/* CARD 2: DEDICATED CHERRY DIGITAL BULLETIN BOARD CARD */}
      <View
        style={[styles.digitalBulletinCardContainer, Platform.OS === 'web' && { elevation: 4 }]}
      >
        {/* Background Watermark Layer (Ultra Dense Stars & Sparkles) */}
        <View style={styles.watermarkContainer} pointerEvents="none">
          {/* Row 1: Top Scatter */}
          <Star
            size={38}
            color="rgba(255, 255, 255, 0.24)"
            fill="rgba(255, 255, 255, 0.16)"
            style={{ position: 'absolute', top: 2, left: 6, transform: [{ rotate: '-20deg' }] }}
          />
          <Star
            size={24}
            color="rgba(255, 255, 255, 0.22)"
            fill="rgba(255, 255, 255, 0.15)"
            style={{ position: 'absolute', top: 4, left: '22%', transform: [{ rotate: '10deg' }] }}
          />
          <Sparkles
            size={30}
            color="rgba(255, 255, 255, 0.22)"
            style={{ position: 'absolute', top: 2, left: '42%' }}
          />
          <Star
            size={30}
            color="rgba(255, 255, 255, 0.22)"
            fill="rgba(255, 255, 255, 0.15)"
            style={{ position: 'absolute', top: 6, left: '64%', transform: [{ rotate: '15deg' }] }}
          />
          <Sparkles
            size={44}
            color="rgba(255, 255, 255, 0.25)"
            style={{ position: 'absolute', top: -6, right: 14, transform: [{ rotate: '25deg' }] }}
          />

          {/* Row 2: Upper Middle Scatter */}
          <Star
            size={26}
            color="rgba(255, 255, 255, 0.20)"
            fill="rgba(255, 255, 255, 0.14)"
            style={{
              position: 'absolute',
              top: '24%',
              left: 16,
              transform: [{ rotate: '-12deg' }],
            }}
          />
          <Star
            size={44}
            color="rgba(255, 255, 255, 0.24)"
            fill="rgba(255, 255, 255, 0.16)"
            style={{
              position: 'absolute',
              top: '22%',
              left: '32%',
              transform: [{ rotate: '-8deg' }],
            }}
          />
          <Star
            size={32}
            color="rgba(255, 255, 255, 0.22)"
            fill="rgba(255, 255, 255, 0.15)"
            style={{
              position: 'absolute',
              top: '26%',
              right: '28%',
              transform: [{ rotate: '18deg' }],
            }}
          />
          <Sparkles
            size={28}
            color="rgba(255, 255, 255, 0.20)"
            style={{ position: 'absolute', top: '25%', right: 10 }}
          />

          {/* Row 3: Center & Lower Middle Scatter */}
          <Sparkles
            size={34}
            color="rgba(255, 255, 255, 0.22)"
            style={{ position: 'absolute', top: '48%', left: 4 }}
          />
          <Star
            size={48}
            color="rgba(255, 255, 255, 0.24)"
            fill="rgba(255, 255, 255, 0.16)"
            style={{
              position: 'absolute',
              top: '42%',
              left: '46%',
              transform: [{ rotate: '14deg' }],
            }}
          />
          <Star
            size={36}
            color="rgba(255, 255, 255, 0.22)"
            fill="rgba(255, 255, 255, 0.15)"
            style={{
              position: 'absolute',
              top: '45%',
              right: 8,
              transform: [{ rotate: '-10deg' }],
            }}
          />
          <Star
            size={28}
            color="rgba(255, 255, 255, 0.20)"
            fill="rgba(255, 255, 255, 0.14)"
            style={{
              position: 'absolute',
              top: '50%',
              right: '35%',
              transform: [{ rotate: '-18deg' }],
            }}
          />

          {/* Row 4: Bottom Scatter */}
          <Star
            size={54}
            color="rgba(255, 255, 255, 0.26)"
            fill="rgba(255, 255, 255, 0.18)"
            style={{
              position: 'absolute',
              bottom: -14,
              left: -6,
              transform: [{ rotate: '-15deg' }],
            }}
          />
          <Star
            size={26}
            color="rgba(255, 255, 255, 0.22)"
            fill="rgba(255, 255, 255, 0.15)"
            style={{
              position: 'absolute',
              bottom: 6,
              left: '26%',
              transform: [{ rotate: '12deg' }],
            }}
          />
          <Sparkles
            size={36}
            color="rgba(255, 255, 255, 0.22)"
            style={{
              position: 'absolute',
              bottom: 2,
              left: '42%',
              transform: [{ rotate: '-25deg' }],
            }}
          />
          <Star
            size={42}
            color="rgba(255, 255, 255, 0.24)"
            fill="rgba(255, 255, 255, 0.16)"
            style={{
              position: 'absolute',
              bottom: -10,
              right: 30,
              transform: [{ rotate: '18deg' }],
            }}
          />
          <Star
            size={32}
            color="rgba(255, 255, 255, 0.22)"
            fill="rgba(255, 255, 255, 0.15)"
            style={{ position: 'absolute', bottom: 4, right: -6, transform: [{ rotate: '10deg' }] }}
          />
        </View>

        {/* Foreground Content Layer (Isolated on Top - zIndex: 10) */}
        <View style={styles.foregroundLayer}>
          {/* Top Header Bar */}
          <View style={styles.billboardHeaderRow}>
            {/* Live LED Indicator */}
            <View style={styles.liveLedWrapper}>
              <Animated.View style={[styles.liveLedDot, animatedLedStyle]} />
              <Text style={styles.liveText}>Cat Wisdom</Text>
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
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{showCursor ? '|' : ' '}</Text>
            </Text>
          </View>

          {/* Bottom Queue Indicator */}
          {queue.length > 0 ? (
            <Pressable onPress={nextScenario} style={styles.nextQueueBtn}>
              <Text style={styles.nextQueueText}>+{queue.length} Queued</Text>
              <ChevronRight size={12} color="#FFFFFF" strokeWidth={2.4} />
            </Pressable>
          ) : (
            <View style={{ height: 16 }} />
          )}
        </View>
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
    overflow: 'hidden',
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
    width: '92%',
    height: '92%',
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
    position: 'relative',
    overflow: 'hidden',
  },
  foregroundLayer: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 10,
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
    alignItems: 'flex-start',
    gap: 4,
  },
  cherryHeadlineText: {
    color: '#FFFFFF', // Crisp White Text
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'left',
  },
  cherrySubtextText: {
    color: 'rgba(255, 255, 255, 0.95)', // Pale Cream White Subtext
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    textAlign: 'left',
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
