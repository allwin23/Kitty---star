import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  BarChart2,
  Bell,
  BookOpen,
  Bot,
  Droplets,
  Flame,
  Moon,
  Smartphone,
  TrendingUp,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

import { Card, HeaderTitleCard, Loading, Screen } from '@/components/ui';
import { NotificationEngine } from '@/features/notifications/engine';
import type { NotificationPreferences } from '@/features/notifications/types';
import { useAuthStore } from '@/stores';
import { useNotificationStore } from '@/stores/notification-store';
import { palette, radius, spacing } from '@/theme';

export default function NotificationSettingsScreen() {
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const { preferences, fetchPreferences, updatePreferences } = useNotificationStore();

  const [testingPush, setTestingPush] = useState(false);

  useEffect(() => {
    if (user?.id) {
      void fetchPreferences(user.id);
    }
  }, [user?.id, fetchPreferences]);

  if (!user || !preferences) {
    return (
      <Screen centered>
        <Loading />
      </Screen>
    );
  }

  const toggle = (key: keyof NotificationPreferences, value: any) => {
    void updatePreferences(user.id, { [key]: value });
  };

  const handleTestPush = async () => {
    setTestingPush(true);
    const granted = await NotificationEngine.requestPushPermissions();
    if (!granted) {
      Alert.alert(
        'Permission Denied',
        'Notification permissions are disabled on this device. Please enable notifications in device settings.',
      );
      setTestingPush(false);
      return;
    }

    await NotificationEngine.dispatchPushNotification({
      title: 'Test Notification',
      body: 'Your Intelligent Notification Engine is working perfectly!',
      data: { type: 'Test' },
      priority: 'high',
    });

    Alert.alert('Notification Sent', 'A test notification was dispatched to your lock screen/device.');
    setTestingPush(false);
  };

  const renderToggleItem = (
    title: string,
    description: string,
    key: keyof NotificationPreferences,
    Icon: LucideIcon,
  ) => {
    const isEnabled = Boolean(preferences[key]);
    return (
      <View
        key={String(key)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.xs,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: spacing.md, gap: spacing.sm }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: 'rgba(232, 77, 114, 0.12)',
              borderColor: 'rgba(232, 77, 114, 0.25)',
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={18} color={palette.danger} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.textPrimary, fontWeight: '800', fontSize: 15 }}>
              {title}
            </Text>
            <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 2 }}>
              {description}
            </Text>
          </View>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={(val) => toggle(key, val)}
          trackColor={{ false: 'rgba(250, 215, 224, 0.85)', true: palette.danger }}
          thumbColor="#ffffff"
        />
      </View>
    );
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg, paddingBottom: spacing['2xl'] }}>
          {/* Header */}
          <HeaderTitleCard
            title="Notification Preferences"
            subtitle="Manage your alert delivery channels & notification rules"
          />

          {/* Section 1: Main Channels */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: palette.danger, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                DELIVERY CHANNELS
              </Text>

              {renderToggleItem(
                'Push Notifications',
                'Lock screen & device alerts via Expo Notifications',
                'push_enabled',
                Smartphone,
              )}

              {renderToggleItem(
                'In-App Notification Feed',
                'Persistent in-app notification center history',
                'in_app_enabled',
                Bell,
              )}

              <Pressable
                onPress={handleTestPush}
                disabled={testingPush}
                style={{
                  marginTop: spacing.xs,
                  backgroundColor: 'rgba(255, 243, 245, 0.85)',
                  borderColor: palette.danger,
                  borderWidth: 1.5,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  alignItems: 'center',
                  opacity: testingPush ? 0.6 : 1,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Zap size={16} color={palette.danger} strokeWidth={2.4} />
                  <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 13 }}>
                    {testingPush ? 'Sending Test…' : 'Send Test Push Notification'}
                  </Text>
                </View>
              </Pressable>
            </View>
          </Card>

          {/* Section 2: Categories */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: palette.danger, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                NOTIFICATION CATEGORIES
              </Text>

              {renderToggleItem(
                'Partner Activity',
                'Alerts when partner starts studying or completes tasks',
                'partner_enabled',
                Users,
              )}

              {renderToggleItem(
                'Study & Focus Reminders',
                'Session completions, goal missed alerts, and break suggestions',
                'study_reminders_enabled',
                BookOpen,
              )}

              {renderToggleItem(
                'Water & Hydration',
                'Reminders to drink water and log daily hydration',
                'water_reminders_enabled',
                Droplets,
              )}

              {renderToggleItem(
                'AI Study Coaching',
                'Personalized recommendations from AI Notification Brain',
                'ai_coaching_enabled',
                Bot,
              )}

              {renderToggleItem(
                'Daily Summary Reports',
                'End-of-day reports and study day review notices',
                'daily_reports_enabled',
                BarChart2,
              )}

              {renderToggleItem(
                'Weekly Reports',
                '7-day performance analytics and weekly summaries',
                'weekly_reports_enabled',
                TrendingUp,
              )}

              {renderToggleItem(
                'Achievements & Awards',
                'Badges unlocked, partner awards, and XP rewards',
                'achievement_enabled',
                Trophy,
              )}

              {renderToggleItem(
                'Social & Streaks',
                'Streak milestones and comeback alerts',
                'social_activity_enabled',
                Flame,
              )}
            </View>
          </Card>

          {/* Section 3: Quiet Hours & AI Threshold */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: palette.danger, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                QUIET HOURS & AI INTELLIGENCE
              </Text>

              {renderToggleItem(
                'Quiet Hours',
                'Suppress non-urgent notifications during scheduled rest hours',
                'quiet_hours_enabled',
                Moon,
              )}

              {preferences.quiet_hours_enabled && (
                <View
                  style={{
                    flexDirection: 'row',
                    gap: spacing.md,
                    backgroundColor: 'rgba(255, 243, 245, 0.75)',
                    borderColor: 'rgba(250, 215, 224, 0.85)',
                    borderWidth: 1.5,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                  }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '600' }}>Quiet Hours Start</Text>
                    <TextInput
                      style={{
                        borderColor: 'rgba(250, 215, 224, 0.85)',
                        borderWidth: 1.5,
                        borderRadius: radius.sm,
                        color: palette.textPrimary,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 4,
                        textAlign: 'center',
                        fontSize: 14,
                        fontWeight: '800',
                        backgroundColor: '#FFFFFF',
                      }}
                      value={preferences.quiet_hours_start}
                      onChangeText={(text) => toggle('quiet_hours_start', text)}
                      placeholder="22:00"
                      placeholderTextColor={palette.textSecondary}
                    />
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '600' }}>Quiet Hours End</Text>
                    <TextInput
                      style={{
                        borderColor: 'rgba(250, 215, 224, 0.85)',
                        borderWidth: 1.5,
                        borderRadius: radius.sm,
                        color: palette.textPrimary,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 4,
                        textAlign: 'center',
                        fontSize: 14,
                        fontWeight: '800',
                        backgroundColor: '#FFFFFF',
                      }}
                      value={preferences.quiet_hours_end}
                      onChangeText={(text) => toggle('quiet_hours_end', text)}
                      placeholder="07:00"
                      placeholderTextColor={palette.textSecondary}
                    />
                  </View>
                </View>
              )}

              {/* AI Relevance Sensitivity Control */}
              <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Bot size={16} color={palette.danger} strokeWidth={2.2} />
                  <Text style={{ color: palette.textPrimary, fontWeight: '800', fontSize: 15 }}>
                    AI Relevance Sensitivity
                  </Text>
                </View>
                <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '500' }}>
                  Current Threshold: {Math.round(preferences.relevance_threshold * 100)}% (Higher = Only important alerts)
                </Text>

                <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
                  {[0.4, 0.6, 0.8].map((th) => {
                    const selected = Math.abs(preferences.relevance_threshold - th) < 0.05;
                    const label = th === 0.4 ? 'Low (More Alerts)' : th === 0.6 ? 'Balanced (Default)' : 'Strict (Only High)';
                    return (
                      <Pressable
                        key={th}
                        onPress={() => toggle('relevance_threshold', th)}
                        style={{
                          flex: 1,
                          backgroundColor: selected ? palette.danger : 'rgba(255, 243, 245, 0.85)',
                          borderColor: selected ? palette.danger : 'rgba(250, 215, 224, 0.85)',
                          borderWidth: 1.5,
                          borderRadius: radius.md,
                          paddingVertical: spacing.sm,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: selected ? '#FFFFFF' : palette.textPrimary, fontSize: 11, fontWeight: '800', textAlign: 'center' }}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
