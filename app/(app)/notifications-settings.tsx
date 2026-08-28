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
  ActivityIndicator,
  Modal,
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
  Laptop,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button, Card, HeaderTitleCard, Loading, Screen } from '@/components/ui';
import { NotificationEngine } from '@/features/notifications/engine';
import type { NotificationPreferences } from '@/features/notifications/types';
import { useAuthStore, useAppBlockStore, useChromeBlockerStore, usePomodoroStore } from '@/stores';
import { useNotificationStore } from '@/stores/notification-store';
import { palette, radius, spacing } from '@/theme';
import { focusProfilesService, type FocusProfile } from '@/lib/focus-profiles-service';
import { focusLockSyncService } from '@/lib/focus-lock-sync';

const { AppBlocker } = NativeModules;

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const { preferences, fetchPreferences, updatePreferences } = useNotificationStore();

  const [testingPush, setTestingPush] = useState(false);

  const { blockedPackages, isBlockerEnabled, setBlockedPackages, setBlockerEnabled } =
    useAppBlockStore();
  const [apps, setApps] = useState<{ name: string; packageName: string }[]>([]);
  const [search, setSearch] = useState('');
  const [usagePermission, setUsagePermission] = useState(false);
  const [overlayPermission, setOverlayPermission] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);

  // Chrome Blocker settings state
  const {
    isChromeSyncEnabled,
    blockedCategories,
    customDomains,
    strictMode,
    studyEmail,
    setChromeSyncEnabled,
    setBlockedCategories,
    setCustomDomains,
    setStrictMode,
    setStudyEmail,
  } = useChromeBlockerStore();

  const { isRunning, setDurationMinutes } = usePomodoroStore();

  // Focus Profiles state & query
  const [profilesModalVisible, setProfilesModalVisible] = useState(false);
  const [profileEditorVisible, setProfileEditorVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState<FocusProfile | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Profile Editor form states
  const [editorName, setEditorName] = useState('');
  const [editorDuration, setEditorDuration] = useState(25);
  const [editorCategories, setEditorCategories] = useState<string[]>([]);
  const [editorCustomDomains, setEditorCustomDomains] = useState<string[]>([]);
  const [editorStrict, setEditorStrict] = useState(false);

  const profilesQuery = useQuery({
    queryKey: ['focus_profiles'],
    queryFn: () => focusProfilesService.fetchProfiles(),
    enabled: !!user,
  });

  const seedProfilesMutation = useMutation({
    mutationFn: async () => {
      const defaults = [
        {
          name: 'Deep Work',
          duration: 45,
          categories: ['social', 'video'],
          strict: true,
          domains: [],
        },
        {
          name: 'Coding',
          duration: 50,
          categories: ['social', 'shopping'],
          strict: false,
          domains: ['github.com'],
        },
        {
          name: 'Study',
          duration: 30,
          categories: ['social', 'gaming', 'shopping'],
          strict: false,
          domains: [],
        },
        {
          name: 'Reading',
          duration: 20,
          categories: ['social', 'video', 'news'],
          strict: false,
          domains: [],
        },
        {
          name: 'Exam',
          duration: 60,
          categories: ['social', 'video', 'gaming', 'shopping', 'news'],
          strict: true,
          domains: [],
        },
      ];

      for (const item of defaults) {
        await focusProfilesService.createProfile(
          item.name,
          item.duration,
          item.categories,
          item.strict,
          item.domains,
        );
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['focus_profiles'] });
    },
  });

  useEffect(() => {
    if (Platform.OS !== 'android' || !AppBlocker) return;

    let active = true;
    const checkPermissionsAndLoad = async (isFirstCheck = false) => {
      try {
        const hasUsage = await AppBlocker.isUsageStatsPermissionGranted();
        const hasOverlay = await AppBlocker.isOverlayPermissionGranted();

        if (active) {
          setUsagePermission(hasUsage);
          setOverlayPermission(hasOverlay);

          if (hasUsage && hasOverlay) {
            if (isBlockerEnabled) {
              setLoadingApps(true);
              const installed = await AppBlocker.getInstalledApps();
              const sorted = installed.sort((a: any, b: any) => a.name.localeCompare(b.name));
              setApps(sorted);
              setLoadingApps(false);
            }
          } else if (isFirstCheck && isBlockerEnabled) {
            // Automatically prompt permissions on enabling blocker settings if missing
            if (!hasUsage) {
              AppBlocker.requestUsageStatsPermission();
            } else if (!hasOverlay) {
              AppBlocker.requestOverlayPermission();
            }
          }
        }
      } catch (err) {
        console.error('Error loading blocker settings:', err);
      }
    };

    void checkPermissionsAndLoad(true);

    const interval = setInterval(() => checkPermissionsAndLoad(false), 2000);
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

    Alert.alert(
      'Notification Sent',
      'A test notification was dispatched to your lock screen/device.',
    );
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            paddingRight: spacing.md,
            gap: spacing.sm,
          }}
        >
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
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: palette.danger,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}
              >
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
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: palette.danger,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}
              >
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
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: palette.danger,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}
              >
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
                    <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '600' }}>
                      Quiet Hours Start
                    </Text>
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
                    <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '600' }}>
                      Quiet Hours End
                    </Text>
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
                  Current Threshold: {Math.round(preferences.relevance_threshold * 100)}% (Higher =
                  Only important alerts)
                </Text>

                <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
                  {[0.4, 0.6, 0.8].map((th) => {
                    const selected = Math.abs(preferences.relevance_threshold - th) < 0.05;
                    const label =
                      th === 0.4
                        ? 'Low (More Alerts)'
                        : th === 0.6
                          ? 'Balanced (Default)'
                          : 'Strict (Only High)';
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
                        <Text
                          style={{
                            color: selected ? '#FFFFFF' : palette.textPrimary,
                            fontSize: 11,
                            fontWeight: '800',
                            textAlign: 'center',
                          }}
                        >
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
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
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
                    onValueChange={(val) => {
                      if (val && (Platform.OS !== 'android' || !AppBlocker)) {
                        Alert.alert(
                          'Custom Build Required',
                          'App Blocker requires custom Android native code. Please build and run a Custom Development Build using "npx expo run:android" or compile a new APK to test.',
                        );
                        return;
                      }
                      setBlockerEnabled(val);
                    }}
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
                          To block other apps, Kitty & Star needs Usage Access (to check which app
                          is open) and Display Over Other Apps (to block them).
                        </Text>

                        {!usagePermission && (
                          <Pressable
                            onPress={() => {
                              if (Platform.OS !== 'android' || !AppBlocker) {
                                Alert.alert(
                                  'Custom Build Required',
                                  'App Blocker requires custom Android native code. Please build and run a Custom Development Build using "npx expo run:android" or compile a new APK.',
                                );
                                return;
                              }
                              AppBlocker.requestUsageStatsPermission();
                            }}
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
                            onPress={() => {
                              if (Platform.OS !== 'android' || !AppBlocker) {
                                Alert.alert(
                                  'Custom Build Required',
                                  'App Blocker requires custom Android native code. Please build and run a Custom Development Build using "npx expo run:android" or compile a new APK.',
                                );
                                return;
                              }
                              AppBlocker.requestOverlayPermission();
                            }}
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
                        <Text
                          style={{
                            color: palette.textPrimary,
                            fontWeight: '800',
                            fontSize: 13,
                            marginTop: spacing.xs,
                          }}
                        >
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
                          <Text
                            style={{
                              color: palette.textSecondary,
                              fontSize: 12,
                              fontStyle: 'italic',
                              textAlign: 'center',
                              marginVertical: spacing.md,
                            }}
                          >
                            Loading installed apps...
                          </Text>
                        ) : (
                          <ScrollView
                            style={{
                              maxHeight: 200,
                              borderWidth: 1,
                              borderColor: 'rgba(250, 215, 224, 0.85)',
                              borderRadius: radius.md,
                              backgroundColor: '#FFFDFD',
                            }}
                            nestedScrollEnabled
                          >
                            {apps
                              .filter((app) =>
                                app.name.toLowerCase().includes(search.toLowerCase()),
                              )
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
                                      <Text
                                        style={{
                                          color: palette.textPrimary,
                                          fontWeight: '700',
                                          fontSize: 13,
                                        }}
                                      >
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
                                        <Text
                                          style={{
                                            color: '#FFFFFF',
                                            fontSize: 11,
                                            fontWeight: '900',
                                          }}
                                        >
                                          ✓
                                        </Text>
                                      )}
                                    </View>
                                  </Pressable>
                                );
                              })}
                            {apps.filter((app) =>
                              app.name.toLowerCase().includes(search.toLowerCase()),
                            ).length === 0 && (
                              <Text
                                style={{
                                  color: palette.textSecondary,
                                  fontSize: 12,
                                  textAlign: 'center',
                                  padding: spacing.md,
                                }}
                              >
                                No apps found.
                              </Text>
                            )}
                          </ScrollView>
                        )}

                        <Text
                          style={{
                            color: palette.textSecondary,
                            fontSize: 11,
                            fontStyle: 'italic',
                          }}
                        >
                          Selected: {blockedPackages.length} app(s) to block.
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </View>
            </Card>
          )}

          {/* Chrome Focus Lock Card */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Laptop size={18} color={palette.danger} strokeWidth={2.2} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: palette.danger,
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                    }}
                  >
                    CHROME FOCUS LOCK
                  </Text>
                </View>
                <Switch
                  value={isChromeSyncEnabled}
                  disabled={isRunning}
                  onValueChange={setChromeSyncEnabled}
                  trackColor={{ false: 'rgba(250, 215, 224, 0.85)', true: palette.danger }}
                  thumbColor="#ffffff"
                />
              </View>

              <Text
                style={{
                  color: palette.textSecondary,
                  fontSize: 13,
                  lineHeight: 18,
                  fontWeight: '500',
                }}
              >
                Sync focus session to your desktop browser extension (Chrome, Edge, Brave) to block
                distracting websites.
              </Text>

              {isChromeSyncEnabled && (
                <View style={{ gap: spacing.md, marginTop: spacing.xs }}>
                  {/* Focus Profile Selection */}
                  <View style={{ gap: spacing.sm }}>
                    <Text style={{ color: palette.textPrimary, fontWeight: '700', fontSize: 12 }}>
                      Focus Profile:
                    </Text>
                    <Pressable
                      disabled={isRunning}
                      onPress={() => setProfilesModalVisible(true)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderColor: 'rgba(232, 77, 114, 0.25)',
                        borderWidth: 1.5,
                        borderRadius: radius.md,
                        paddingHorizontal: spacing.md,
                        paddingVertical: 10,
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <Text style={{ color: palette.textPrimary, fontSize: 13, fontWeight: '600' }}>
                        {selectedProfileId
                          ? profilesQuery.data?.find((p) => p.id === selectedProfileId)?.name ||
                            'Custom Setup'
                          : 'Custom Setup (No Profile Selected)'}
                      </Text>
                      <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 12 }}>
                        MANAGE
                      </Text>
                    </Pressable>
                  </View>

                  {/* Study profile email selection for YouTube exemption */}
                  <View style={{ gap: spacing.sm }}>
                    <Text style={{ color: palette.textPrimary, fontWeight: '700', fontSize: 12 }}>
                      Study Profile Google Email (for YouTube Access):
                    </Text>
                    <TextInput
                      style={{
                        borderColor: 'rgba(232, 77, 114, 0.25)',
                        borderWidth: 1.5,
                        borderRadius: radius.md,
                        color: palette.textPrimary,
                        paddingHorizontal: spacing.md,
                        paddingVertical: 8,
                        fontSize: 13,
                        backgroundColor: '#FFFFFF',
                      }}
                      placeholder="e.g. user@study.edu"
                      keyboardType="email-address"
                      value={studyEmail}
                      editable={!isRunning}
                      onChangeText={async (val) => {
                        setStudyEmail(val);
                        try {
                          await focusLockSyncService.updateStudyEmail(val);
                        } catch (e: any) {
                          console.warn('Failed to sync study email:', e.message);
                        }
                      }}
                    />
                    <Text style={{ color: palette.textSecondary, fontSize: 11 }}>
                      If the extension profile email matches, YouTube is allowed during focus.
                    </Text>
                  </View>

                  {/* Categories to Block */}
                  <View style={{ gap: spacing.sm }}>
                    <Text style={{ color: palette.textPrimary, fontWeight: '700', fontSize: 12 }}>
                      Categories to Block:
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                      {['social', 'video', 'gaming', 'shopping', 'news'].map((cat) => {
                        const isSelected = blockedCategories.includes(cat);
                        return (
                          <Pressable
                            key={cat}
                            disabled={isRunning}
                            onPress={() => {
                              if (isSelected) {
                                setBlockedCategories(blockedCategories.filter((c) => c !== cat));
                              } else {
                                setBlockedCategories([...blockedCategories, cat]);
                              }
                            }}
                            style={{
                              backgroundColor: isSelected
                                ? 'rgba(232, 77, 114, 0.12)'
                                : 'transparent',
                              borderColor: isSelected ? palette.danger : 'rgba(232, 77, 114, 0.25)',
                              borderWidth: 1.5,
                              borderRadius: radius.sm,
                              paddingHorizontal: spacing.sm,
                              paddingVertical: 6,
                            }}
                          >
                            <Text
                              style={{
                                color: isSelected ? palette.danger : palette.textPrimary,
                                fontWeight: '700',
                                fontSize: 12,
                              }}
                            >
                              {cat.toUpperCase()}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Custom Domains */}
                  <View style={{ gap: spacing.xs }}>
                    <Text style={{ color: palette.textPrimary, fontWeight: '700', fontSize: 12 }}>
                      Custom Domains (comma separated):
                    </Text>
                    <TextInput
                      editable={!isRunning}
                      style={{
                        borderColor: 'rgba(232, 77, 114, 0.25)',
                        borderWidth: 1.5,
                        borderRadius: radius.md,
                        color: palette.textPrimary,
                        paddingHorizontal: spacing.md,
                        paddingVertical: 8,
                        fontSize: 12,
                        backgroundColor: isRunning ? 'rgba(255, 243, 245, 0.35)' : '#FFFFFF',
                      }}
                      placeholder="e.g. news.ycombinator.com, dev.to"
                      placeholderTextColor={palette.textSecondary}
                      value={customDomains.join(', ')}
                      onChangeText={(val) => {
                        const list = val
                          .split(',')
                          .map((d) => d.trim())
                          .filter((d) => d.length > 0);
                        setCustomDomains(list);
                      }}
                    />
                  </View>

                  {/* Strict Mode switch */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: spacing.xs,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text style={{ color: palette.textPrimary, fontWeight: '700', fontSize: 12 }}>
                        Strict Mode
                      </Text>
                      <Text style={{ color: palette.textSecondary, fontSize: 11 }}>
                        Cannot pause or stop the timer once started.
                      </Text>
                    </View>
                    <Switch
                      value={strictMode}
                      disabled={isRunning}
                      onValueChange={setStrictMode}
                      trackColor={{ false: 'rgba(250, 215, 224, 0.85)', true: palette.danger }}
                      thumbColor="#ffffff"
                    />
                  </View>
                </View>
              )}
            </View>
          </Card>

          {/* Focus Profiles Management Modal */}
          <Modal
            visible={profilesModalVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setProfilesModalVisible(false)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.6)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: spacing.md,
              }}
            >
              <View
                style={{
                  width: '100%',
                  maxHeight: '80%',
                  backgroundColor: '#FFF7F8',
                  borderRadius: radius.lg,
                  borderWidth: 1.5,
                  borderColor: palette.danger,
                  padding: spacing.md,
                  gap: spacing.sm,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: palette.danger }}>
                    MANAGE FOCUS PROFILES
                  </Text>
                  <Pressable onPress={() => setProfilesModalVisible(false)}>
                    <X size={20} color={palette.textPrimary} />
                  </Pressable>
                </View>

                {profilesQuery.isLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={palette.danger}
                    style={{ marginVertical: spacing.lg }}
                  />
                ) : (
                  <ScrollView style={{ flexGrow: 0, maxHeight: 350 }} nestedScrollEnabled>
                    {profilesQuery.data && profilesQuery.data.length > 0 ? (
                      profilesQuery.data.map((profile) => (
                        <View
                          key={profile.id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderColor: 'rgba(232, 77, 114, 0.15)',
                            borderWidth: 1.5,
                            borderRadius: radius.md,
                            padding: spacing.sm,
                            marginBottom: spacing.xs,
                            gap: spacing.xs,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Text
                              style={{
                                fontWeight: '800',
                                fontSize: 14,
                                color: palette.textPrimary,
                              }}
                            >
                              {profile.name}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                              <Pressable
                                onPress={() => {
                                  setSelectedProfileId(profile.id);
                                  setDurationMinutes(profile.duration_minutes);
                                  setBlockedCategories(profile.blocked_categories);
                                  setCustomDomains(profile.custom_domains);
                                  setStrictMode(profile.strict_mode);
                                  setProfilesModalVisible(false);
                                }}
                                style={{
                                  backgroundColor: palette.danger,
                                  borderRadius: radius.sm,
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                }}
                              >
                                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                                  SELECT
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => {
                                  setEditingProfile(profile);
                                  setEditorName(profile.name);
                                  setEditorDuration(profile.duration_minutes);
                                  setEditorCategories(profile.blocked_categories);
                                  setEditorCustomDomains(profile.custom_domains);
                                  setEditorStrict(profile.strict_mode);
                                  setProfileEditorVisible(true);
                                }}
                                style={{
                                  backgroundColor: 'rgba(232, 77, 114, 0.1)',
                                  borderRadius: radius.sm,
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderColor: palette.danger,
                                  borderWidth: 1,
                                }}
                              >
                                <Text
                                  style={{ color: palette.danger, fontSize: 11, fontWeight: '700' }}
                                >
                                  EDIT
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => {
                                  Alert.alert(
                                    'Delete profile?',
                                    `Are you sure you want to delete profile "${profile.name}"?`,
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      {
                                        text: 'Delete',
                                        style: 'destructive',
                                        onPress: async () => {
                                          try {
                                            await focusProfilesService.deleteProfile(profile.id);
                                            if (selectedProfileId === profile.id) {
                                              setSelectedProfileId(null);
                                            }
                                            void profilesQuery.refetch();
                                          } catch (e: any) {
                                            Alert.alert('Error', e.message);
                                          }
                                        },
                                      },
                                    ],
                                  );
                                }}
                                style={{
                                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                  borderRadius: radius.sm,
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                }}
                              >
                                <Text
                                  style={{
                                    color: palette.textPrimary,
                                    fontSize: 11,
                                    fontWeight: '700',
                                  }}
                                >
                                  DEL
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                          <Text style={{ fontSize: 12, color: palette.textSecondary }}>
                            Duration: {profile.duration_minutes}m | Strict:{' '}
                            {profile.strict_mode ? 'Yes' : 'No'} | Categories:{' '}
                            {profile.blocked_categories.join(', ') || 'none'}
                          </Text>
                          {profile.custom_domains.length > 0 && (
                            <Text
                              style={{ fontSize: 11, color: palette.textSecondary }}
                              numberOfLines={1}
                            >
                              Custom: {profile.custom_domains.join(', ')}
                            </Text>
                          )}
                        </View>
                      ))
                    ) : (
                      <View
                        style={{
                          paddingVertical: spacing.md,
                          alignItems: 'center',
                          gap: spacing.sm,
                        }}
                      >
                        <Text
                          style={{
                            color: palette.textSecondary,
                            fontSize: 13,
                            textAlign: 'center',
                          }}
                        >
                          No profiles configured yet.
                        </Text>
                        <Button
                          variant="secondary"
                          onPress={() => seedProfilesMutation.mutate()}
                          style={{ minWidth: 150 }}
                        >
                          {seedProfilesMutation.isPending ? 'Seeding...' : 'Seed Default Profiles'}
                        </Button>
                      </View>
                    )}
                  </ScrollView>
                )}

                <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
                  <Button
                    variant="primary"
                    onPress={() => {
                      setEditingProfile(null);
                      setEditorName('');
                      setEditorDuration(25);
                      setEditorCategories([]);
                      setEditorCustomDomains([]);
                      setEditorStrict(false);
                      setProfileEditorVisible(true);
                    }}
                    style={{ flex: 1 }}
                  >
                    + Create New Profile
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() => setProfilesModalVisible(false)}
                    style={{ flex: 1 }}
                  >
                    Close
                  </Button>
                </View>
              </View>
            </View>
          </Modal>

          {/* Profile Editor Modal (Create/Edit) */}
          <Modal
            visible={profileEditorVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setProfileEditorVisible(false)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.6)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: spacing.md,
              }}
            >
              <View
                style={{
                  width: '100%',
                  maxHeight: '90%',
                  backgroundColor: '#FFF7F8',
                  borderRadius: radius.lg,
                  borderWidth: 1.5,
                  borderColor: palette.danger,
                  padding: spacing.md,
                  gap: spacing.sm,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '800', color: palette.danger }}>
                  {editingProfile
                    ? `EDIT PROFILE: ${editingProfile.name}`
                    : 'CREATE NEW FOCUS PROFILE'}
                </Text>

                <ScrollView style={{ flexGrow: 0, maxHeight: 400 }} nestedScrollEnabled>
                  <View style={{ gap: spacing.md }}>
                    <View style={{ gap: spacing.xs }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: palette.textPrimary }}>
                        Profile Name:
                      </Text>
                      <TextInput
                        style={{
                          borderColor: 'rgba(232, 77, 114, 0.25)',
                          borderWidth: 1.5,
                          borderRadius: radius.md,
                          color: palette.textPrimary,
                          paddingHorizontal: spacing.md,
                          paddingVertical: 8,
                          fontSize: 13,
                          backgroundColor: '#FFFFFF',
                        }}
                        placeholder="e.g. Exam Prep"
                        value={editorName}
                        onChangeText={setEditorName}
                      />
                    </View>

                    <View style={{ gap: spacing.xs }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: palette.textPrimary }}>
                        Default Duration (Minutes):
                      </Text>
                      <TextInput
                        style={{
                          borderColor: 'rgba(232, 77, 114, 0.25)',
                          borderWidth: 1.5,
                          borderRadius: radius.md,
                          color: palette.textPrimary,
                          paddingHorizontal: spacing.md,
                          paddingVertical: 8,
                          fontSize: 13,
                          backgroundColor: '#FFFFFF',
                        }}
                        keyboardType="numeric"
                        value={String(editorDuration)}
                        onChangeText={(val) => setEditorDuration(parseInt(val, 10) || 0)}
                      />
                    </View>

                    <View style={{ gap: spacing.sm }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: palette.textPrimary }}>
                        Categories to Block:
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                        {['social', 'video', 'gaming', 'shopping', 'news'].map((cat) => {
                          const isSelected = editorCategories.includes(cat);
                          return (
                            <Pressable
                              key={cat}
                              onPress={() => {
                                if (isSelected) {
                                  setEditorCategories(editorCategories.filter((c) => c !== cat));
                                } else {
                                  setEditorCategories([...editorCategories, cat]);
                                }
                              }}
                              style={{
                                backgroundColor: isSelected
                                  ? 'rgba(232, 77, 114, 0.12)'
                                  : 'transparent',
                                borderColor: isSelected
                                  ? palette.danger
                                  : 'rgba(232, 77, 114, 0.25)',
                                borderWidth: 1.5,
                                borderRadius: radius.sm,
                                paddingHorizontal: spacing.sm,
                                paddingVertical: 6,
                              }}
                            >
                              <Text
                                style={{
                                  color: isSelected ? palette.danger : palette.textPrimary,
                                  fontWeight: '700',
                                  fontSize: 12,
                                }}
                              >
                                {cat.toUpperCase()}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View style={{ gap: spacing.xs }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: palette.textPrimary }}>
                        Custom Domains (comma separated):
                      </Text>
                      <TextInput
                        style={{
                          borderColor: 'rgba(232, 77, 114, 0.25)',
                          borderWidth: 1.5,
                          borderRadius: radius.md,
                          color: palette.textPrimary,
                          paddingHorizontal: spacing.md,
                          paddingVertical: 8,
                          fontSize: 13,
                          backgroundColor: '#FFFFFF',
                        }}
                        placeholder="e.g. domain1.com, domain2.com"
                        value={editorCustomDomains.join(', ')}
                        onChangeText={(val) => {
                          const list = val
                            .split(',')
                            .map((d) => d.trim())
                            .filter((d) => d.length > 0);
                          setEditorCustomDomains(list);
                        }}
                      />
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: spacing.xs,
                      }}
                    >
                      <View style={{ flex: 1, marginRight: spacing.sm }}>
                        <Text
                          style={{ color: palette.textPrimary, fontWeight: '700', fontSize: 12 }}
                        >
                          Strict Mode
                        </Text>
                        <Text style={{ color: palette.textSecondary, fontSize: 11 }}>
                          Lock the session strict options.
                        </Text>
                      </View>
                      <Switch
                        value={editorStrict}
                        onValueChange={setEditorStrict}
                        trackColor={{ false: 'rgba(250, 215, 224, 0.85)', true: palette.danger }}
                        thumbColor="#ffffff"
                      />
                    </View>
                  </View>
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
                  <Button
                    variant="primary"
                    onPress={async () => {
                      try {
                        if (editingProfile) {
                          await focusProfilesService.updateProfile(
                            editingProfile.id,
                            editorName,
                            editorDuration,
                            editorCategories,
                            editorStrict,
                            editorCustomDomains,
                          );
                          if (selectedProfileId === editingProfile.id) {
                            setDurationMinutes(editorDuration);
                            setBlockedCategories(editorCategories);
                            setCustomDomains(editorCustomDomains);
                            setStrictMode(editorStrict);
                          }
                        } else {
                          const newId = await focusProfilesService.createProfile(
                            editorName,
                            editorDuration,
                            editorCategories,
                            editorStrict,
                            editorCustomDomains,
                          );
                          setSelectedProfileId(newId);
                          setDurationMinutes(editorDuration);
                          setBlockedCategories(editorCategories);
                          setCustomDomains(editorCustomDomains);
                          setStrictMode(editorStrict);
                        }
                        void profilesQuery.refetch();
                        setProfileEditorVisible(false);
                      } catch (e: any) {
                        Alert.alert('Save Failed', e.message);
                      }
                    }}
                    style={{ flex: 1 }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() => setProfileEditorVisible(false)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </ScrollView>
    </Screen>
  );
}
