import React, { useState } from 'react';
import { format, subDays } from 'date-fns';
import { todayIso, daysAgoIso } from '@/lib/supabase-helpers';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertCircle,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  Coffee,
  Droplets,
  Flame,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react-native';

import { glassCardStyle, palette, radius, spacing } from '@/theme';

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

// 1. WaterProgressCard component — Light Rose Frosted Glass
export function WaterProgressCard({
  totalMl,
  goalMl,
}: {
  totalMl: number;
  goalMl: number;
}) {
  const percentage = Math.min(Math.round((totalMl / goalMl) * 100), 100);
  const remaining = Math.max(goalMl - totalMl, 0);

  return (
    <View style={[glassCardStyle, styles.pinkGlassCard, styles.progressCard]}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <View style={styles.iconCircle}>
          <Droplets size={32} color="#D94C61" strokeWidth={2.2} />
        </View>

        <Text style={{ fontSize: 22, fontWeight: '800', color: '#2A1D22' }}>
          Today&apos;s Hydration
        </Text>
        
        {/* Fill Percentage Display */}
        <View style={styles.statsValueContainer}>
          <Text style={styles.statsValueText}>
            {totalMl} <Text style={{ fontSize: 16, color: '#66545B', fontWeight: '700' }}>/ {goalMl} ml</Text>
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarBg, { backgroundColor: 'rgba(250, 215, 224, 0.60)' }]}>
            <View style={[styles.progressBarFill, { backgroundColor: palette.cherryBloom, width: `${percentage}%` }]} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Sparkles size={14} color="#D94C61" strokeWidth={2.2} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#2A1D22' }}>
              {percentage}% Completed
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: 'rgba(250, 215, 224, 0.90)', marginVertical: 4 }]} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%' }}>
          <View style={{ alignItems: 'center', gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Target size={14} color="#2A1D22" strokeWidth={2.2} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#2A1D22' }}>
                {remaining} ml
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: '#66545B', fontWeight: '700' }}>Remaining</Text>
          </View>
          <View style={{ width: 1, backgroundColor: 'rgba(250, 215, 224, 0.90)', height: '80%' }} />
          <View style={{ alignItems: 'center', gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={14} color={percentage >= 100 ? '#16a34a' : '#D94C61'} strokeWidth={2.2} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: percentage >= 100 ? '#16a34a' : '#D94C61' }}>
                {percentage >= 100 ? 'Goal Achieved!' : 'Keep Drinking!'}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: '#66545B', fontWeight: '700' }}>Status</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// 2. QuickAddButton component — Light Rose Glass Pill Button
export function QuickAddButton({
  amount,
  onPress,
}: {
  amount: number;
  onPress: () => void;
}) {
  const getIcon = (amt: number) => {
    if (amt <= 150) return <Droplets size={18} color="#D94C61" strokeWidth={2.2} />;
    if (amt <= 250) return <Coffee size={18} color="#D94C61" strokeWidth={2.2} />;
    if (amt <= 400) return <Zap size={18} color="#D94C61" strokeWidth={2.2} />;
    if (amt <= 600) return <Sparkles size={18} color="#D94C61" strokeWidth={2.2} />;
    return <Trophy size={18} color="#D94C61" strokeWidth={2.2} />;
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAddBtn,
        {
          backgroundColor: pressed ? 'rgba(232, 77, 114, 0.18)' : 'rgba(255, 255, 255, 0.90)',
          borderColor: pressed ? palette.cherryBloom : 'rgba(250, 215, 224, 0.90)',
        },
      ]}
    >
      {getIcon(amount)}
      <Text style={{ fontSize: 13, fontWeight: '800', color: '#2A1D22', marginTop: 2 }}>
        +{amount} ml
      </Text>
    </Pressable>
  );
}

// 3. CustomWaterInput component — Light Rose Frosted Glass
export function CustomWaterInput({
  onLog,
}: {
  onLog: (amount: number) => void;
}) {
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
    <View style={[glassCardStyle, styles.pinkGlassCard, styles.inputCard]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs }}>
        <Plus size={16} color="#D94C61" strokeWidth={2.4} />
        <Text style={{ fontWeight: '800', fontSize: 15, color: '#2A1D22' }}>
          Log Water Intake
        </Text>
      </View>
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
            style={styles.textInput}
            placeholderTextColor="#66545B"
          />
        </View>
        <Pressable style={styles.primaryBtn} onPress={handleSubmit}>
          <Droplets size={16} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Log</Text>
        </Pressable>
      </View>
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <AlertCircle size={14} color={palette.danger} strokeWidth={2.2} />
          <Text style={{ color: palette.danger, fontSize: 12, fontWeight: '700' }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// 4. Today's History Card & List — Light Rose Frosted Glass
export function HistoryList({
  logs,
}: {
  logs: WaterLog[];
}) {
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <View style={[glassCardStyle, styles.pinkGlassCard, styles.historyCard]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm }}>
        <Clock size={16} color="#D94C61" strokeWidth={2.4} />
        <Text style={{ fontWeight: '800', fontSize: 15, color: '#2A1D22' }}>
          Today&apos;s Logs
        </Text>
      </View>

      {logs.length === 0 ? (
        <Text style={{ color: '#66545B', fontSize: 13, fontWeight: '600', textAlign: 'center', marginVertical: spacing.md }}>
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
                    borderBottomColor: 'rgba(250, 215, 224, 0.90)',
                    borderBottomWidth: index === logs.length - 1 ? 0 : 1,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Droplets size={16} color="#D94C61" strokeWidth={2.2} />
                  <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 14 }}>
                    {log.amount_ml} ml
                  </Text>
                </View>
                <Text style={{ color: '#66545B', fontSize: 12, fontWeight: '700' }}>
                  {formatTime(log.logged_at)}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// 5. WeeklyProgressCard component — Light Rose Frosted Glass
export function WeeklyProgressCard({
  stats,
}: {
  stats: WaterDailyStats[];
}) {
  const formatDayName = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString([], { weekday: 'short' });
    } catch {
      return '';
    }
  };

  const getLast7Days = () => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      list.push(daysAgoIso(i));
    }
    return list;
  };

  const dates = getLast7Days();

  return (
    <View style={[glassCardStyle, styles.pinkGlassCard, styles.weeklyCard]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md }}>
        <Calendar size={16} color="#D94C61" strokeWidth={2.4} />
        <Text style={{ fontWeight: '800', fontSize: 15, color: '#2A1D22' }}>
          Last 7 Days Overview
        </Text>
      </View>

      <View style={styles.weeklyRow}>
        {dates.map((date) => {
          const stat = stats.find((s) => s.date === date);
          const total = stat?.total_ml ?? 0;
          const goal = stat?.goal_ml ?? 2000;
          const completed = stat?.goal_completed ?? false;
          const heightPercent = Math.min((total / goal) * 100, 100);

          return (
            <View key={date} style={styles.weeklyBarCol}>
              <View style={[styles.weeklyBarTrack, { backgroundColor: 'rgba(250, 215, 224, 0.60)' }]}>
                <View
                  style={[
                    styles.weeklyBarFill,
                    {
                      height: `${heightPercent}%`,
                      backgroundColor: completed ? '#16a34a' : palette.cherryBloom,
                    },
                  ]}
                />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#2A1D22', marginTop: 4 }}>
                {formatDayName(date)}
              </Text>
              <Text style={{ fontSize: 9, color: '#66545B', fontWeight: '700', marginTop: 1 }}>
                {total > 0 ? `${Math.round(total / 100) / 10}L` : '0L'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// 6. StatisticsCard component — Light Rose Frosted Glass
export function StatisticsCard({
  history,
}: {
  history: WaterDailyStats[];
}) {
  const totalConsumed = history.reduce((sum, item) => sum + item.total_ml, 0);
  const recordedDays = history.length;
  
  const avgIntake = recordedDays > 0 ? Math.round(totalConsumed / recordedDays) : 0;
  
  const todayStr = todayIso();
  const todayRow = history.find((h) => h.date === todayStr);
  const currentStreak = todayRow?.current_streak ?? 0;
  const longestStreak = history.reduce((max, item) => Math.max(max, item.current_streak), 0);

  const completedDays = history.filter((item) => item.goal_completed).length;
  const completionRate = recordedDays > 0 ? Math.round((completedDays / recordedDays) * 100) : 0;

  const past7Days = history.slice(0, 7);
  const weeklyAvg =
    past7Days.length > 0
      ? Math.round(past7Days.reduce((sum, item) => sum + item.total_ml, 0) / past7Days.length)
      : 0;

  const past30Days = history.slice(0, 30);
  const monthlyAvg =
    past30Days.length > 0
      ? Math.round(past30Days.reduce((sum, item) => sum + item.total_ml, 0) / past30Days.length)
      : 0;

  return (
    <View style={[glassCardStyle, styles.pinkGlassCard, styles.statsCard]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md }}>
        <BarChart2 size={16} color="#D94C61" strokeWidth={2.4} />
        <Text style={{ fontWeight: '800', fontSize: 15, color: '#2A1D22' }}>
          Hydration Statistics
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>Total Consumed</Text>
          <Text style={[styles.statsValue, { color: palette.danger }]}>
            {Math.round(totalConsumed / 1000 * 10) / 10} L
          </Text>
        </View>
        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>Current Streak</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Flame size={14} color="#FF9F1C" strokeWidth={2.4} />
            <Text style={[styles.statsValue, { color: '#2A1D22' }]}>
              {currentStreak} Days
            </Text>
          </View>
        </View>
        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>Longest Streak</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Trophy size={14} color="#FF9F1C" strokeWidth={2.4} />
            <Text style={[styles.statsValue, { color: '#2A1D22' }]}>
              {longestStreak} Days
            </Text>
          </View>
        </View>
        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>Avg Daily Intake</Text>
          <Text style={[styles.statsValue, { color: '#3B82F6' }]}>
            {avgIntake} ml
          </Text>
        </View>
        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>Goal Completion</Text>
          <Text style={[styles.statsValue, { color: '#16a34a' }]}>
            {completionRate}%
          </Text>
        </View>
        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>Weekly Average</Text>
          <Text style={[styles.statsValue, { color: '#2A1D22' }]}>
            {weeklyAvg} ml
          </Text>
        </View>
        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>Monthly Average</Text>
          <Text style={[styles.statsValue, { color: '#2A1D22' }]}>
            {monthlyAvg} ml
          </Text>
        </View>
      </View>
    </View>
  );
}

// 7. GoalCard component — Light Rose Frosted Glass
export function GoalCard({
  goalMl,
}: {
  goalMl: number;
}) {
  return (
    <View style={[glassCardStyle, styles.pinkGlassCard, styles.goalCard]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Target size={20} color="#D94C61" strokeWidth={2.2} />
          <View>
            <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 15 }}>
              Daily Water Goal
            </Text>
            <Text style={{ fontSize: 12, color: '#66545B', fontWeight: '600' }}>
              Standard health recommendation
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: palette.danger }}>
          {goalMl} ml
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pinkGlassCard: {
    backgroundColor: 'rgba(255, 243, 245, 0.85)',
    borderColor: 'rgba(250, 215, 224, 0.90)',
    borderRadius: 24,
    padding: spacing.md,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(232, 77, 114, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCard: {
    padding: spacing.lg,
  },
  statsValueContainer: {
    marginVertical: spacing.xs,
  },
  statsValueText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2A1D22',
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
    minWidth: '18%',
    height: 64,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputCard: {
    padding: spacing.md,
  },
  textInput: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(250, 215, 224, 0.90)',
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: '#2A1D22',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  primaryBtn: {
    height: 44,
    backgroundColor: palette.cherryBloom,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
    color: '#66545B',
    fontWeight: '700',
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2A1D22',
  },
  goalCard: {
    padding: spacing.md,
  },
});
