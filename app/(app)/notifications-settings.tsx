import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  Platform,
  NativeModules,
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
import { useAuthStore, useAppBlockStore } from '@/stores';
import { useNotificationStore } from '@/stores/notification-store';
import { palette, radius, spacing } from '@/theme';

const { AppBlocker } = NativeModules;

export default function NotificationSettingsScreen() {
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const { preferences, fetchPreferences, updatePreferences } = useNotificationStore();

  const [testingPush, setTestingPush] = useState(false);

  const { blockedPackages, isBlockerEnabled, setBlockedPackages, setBlockerEnabled } = useAppBlockStore();
  const [apps, setApps] = useState<{ name: string; packageName: string }[]>([]);
  const [search, setSearch] = useState('');
  const [usagePermission, setUsagePermission] = useState(false);
  const [overlayPermission, setOverlayPermission] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android' || !AppBlocker) return;

    let active = true;
    const checkPermissionsAndLoad = async () => {
      try {
        const hasUsage = await AppBlocker.isUsageStatsPermissionGranted();
        const hasOverlay = await AppBlocker.isOverlayPermissionGranted();

        if (active) {
          setUsagePermission(hasUsage);
          setOverlayPermission(hasOverlay);

          if (hasUsage && hasOverlay && isBlockerEnabled) {
            setLoadingApps(true);
            const installed = await AppBlocker.getInstalledApps();
            const sorted = installed.sort((a: any, b: any) => a.name.localeCompare(b.name));
            setApps(sorted);
            setLoadingApps(false);
          }
        }
      } catch (err) {
        console.error('Error loading blocker settings:', err);
      }
    };

    void checkPermissionsAndLoad();

    const interval = setInterval(checkPermissionsAndLoad, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isBlockerEnabled]);

  const togglePackage = (packageName: string) => {
    if (blockedPackages.includes(packageName)) {
      setBlockedPackages(blockedPackages.filter((pkg) => pkg !== packageName));
    } else {
      setBlockedPackages([...blockedPackages, packageName]);
    }
  };

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
        <View style={{ gap: spacing.lg, paddingBottom: 120 }}>
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

          {Platform.OS === 'android' && (
            <Card>
              <View style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
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
                      <Smartphone size={18} color={palette.danger} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: palette.textPrimary, fontWeight: '800', fontSize: 15 }}>
                        App Blocker (Focus Mode)
                      </Text>
                      <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 2 }}>
                        Banned apps will be blocked during Pomodoro focus sessions.
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isBlockerEnabled}
                    onValueChange={setBlockerEnabled}
                    trackColor={{ false: 'rgba(250, 215, 224, 0.85)', true: palette.danger }}
                    thumbColor="#ffffff"
                  />
                </View>

                {isBlockerEnabled && (
                  <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
                    {(!usagePermission || !overlayPermission) && (
                      <View
                        style={{
                          backgroundColor: '#FFFBEB',
                          borderColor: '#FDE68A',
                          borderWidth: 1.5,
                          borderRadius: radius.md,
                          padding: spacing.md,
                          gap: spacing.sm,
                        }}
                      >
                        <Text style={{ color: '#B45309', fontWeight: '800', fontSize: 13 }}>
                          Required Permissions
                        </Text>
                        <Text style={{ color: '#B45309', fontSize: 12, lineHeight: 18 }}>
                          To block other apps, Kitty & Star needs Usage Access (to check which app is open) and Display Over Other Apps (to block them).
                        </Text>

                        {!usagePermission && (
                          <Pressable
                            onPress={() => AppBlocker?.requestUsageStatsPermission()}
                            style={{
                              backgroundColor: '#B45309',
                              borderRadius: radius.sm,
                              paddingVertical: 8,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>
                              Grant Usage Access Permission
                            </Text>
                          </Pressable>
                        )}

                        {!overlayPermission && (
                          <Pressable
                            onPress={() => AppBlocker?.requestOverlayPermission()}
                            style={{
                              backgroundColor: '#B45309',
                              borderRadius: radius.sm,
                              paddingVertical: 8,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>
                              Grant Draw Over Other Apps Permission
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    )}

                    {usagePermission && overlayPermission && (
                      <>
                        <Text style={{ color: palette.textPrimary, fontWeight: '800', fontSize: 13, marginTop: spacing.xs }}>
                          Select Apps to Block
                        </Text>

                        <TextInput
                          style={{
                            borderColor: 'rgba(250, 215, 224, 0.85)',
                            borderWidth: 1.5,
                            borderRadius: radius.md,
                            color: palette.textPrimary,
                            paddingHorizontal: spacing.md,
                            paddingVertical: 8,
                            fontSize: 14,
                            backgroundColor: '#FFFFFF',
                          }}
                          placeholder="Search apps..."
                          placeholderTextColor={palette.textSecondary}
                          value={search}
                          onChangeText={setSearch}
                        />

                        {loadingApps ? (
                          <Text style={{ color: palette.textSecondary, fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginVertical: spacing.md }}>
                            Loading installed apps...
                          </Text>
                        ) : (
                          <ScrollView
                            style={{ maxHeight: 200, borderWidth: 1, borderColor: 'rgba(250, 215, 224, 0.85)', borderRadius: radius.md, backgroundColor: '#FFFDFD' }}
                            nestedScrollEnabled
                          >
                            {apps
                              .filter((app) => app.name.toLowerCase().includes(search.toLowerCase()))
                              .map((app) => {
                                const isBlocked = blockedPackages.includes(app.packageName);
                                return (
                                  <Pressable
                                    key={app.packageName}
                                    onPress={() => togglePackage(app.packageName)}
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      paddingVertical: 10,
                                      paddingHorizontal: spacing.md,
                                      borderBottomWidth: 1,
                                      borderBottomColor: 'rgba(250, 215, 224, 0.40)',
                                    }}
                                  >
                                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                                      <Text style={{ color: palette.textPrimary, fontWeight: '700', fontSize: 13 }}>
                                        {app.name}
                                      </Text>
                                      <Text style={{ color: palette.textSecondary, fontSize: 11 }}>
                                        {app.packageName}
                                      </Text>
                                    </View>
                                    <View
                                      style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 6,
                                        borderWidth: 2,
                                        borderColor: isBlocked ? palette.danger : palette.textMuted,
                                        backgroundColor: isBlocked ? palette.danger : 'transparent',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      {isBlocked && (
                                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900' }}>
                                          ✓
                                        </Text>
                                      )}
                                    </View>
                                  </Pressable>
                                );
                              })}
                            {apps.filter((app) => app.name.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                              <Text style={{ color: palette.textSecondary, fontSize: 12, textAlign: 'center', padding: spacing.md }}>
                                No apps found.
                              </Text>
                            )}
                          </ScrollView>
                        )}

                        <Text style={{ color: palette.textSecondary, fontSize: 11, fontStyle: 'italic' }}>
                          Selected: {blockedPackages.length} app(s) to block.
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
