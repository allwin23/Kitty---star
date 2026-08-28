import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle,
  Award,
  Compass,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react-native';

import { Button, Card, HeaderTitleCard, Screen } from '@/components/ui';
import { palette, spacing, radius, fonts } from '@/theme';
import urgeData from '@/urge.json';
import { supabase } from '@/lib/supabase';
import { useGrowthAnimStore } from '@/stores/growth-anim-store';
import { CompanionBus } from '@/features/companion/event-bus';

interface UrgeActivity {
  id: number;
  activity: string;
  focus: string;
  duration_minutes: number;
}

export default function UrgeControlScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // State
  const [selectedActivity, setSelectedActivity] = useState<UrgeActivity | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(1);
  const [motivationQuote, setMotivationQuote] = useState('');

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Animations
  const diceRotate = useRef(new Animated.Value(0)).current;
  const diceScale = useRef(new Animated.Value(1)).current;
  const timerInterval = useRef<any>(null);

  // Pick a random motivation quote on mount
  useEffect(() => {
    const quotes = urgeData.motivation_quotes;
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setMotivationQuote(randomQuote);
  }, []);

  // Timer Tick handler
  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      timerInterval.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            if (timerInterval.current) clearInterval(timerInterval.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerInterval.current) clearInterval(timerInterval.current);
    }

    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [timerActive, timerSeconds]);

  // Roll Dice animation and handler
  const handleRollDice = () => {
    if (isRolling) return;

    setIsRolling(true);
    setSelectedActivity(null);
    setIsCompleted(false);
    setTimerActive(false);

    // Pick new random quote
    const quotes = urgeData.motivation_quotes;
    setMotivationQuote(quotes[Math.floor(Math.random() * quotes.length)]);

    // Start rolling animation
    diceRotate.setValue(0);
    Animated.parallel([
      Animated.timing(diceRotate, {
        toValue: 8, // 8 full spins
        duration: 1200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(diceScale, { toValue: 1.3, duration: 200, useNativeDriver: true }),
        Animated.timing(diceScale, { toValue: 0.9, duration: 800, useNativeDriver: true }),
        Animated.timing(diceScale, { toValue: 1.0, duration: 200, useNativeDriver: true }),
      ]),
    ]).start(() => {
      // Pick a random activity
      const acts = urgeData.activities;
      const chosen = acts[Math.floor(Math.random() * acts.length)];
      setSelectedActivity(chosen);
      setTimerSeconds(chosen.duration_minutes * 60);
      setIsRolling(false);
    });

    // Spin dice value rapidly
    let count = 0;
    const valInterval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 12) clearInterval(valInterval);
    }, 90);
  };

  // Complete Activity Action
  const handleCompleteActivity = async () => {
    if (!selectedActivity || isSaving) return;
    setIsSaving(true);

    try {
      // Call Supabase RPC to award 1 XP (stingy!)
      const { error } = await (supabase as any).rpc('award_module_xp', {
        p_rule_code: 'urge_controlled',
      });

      if (error) throw error;

      // Invalidate stats queries
      void queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
      void queryClient.invalidateQueries({ queryKey: ['journey'] });

      // Trigger UI flying XP
      useGrowthAnimStore.getState().queueXp(1);

      // Emit Companion Events
      CompanionBus.emit({
        eventType: 'XPEarned',
        priority: 'normal',
        payload: {
          xpAmount: 1,
          customText: `Urge controlled! You completed: "${selectedActivity.activity}" (+1 XP)`,
        },
      });

      setIsCompleted(true);
      setTimerActive(false);
    } catch (err) {
      console.error('Error awarding urge controlled XP:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper: format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  // Spin interpolation
  const spinVal = diceRotate.interpolate({
    inputRange: [0, 8],
    outputRange: ['0deg', '2880deg'],
  });

  // Render standard dice dots
  const renderDiceDots = (val: number) => {
    const dotPositions: Record<number, number[]> = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };

    const activeDots = dotPositions[val] || [4];

    return (
      <View style={styles.diceGrid}>
        {Array.from({ length: 9 }).map((_, idx) => (
          <View key={idx} style={styles.diceCell}>
            {activeDots.includes(idx) && <View style={styles.diceDot} />}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={palette.danger} strokeWidth={2.4} />
          </Pressable>
          <Text style={styles.titleText}>Urge Control</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Motivational quote display */}
        {motivationQuote ? (
          <Card style={styles.quoteCard}>
            <Text style={styles.quoteLabel}>Breathe & Surf</Text>
            <Text style={styles.quoteText}>"{motivationQuote}"</Text>
          </Card>
        ) : null}

        {/* Urge Surfing Reminder Guide */}
        <Card style={styles.surfingGuideCard}>
          <View style={styles.surfingHeader}>
            <Compass size={18} color={palette.cherryBloom} />
            <Text style={styles.surfingTitle}>{urgeData.urge_surfing_reminder.title}</Text>
          </View>
          <Text style={styles.surfingMessage}>{urgeData.urge_surfing_reminder.message}</Text>

          <View style={styles.stepsContainer}>
            {urgeData.urge_surfing_reminder.steps.map((step, idx) => (
              <View key={idx} style={styles.stepRow}>
                <Text style={styles.stepNum}>{idx + 1}.</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Dice Rolling Zone */}
        <View style={styles.diceContainer}>
          <Animated.View
            style={[
              styles.diceCard,
              {
                transform: [{ rotate: spinVal }, { scale: diceScale }],
              },
            ]}
          >
            {renderDiceDots(diceValue)}
          </Animated.View>

          <Button
            variant="primary"
            onPress={handleRollDice}
            disabled={isRolling}
            style={styles.rollButton}
          >
            {isRolling ? 'Rolling...' : 'Roll Battle Dice'}
          </Button>
        </View>

        {/* Selected Activity Result */}
        {selectedActivity && (
          <Card style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <Award size={20} color={palette.danger} />
              <Text style={styles.activityBadge}>Activity #{selectedActivity.id}</Text>
            </View>

            <Text style={styles.activityText}>{selectedActivity.activity}</Text>
            <Text style={styles.activityFocus}>🎯 Focus: {selectedActivity.focus}</Text>
            <Text style={styles.activityDuration}>
              ⏱ Duration: {selectedActivity.duration_minutes} min
            </Text>

            {/* Timer Controller */}
            <View style={styles.timerZone}>
              <Text style={styles.timerDigits}>{formatTime(timerSeconds)}</Text>

              <View style={styles.timerControls}>
                <Pressable
                  onPress={() => setTimerActive(!timerActive)}
                  style={[styles.timerIconBtn, timerActive && styles.timerIconBtnActive]}
                >
                  {timerActive ? (
                    <Pause size={18} color={palette.cherryBloom} strokeWidth={2.4} />
                  ) : (
                    <Play size={18} color="#FFFFFF" strokeWidth={2.4} />
                  )}
                </Pressable>

                <Pressable
                  onPress={() => {
                    setTimerActive(false);
                    setTimerSeconds(selectedActivity.duration_minutes * 60);
                  }}
                  style={styles.timerResetBtn}
                >
                  <RotateCcw size={16} color={palette.textSecondary} strokeWidth={2.2} />
                </Pressable>
              </View>
            </View>

            {/* Done Action */}
            {isCompleted ? (
              <View style={styles.completedZone}>
                <CheckCircle size={28} color={palette.success || '#4CAF50'} />
                <Text style={styles.completedText}>Urge Controlled! Wave Surfed. (+1 XP)</Text>
              </View>
            ) : (
              <Button
                variant="white"
                onPress={handleCompleteActivity}
                disabled={isSaving}
                style={styles.completeBtn}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={palette.danger} />
                ) : (
                  'I completed this activity'
                )}
              </Button>
            )}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.md,
    paddingBottom: 140,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  backButton: {
    backgroundColor: 'rgba(255, 243, 245, 0.9)',
    borderColor: 'rgba(250, 215, 224, 0.9)',
    borderWidth: 1.5,
    borderRadius: radius.full,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: fonts.mascot,
  },
  quoteCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  quoteLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  quoteText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },
  surfingGuideCard: {
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: 'rgba(250, 215, 224, 0.9)',
  },
  surfingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  surfingTitle: {
    color: palette.cherryBloom,
    fontSize: 15,
    fontWeight: '800',
  },
  surfingMessage: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  stepsContainer: {
    gap: 6,
    borderTopColor: 'rgba(232, 77, 114, 0.1)',
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepNum: {
    color: palette.cherryBloom,
    fontSize: 12,
    fontWeight: '800',
    width: 15,
  },
  stepText: {
    color: palette.textPrimary,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  diceContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.md,
  },
  diceCard: {
    width: 100,
    height: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(232, 77, 114, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#C73A57',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 6px 16px rgba(199, 58, 87, 0.25)',
      },
    }),
  },
  diceGrid: {
    width: 70,
    height: 70,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  diceCell: {
    width: '33.33%',
    height: '33.33%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  diceDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#C73A57',
  },
  rollButton: {
    width: '60%',
    borderRadius: radius.pill,
  },
  activityCard: {
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(232, 77, 114, 0.25)',
    borderWidth: 1.5,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  activityBadge: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  activityText: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  activityFocus: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityDuration: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  timerZone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 243, 245, 0.6)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(232, 77, 114, 0.1)',
  },
  timerDigits: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.cherryBloom,
    fontFamily: fonts.mono,
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timerIconBtn: {
    backgroundColor: palette.cherryBloom,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerIconBtnActive: {
    backgroundColor: 'rgba(232, 77, 114, 0.15)',
    borderWidth: 1.5,
    borderColor: palette.cherryBloom,
  },
  timerResetBtn: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBtn: {
    borderColor: 'rgba(232, 77, 114, 0.35)',
  },
  completedZone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.25)',
  },
  completedText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '800',
  },
});
