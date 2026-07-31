import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { Button } from './ui/button';
import { Card } from './ui/card';

// Interfaces
export interface WaterLog {
  id: string;
  amount_ml: number;
  logged_at: string;
}

export interface WaterDailyStats {
  id: string;
  date: string;
  total_ml: number;
  goal_ml: number;
  goal_completed: boolean;
  current_streak: number;
}

// 1. WaterProgressCard component
export function WaterProgressCard({
  totalMl,
  goalMl,
}: {
  totalMl: number;
  goalMl: number;
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  
  const percentage = Math.min(Math.round((totalMl / goalMl) * 100), 100);
  const remaining = Math.max(goalMl - totalMl, 0);

  return (
    <Card style={[styles.progressCard, { borderColor: palette.border }]}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Text style={{ fontSize: 48 }}>💧</Text>
        <Text style={{ fontSize: 20, fontWeight: '800', color: palette.text }}>
          {"Today's Hydration"}
        </Text>
        
        {/* Fill Percentage Circular/Dial Style representation */}
        <View style={styles.statsValueContainer}>
          <Text style={[styles.statsValueText, { color: palette.primary }]}>
            {totalMl} <Text style={{ fontSize: 16, color: palette.mutedText }}>/ {goalMl} ml</Text>
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarBg, { backgroundColor: palette.border }]}>
            <View style={[styles.progressBarFill, { backgroundColor: '#3B82F6', width: `${percentage}%` }]} />
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: palette.text, textAlign: 'center' }}>
            {percentage}% Completed
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.border, marginVertical: 4 }]} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: palette.text }}>
              {remaining} ml
            </Text>
            <Text style={{ fontSize: 11, color: palette.mutedText }}>Remaining</Text>
          </View>
          <View style={{ width: 1, backgroundColor: palette.border, height: '80%' }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#10B981' }}>
              {percentage >= 100 ? 'Goal Achieved!' : 'Keep Drinking!'}
            </Text>
            <Text style={{ fontSize: 11, color: palette.mutedText }}>Status</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

// 2. QuickAddButton component
export function QuickAddButton({
  amount,
  onPress,
}: {
  amount: number;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const getEmoji = (amt: number) => {
    if (amt <= 150) return '🥛';
    if (amt <= 250) return '☕';
    if (amt <= 400) return '🥤';
    if (amt <= 600) return '🍼';
    return '🫙';
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAddBtn,
        {
          borderColor: palette.border,
          backgroundColor: pressed ? palette.border : palette.surface,
        },
      ]}
    >
      <Text style={{ fontSize: 20, marginBottom: 4 }}>{getEmoji(amount)}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: palette.text }}>
        +{amount} ml
      </Text>
    </Pressable>
  );
}

// 3. CustomWaterInput component
export function CustomWaterInput({
  onLog,
}: {
  onLog: (amount: number) => void;
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const amt = parseInt(value, 10);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a positive number.');
      return;
    }
    if (amt > 10000) {
      setError('Amount exceeds max limit (10,000 ml).');
      return;
    }
    setError('');
    setValue('');
    onLog(amt);
  };

  return (
    <Card style={[styles.inputCard, { borderColor: palette.border }]}>
      <Text style={{ fontWeight: '700', fontSize: 15, color: palette.text, marginBottom: spacing.xs }}>
        Custom Entry
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <TextInput
            value={value}
            onChangeText={(t) => {
              setValue(t);
              setError('');
            }}
            placeholder="Enter amount in ml..."
            keyboardType="number-pad"
            style={[styles.textInput, { borderColor: palette.border, color: palette.text, backgroundColor: palette.background }]}
            placeholderTextColor={palette.mutedText}
          />
        </View>
        <Button style={{ height: 44, paddingHorizontal: 16 }} onPress={handleSubmit}>
          Log Water
        </Button>
      </View>
      {error ? (
        <Text style={{ color: palette.danger, fontSize: 12, marginTop: 4, fontWeight: '600' }}>
          ⚠️ {error}
        </Text>
      ) : null}
    </Card>
  );
}

// 4. Today's History Card & List
export function HistoryList({
  logs,
}: {
  logs: WaterLog[];
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <Card style={[styles.historyCard, { borderColor: palette.border }]}>
      <Text style={{ fontWeight: '700', fontSize: 15, color: palette.text, marginBottom: spacing.sm }}>
        {"Today's Logs"}
      </Text>

      {logs.length === 0 ? (
        <Text style={{ color: palette.mutedText, fontSize: 13, textAlign: 'center', marginVertical: spacing.md }}>
          No water logged yet today. Stay hydrated!
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={true}>
          <View style={{ gap: spacing.xs }}>
            {logs.map((log, index) => (
              <View
                key={log.id || index}
                style={[
                  styles.historyItem,
                  {
                    borderBottomColor: palette.border,
                    borderBottomWidth: index === logs.length - 1 ? 0 : 1,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Text style={{ fontSize: 16 }}>🥛</Text>
                  <Text style={{ color: palette.text, fontWeight: '700', fontSize: 14 }}>
                    {log.amount_ml} ml
                  </Text>
                </View>
                <Text style={{ color: palette.mutedText, fontSize: 12 }}>
                  {formatTime(log.logged_at)}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </Card>
  );
}

// 5. WeeklyProgressCard component (simple progress for last 7 days)
export function WeeklyProgressCard({
  stats,
}: {
  stats: WaterDailyStats[];
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const formatDayName = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString([], { weekday: 'short' });
    } catch {
      return '';
    }
  };

  // Generate last 7 dates in YYYY-MM-DD format
  const getLast7Days = () => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(d.toISOString().slice(0, 10));
    }
    return list;
  };

  const dates = getLast7Days();

  return (
    <Card style={[styles.weeklyCard, { borderColor: palette.border }]}>
      <Text style={{ fontWeight: '700', fontSize: 15, color: palette.text, marginBottom: spacing.md }}>
        Last 7 Days Overview
      </Text>

      <View style={styles.weeklyRow}>
        {dates.map((date) => {
          // Find stats row matching date
          const stat = stats.find((s) => s.date === date);
          const total = stat?.total_ml ?? 0;
          const goal = stat?.goal_ml ?? 2000;
          const completed = stat?.goal_completed ?? false;
          const heightPercent = Math.min((total / goal) * 100, 100);

          return (
            <View key={date} style={styles.weeklyBarCol}>
              <View style={[styles.weeklyBarTrack, { backgroundColor: palette.border }]}>
                <View
                  style={[
                    styles.weeklyBarFill,
                    {
                      height: `${heightPercent}%`,
                      backgroundColor: completed ? '#10B981' : '#3B82F6',
                    },
                  ]}
                />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: palette.text, marginTop: 4 }}>
                {formatDayName(date)}
              </Text>
              <Text style={{ fontSize: 8, color: palette.mutedText, marginTop: 1 }}>
                {total > 0 ? `${Math.round(total / 100) / 10}L` : '0L'}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

// 6. StatisticsCard component
export function StatisticsCard({
  history,
}: {
  history: WaterDailyStats[];
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  // Calculations
  const totalConsumed = history.reduce((sum, item) => sum + item.total_ml, 0);
  const recordedDays = history.length;
  
  // Average daily intake
  const avgIntake = recordedDays > 0 ? Math.round(totalConsumed / recordedDays) : 0;
  
  // Streak
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRow = history.find((h) => h.date === todayStr);
  const currentStreak = todayRow?.current_streak ?? 0;
  const longestStreak = history.reduce((max, item) => Math.max(max, item.current_streak), 0);

  // Goal completion %
  const completedDays = history.filter((item) => item.goal_completed).length;
  const completionRate = recordedDays > 0 ? Math.round((completedDays / recordedDays) * 100) : 0;

  // Weekly average (past 7 days in history)
  const past7Days = history.slice(0, 7);
  const weeklyAvg =
    past7Days.length > 0
      ? Math.round(past7Days.reduce((sum, item) => sum + item.total_ml, 0) / past7Days.length)
      : 0;

  // Monthly average (past 30 days in history)
  const past30Days = history.slice(0, 30);
  const monthlyAvg =
    past30Days.length > 0
      ? Math.round(past30Days.reduce((sum, item) => sum + item.total_ml, 0) / past30Days.length)
      : 0;

  return (
    <Card style={[styles.statsCard, { borderColor: palette.border }]}>
      <Text style={{ fontWeight: '700', fontSize: 15, color: palette.text, marginBottom: spacing.md }}>
        Hydration Statistics
      </Text>

      <View style={styles.statsGrid}>
        <View style={styles.statsCol}>
          <Text style={[styles.statsLabel, { color: palette.mutedText }]}>Total Consumed</Text>
          <Text style={[styles.statsValue, { color: palette.primary }]}>
            {Math.round(totalConsumed / 1000 * 10) / 10} L
          </Text>
        </View>
        <View style={styles.statsCol}>
          <Text style={[styles.statsLabel, { color: palette.mutedText }]}>Current Streak</Text>
          <Text style={[styles.statsValue, { color: '#F59E0B' }]}>
            {currentStreak} Days
          </Text>
        </View>
        <View style={styles.statsCol}>
          <Text style={[styles.statsLabel, { color: palette.mutedText }]}>Longest Streak</Text>
          <Text style={[styles.statsValue, { color: '#EAB308' }]}>
            {longestStreak} Days
          </Text>
        </View>
        <View style={styles.statsCol}>
          <Text style={[styles.statsLabel, { color: palette.mutedText }]}>Avg Daily Intake</Text>
          <Text style={[styles.statsValue, { color: '#3B82F6' }]}>
            {avgIntake} ml
          </Text>
        </View>
        <View style={styles.statsCol}>
          <Text style={[styles.statsLabel, { color: palette.mutedText }]}>Goal Completion</Text>
          <Text style={[styles.statsValue, { color: '#10B981' }]}>
            {completionRate}%
          </Text>
        </View>
        <View style={styles.statsCol}>
          <Text style={[styles.statsLabel, { color: palette.mutedText }]}>Weekly Average</Text>
          <Text style={[styles.statsValue, { color: palette.text }]}>
            {weeklyAvg} ml
          </Text>
        </View>
        <View style={styles.statsCol}>
          <Text style={[styles.statsLabel, { color: palette.mutedText }]}>Monthly Average</Text>
          <Text style={[styles.statsValue, { color: palette.text }]}>
            {monthlyAvg} ml
          </Text>
        </View>
      </View>
    </Card>
  );
}

// 7. GoalCard component
export function GoalCard({
  goalMl,
}: {
  goalMl: number;
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Card style={[styles.goalCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ gap: 2 }}>
          <Text style={{ fontWeight: '700', color: palette.text, fontSize: 15 }}>
            Daily Water Goal
          </Text>
          <Text style={{ fontSize: 13, color: palette.mutedText }}>
            Standard health recommendation
          </Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: palette.primary }}>
          {goalMl} ml
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    padding: spacing.lg,
  },
  statsValueContainer: {
    marginVertical: spacing.xs,
  },
  statsValueText: {
    fontSize: 32,
    fontWeight: '800',
  },
  progressBarContainer: {
    width: '100%',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  progressBarBg: {
    height: 12,
    borderRadius: radius.full,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  quickAddBtn: {
    flex: 1,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputCard: {
    padding: spacing.md,
  },
  textInput: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  historyCard: {
    padding: spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  weeklyCard: {
    padding: spacing.md,
  },
  weeklyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 120,
    alignItems: 'flex-end',
    paddingTop: spacing.xs,
  },
  weeklyBarCol: {
    alignItems: 'center',
    flex: 1,
  },
  weeklyBarTrack: {
    height: 70,
    width: 14,
    borderRadius: radius.full,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  weeklyBarFill: {
    width: '100%',
    borderRadius: radius.full,
  },
  statsCard: {
    padding: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statsCol: {
    minWidth: '45%',
    flex: 1,
    gap: 2,
  },
  statsLabel: {
    fontSize: 11,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  goalCard: {
    padding: spacing.md,
  },
});
