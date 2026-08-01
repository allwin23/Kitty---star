import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, HeaderTitleCard, Screen } from '@/components/ui';
import { bulletinService } from '@/features/companion/bulletin.service';
import { CompanionStage } from '@/features/companion/components/companion-stage';
import { CompanionBus } from '@/features/companion/event-bus';
import { companionMascotService } from '@/features/companion/mascot.service';
import type {
  AnnouncementItem,
  CompanionEventType,
  CompanionMascotState,
  CompanionPersonalityMode,
  CompanionPriority,
} from '@/features/companion/types';
import { palette, radius, spacing, typography } from '@/theme';

export default function CompanionScreen() {
  const router = useRouter();


  const [mascotState, setMascotState] = useState<CompanionMascotState>(
    companionMascotService.getMascotState(),
  );

  useEffect(() => {
    return companionMascotService.subscribe(setMascotState);
  }, []);

  const triggerTestEvent = (
    eventType: CompanionEventType,
    priority: CompanionPriority = 'normal',
    payload: Record<string, any> = {},
  ) => {
    CompanionBus.emit({
      eventType,
      priority,
      payload,
    });
  };

  const skinOptions = [
    { id: 'classic_cat', label: '🐱 Classic Kitty' },
    { id: 'golden_kitty', label: '🐱✨ Golden Kitty' },
    { id: 'space_explorer', label: '🐱🚀 Space Explorer' },
    { id: 'cyber_cat', label: '🐱⚡ Cyber Cat' },
  ];

  const personalityOptions: { id: CompanionPersonalityMode; label: string }[] = [
    { id: 'cheerful', label: '😊 Cheerful Buddy' },
    { id: 'strict_coach', label: '🎯 Strict Coach' },
    { id: 'zen_master', label: '☯ Zen Master' },
    { id: 'playful_buddy', label: '🥳 Playful Buddy' },
  ];

  const history = bulletinService.getHistory();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg, paddingBottom: 120 }}>
          {/* Header */}
          <HeaderTitleCard
            title="Companion Engine 🐱"
            subtitle="Live Event Simulator & Companion Mascot Sandbox"
          />

          {/* Synchronized Companion Stage */}
          <CompanionStage />

          {/* Section 1: Event Simulator / Trigger Sandbox */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <Text style={[typography.title, { color: palette.text, fontSize: 16 }]}>
                ⚡ Live Event Simulator
              </Text>
              <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                Tap any event below to dispatch real-time events to the synchronized Companion Mascot & Bulletin Board!
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                <Button
                  onPress={() =>
                    triggerTestEvent('XPEarned', 'normal', { xpAmount: 50 })
                  }
                >
                  ⭐ +50 XP
                </Button>

                <Button
                  onPress={() =>
                    triggerTestEvent('PartnerCompletedTask', 'high', {
                      partnerName: 'Alex',
                      subject: 'Physics',
                    })
                  }
                >
                  👥 Partner Done (Physics)
                </Button>

                <Button
                  onPress={() => triggerTestEvent('PomodoroComplete', 'high')}
                >
                  🍅 Pomodoro Complete
                </Button>

                <Button
                  onPress={() => triggerTestEvent('WaterBreak', 'normal')}
                >
                  💧 Water Break
                </Button>

                <Button
                  onPress={() => triggerTestEvent('DailyGoalAchieved', 'high')}
                >
                  🎯 Daily Goal Achieved
                </Button>

                <Button
                  onPress={() => triggerTestEvent('GiftUnlocked', 'high')}
                >
                  🎁 Gift Unlocked
                </Button>

                <Button
                  onPress={() => triggerTestEvent('StreakSaved', 'high', { streakDays: 7 })}
                >
                  🔥 Streak Saved (7d)
                </Button>

                <Button
                  onPress={() =>
                    triggerTestEvent('ExamTomorrow', 'critical', {
                      examName: 'Final Exam',
                    })
                  }
                >
                  🚨 CRITICAL: Exam Tomorrow
                </Button>

                <Button
                  onPress={() => triggerTestEvent('AchievementEarned', 'high', { badgeTitle: 'Master Scholar' })}
                >
                  🏆 Achievement Earned
                </Button>

                <Button
                  onPress={() => triggerTestEvent('WelcomeBack', 'normal')}
                >
                  👋 Welcome Back
                </Button>

                <Button
                  onPress={() => triggerTestEvent('GoodNight', 'normal')}
                >
                  🌙 Good Night
                </Button>

                <Button
                  onPress={() => triggerTestEvent('MissionFailed', 'normal')}
                >
                  💔 Mission Failed
                </Button>
              </View>
            </View>
          </Card>

          {/* Section 2: Companion Skins & Personality Modes */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <Text style={[typography.title, { color: palette.text, fontSize: 16 }]}>
                🎨 Mascot Skins & Personality Modes
              </Text>

              {/* Skins */}
              <Text style={{ color: palette.text, fontWeight: '600', fontSize: 14 }}>
                Active Mascot Skin
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {skinOptions.map((s) => {
                  const active = mascotState.activeSkin === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => companionMascotService.setSkin(s.id)}
                      style={{
                        backgroundColor: active ? palette.primary : palette.surface,
                        borderColor: active ? palette.primary : palette.border,
                        borderWidth: 1,
                        borderRadius: radius.md,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.xs,
                      }}
                    >
                      <Text style={{ color: active ? palette.primaryText : palette.text, fontSize: 13, fontWeight: '700' }}>
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Personality Modes */}
              <Text style={{ color: palette.text, fontWeight: '600', fontSize: 14, marginTop: spacing.xs }}>
                Companion Personality Mode
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {personalityOptions.map((p) => {
                  const active = mascotState.personalityMode === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => companionMascotService.setPersonalityMode(p.id)}
                      style={{
                        backgroundColor: active ? palette.primary : palette.surface,
                        borderColor: active ? palette.primary : palette.border,
                        borderWidth: 1,
                        borderRadius: radius.md,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.xs,
                      }}
                    >
                      <Text style={{ color: active ? palette.primaryText : palette.text, fontSize: 13, fontWeight: '700' }}>
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
