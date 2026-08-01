import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Card, HeaderTitleCard, Loading, Screen } from '@/components/ui';
import { NotificationEngine } from '@/features/notifications/engine';
import type { NotificationPreferences } from '@/features/notifications/types';
import { useAuthStore } from '@/stores';
import { useNotificationStore } from '@/stores/notification-store';
import { palette, radius, spacing, typography } from '@/theme';

export default function NotificationSettingsScreen() {
  const router = useRouter();


  const user = useAuthStore((s) => s.user);
  const { preferences, fetchPreferences, updatePreferences } = useNotificationStore();

  const [saving, setSaving] = useState(false);
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
      title: '🔔 Test Notification',
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
    emoji: string,
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
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <Text style={{ color: palette.text, fontWeight: '600', fontSize: 15 }}>
            {emoji} {title}
          </Text>
          <Text style={{ color: palette.mutedText, fontSize: 12, marginTop: 2 }}>
            {description}
          </Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={(val) => toggle(key, val)}
          trackColor={{ false: palette.border, true: palette.primary }}
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
            title="Notification Preferences ⚙️"
            subtitle="Manage your alert delivery channels & notification rules"
          />

          {/* Section 1: Main Channels */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <Text style={[typography.title, { color: palette.text, fontSize: 16 }]}>
                Delivery Channels
              </Text>

              {renderToggleItem(
                'Push Notifications',
                'Lock screen & device alerts via Expo Notifications',
                'push_enabled',
                '📲',
              )}

              {renderToggleItem(
                'In-App Notification Feed',
                'Persistent in-app notification center history',
                'in_app_enabled',
                '🔔',
              )}

              <Pressable
                onPress={handleTestPush}
                disabled={testingPush}
                style={{
                  marginTop: spacing.xs,
                  backgroundColor: `${palette.primary}15`,
                  borderColor: palette.primary,
                  borderWidth: 1,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  alignItems: 'center',
                  opacity: testingPush ? 0.6 : 1,
                }}
              >
                <Text style={{ color: palette.primary, fontWeight: '700', fontSize: 13 }}>
                  {testingPush ? 'Sending Test…' : '⚡ Send Test Push Notification'}
                </Text>
              </Pressable>
            </View>
          </Card>

          {/* Section 2: Categories */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <Text style={[typography.title, { color: palette.text, fontSize: 16 }]}>
                Notification Categories
              </Text>

              {renderToggleItem(
                'Partner Activity',
                'Alerts when partner starts studying or completes tasks',
                'partner_enabled',
                '👥',
              )}

              {renderToggleItem(
                'Study & Focus Reminders',
                'Session completions, goal missed alerts, and break suggestions',
                'study_reminders_enabled',
                '📚',
              )}

              {renderToggleItem(
                'Water & Hydration',
                'Reminders to drink water and log daily hydration',
                'water_reminders_enabled',
                '💧',
              )}

              {renderToggleItem(
                'AI Study Coaching',
                'Personalized recommendations from AI Notification Brain',
                'ai_coaching_enabled',
                '🤖',
              )}

              {renderToggleItem(
                'Daily Summary Reports',
                'End-of-day reports and study day review notices',
                'daily_reports_enabled',
                '📊',
              )}

              {renderToggleItem(
                'Weekly Reports',
                '7-day performance analytics and weekly summaries',
                'weekly_reports_enabled',
                '📈',
              )}

              {renderToggleItem(
                'Achievements & Awards',
                'Badges unlocked, partner awards, and XP rewards',
                'achievement_enabled',
                '🏆',
              )}

              {renderToggleItem(
                'Social & Streaks',
                'Streak milestones and comeback alerts',
                'social_activity_enabled',
                '🔥',
              )}
            </View>
          </Card>

          {/* Section 3: Quiet Hours & AI Threshold */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <Text style={[typography.title, { color: palette.text, fontSize: 16 }]}>
                Quiet Hours & AI Intelligence
              </Text>

              {renderToggleItem(
                'Quiet Hours',
                'Suppress non-urgent notifications during scheduled rest hours',
                'quiet_hours_enabled',
                '🌙',
              )}

              {preferences.quiet_hours_enabled && (
                <View
                  style={{
                    flexDirection: 'row',
                    gap: spacing.md,
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    borderWidth: 1,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                  }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: palette.mutedText, fontSize: 12 }}>Quiet Hours Start</Text>
                    <TextInput
                      style={{
                        borderColor: palette.border,
                        borderWidth: 1,
                        borderRadius: radius.sm,
                        color: palette.text,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 4,
                        textAlign: 'center',
                        fontSize: 14,
                        fontWeight: '700',
                      }}
                      value={preferences.quiet_hours_start}
                      onChangeText={(text) => toggle('quiet_hours_start', text)}
                      placeholder="22:00"
                      placeholderTextColor={palette.mutedText}
                    />
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: palette.mutedText, fontSize: 12 }}>Quiet Hours End</Text>
                    <TextInput
                      style={{
                        borderColor: palette.border,
                        borderWidth: 1,
                        borderRadius: radius.sm,
                        color: palette.text,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 4,
                        textAlign: 'center',
                        fontSize: 14,
                        fontWeight: '700',
                      }}
                      value={preferences.quiet_hours_end}
                      onChangeText={(text) => toggle('quiet_hours_end', text)}
                      placeholder="07:00"
                      placeholderTextColor={palette.mutedText}
                    />
                  </View>
                </View>
              )}

              {/* AI Relevance Sensitivity Control */}
              <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
                <Text style={{ color: palette.text, fontWeight: '600', fontSize: 15 }}>
                  🤖 AI Relevance Sensitivity
                </Text>
                <Text style={{ color: palette.mutedText, fontSize: 12 }}>
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
                          backgroundColor: selected ? palette.primary : palette.surface,
                          borderColor: selected ? palette.primary : palette.border,
                          borderWidth: 1,
                          borderRadius: radius.md,
                          paddingVertical: spacing.sm,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: selected ? palette.primaryText : palette.text, fontSize: 11, fontWeight: '700', textAlign: 'center' }}>
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
