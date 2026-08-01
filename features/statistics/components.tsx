/**
 * Statistics feature — reusable UI components.
 *
 * All components are purely presentational.  Data is passed in via props.
 * No backend calls happen inside components.
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';

import { Card, Loading, ErrorState, EmptyState } from '@/components/ui';
import { glassCardStyle, palette, radius, spacing } from '@/theme';
import type {
  DailyActivityRow,
  DailyReportRow,
  UserAchievementRow,
  AccountabilityStats,
  PomodoroStats,
  TimeFilter,
} from '@/services/statistics.service';

function usePalette() {
  return palette;
}



// ─── PartnerToggle ─────────────────────────────────────────────────────────────

export interface PartnerToggleProps {
  viewingPartner: boolean;
  hasPartner: boolean;
  onToggle: (viewingPartner: boolean) => void;
}

export function PartnerToggle({ viewingPartner, hasPartner, onToggle }: PartnerToggleProps) {
  const palette = usePalette();
  const options: { label: string; value: boolean }[] = [
    { label: 'My Statistics', value: false },
    { label: 'Partner Statistics', value: true },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: palette.surface,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: palette.border,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const active = viewingPartner === opt.value;
        const disabled = opt.value && !hasPartner;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => !disabled && onToggle(opt.value)}
            style={{
              flex: 1,
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.sm,
              borderRadius: radius.full,
              alignItems: 'center',
              backgroundColor: active ? palette.primary : 'transparent',
              opacity: disabled ? 0.4 : 1,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: active ? palette.primaryText : palette.mutedText,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── TimeFilter ────────────────────────────────────────────────────────────────

export interface TimeFilterBarProps {
  value: TimeFilter;
  onChange: (v: TimeFilter) => void;
}

const TIME_FILTERS: { label: string; value: TimeFilter }[] = [
  { label: 'Today', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

export function TimeFilterBar({ value, onChange }: TimeFilterBarProps) {
  const palette = usePalette();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      {TIME_FILTERS.map((f) => {
        const active = f.value === value;
        return (
          <Pressable
            key={f.value}
            onPress={() => onChange(f.value)}
            style={{
              flex: 1,
              paddingVertical: 6,
              borderRadius: radius.md,
              alignItems: 'center',
              backgroundColor: active ? palette.primary : palette.surface,
              borderWidth: 1,
              borderColor: active ? palette.primary : palette.border,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: active ? '700' : '500',
                color: active ? palette.primaryText : palette.mutedText,
              }}
            >
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── MetricCard ────────────────────────────────────────────────────────────────

export interface MetricCardProps {
  label: string;
  value: string | number;
  emoji?: string;
  valueColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function MetricCard({ label, value, emoji, valueColor, style }: MetricCardProps) {
  const palette = usePalette();
  return (
    <View
      style={[
        {
          flex: 1,
          minWidth: 90,
          backgroundColor: palette.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: palette.border,
          padding: spacing.sm,
          alignItems: 'center',
          gap: 4,
        },
        style,
      ]}
    >
      {emoji ? <Text style={{ fontSize: 18 }}>{emoji}</Text> : null}
      <Text
        style={{
          fontSize: 20,
          fontWeight: '700',
          color: valueColor ?? palette.primary,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        style={{ fontSize: 11, color: palette.mutedText, textAlign: 'center' }}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── StatisticsSection ─────────────────────────────────────────────────────────

export interface StatisticsSectionProps {
  title: string;
  emoji?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function StatisticsSection({
  title,
  emoji,
  isLoading,
  error,
  onRetry,
  children,
  style,
}: StatisticsSectionProps) {
  const palette = usePalette();
  return (
    <Card style={style}>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: palette.text, fontWeight: '700', fontSize: 15 }}>
          {emoji ? `${emoji}  ` : ''}
          {title}
        </Text>
        {isLoading ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : (
          children
        )}
      </View>
    </Card>
  );
}

// ─── MetricGrid ────────────────────────────────────────────────────────────────

export interface MetricGridProps {
  metrics: { label: string; value: string | number; emoji?: string; valueColor?: string }[];
}

export function MetricGrid({ metrics }: MetricGridProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
      }}
    >
      {metrics.map((m) => (
        <MetricCard
          key={m.label}
          label={m.label}
          value={m.value}
          emoji={m.emoji}
          valueColor={m.valueColor}
          style={{ minWidth: '30%' }}
        />
      ))}
    </View>
  );
}

// ─── OverviewSection ───────────────────────────────────────────────────────────

export interface OverviewSectionProps {
  userStats: {
    total_minutes: number;
    total_pomodoros: number;
    current_streak: number;
    longest_streak: number;
    xp: number;
    level: number;
    approved_days: number;
    rejected_days: number;
  } | null;
  achievements: UserAchievementRow[];
  activityRows: DailyActivityRow[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function OverviewSection({
  userStats,
  achievements,
  activityRows,
  isLoading,
  error,
  onRetry,
}: OverviewSectionProps) {
  if (isLoading && !userStats) return <StatisticsSection title="Overview" emoji="📊" isLoading />;
  if (error && !userStats) return <StatisticsSection title="Overview" emoji="📊" error={error} onRetry={onRetry} />;
  if (!userStats) {
    return (
      <StatisticsSection title="Overview" emoji="📊">
        <EmptyState title="No data yet" description="Start studying to see your stats." />
      </StatisticsSection>
    );
  }

  const totalXP = activityRows.reduce((s, r) => s + r.xp_earned, 0);
  const filteredPomodoros = activityRows.reduce((s, r) => s + r.pomodoros_completed, 0);
  const filteredMinutes = activityRows.reduce((s, r) => s + r.study_minutes, 0);

  const isFiltered = activityRows.length > 0;
  const displayPomodoros = isFiltered ? filteredPomodoros : userStats.total_pomodoros;
  const displayMinutes = isFiltered ? filteredMinutes : userStats.total_minutes;
  const displayXP = userStats.xp;

  const metrics = [
    { label: 'Study Minutes', value: displayMinutes, emoji: '⏱️' },
    {
      label: 'Study Hours',
      value: (displayMinutes / 60).toFixed(1),
      emoji: '🕐',
    },
    { label: 'Pomodoros', value: displayPomodoros, emoji: '🍅' },
    {
      label: 'Current Streak',
      value: `${userStats.current_streak}d`,
      emoji: '🔥',
      valueColor: '#f97316',
    },
    {
      label: 'Best Streak',
      value: `${userStats.longest_streak}d`,
      emoji: '⭐',
      valueColor: '#eab308',
    },
    { label: 'XP Earned', value: displayXP, emoji: '✨' },
    { label: 'Level', value: userStats.level, emoji: '🎖️' },
    {
      label: 'Achievements',
      value: achievements.length,
      emoji: '🏆',
      valueColor: '#d97706',
    },
    {
      label: 'Approved Days',
      value: userStats.approved_days,
      emoji: '✅',
      valueColor: '#16a34a',
    },
  ];

  return (
    <StatisticsSection title="Overview" emoji="📊">
      <MetricGrid metrics={metrics} />
    </StatisticsSection>
  );
}

// ─── AccountabilitySection ────────────────────────────────────────────────────

export interface AccountabilitySectionProps {
  stats: AccountabilityStats | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function AccountabilitySection({
  stats,
  isLoading,
  error,
  onRetry,
}: AccountabilitySectionProps) {
  if (isLoading && !stats) return <StatisticsSection title="Accountability" emoji="✅" isLoading />;
  if (error && !stats) return <StatisticsSection title="Accountability" emoji="✅" error={error} onRetry={onRetry} />;
  if (!stats || stats.daysSubmitted === 0) {
    return (
      <StatisticsSection title="Accountability" emoji="✅">
        <EmptyState title="No submissions yet" description="Submit a day to see accountability stats." />
      </StatisticsSection>
    );
  }

  const metrics = [
    { label: 'Days Submitted', value: stats.daysSubmitted, emoji: '📅' },
    {
      label: 'Partner Approvals',
      value: stats.partnerApprovals,
      emoji: '👍',
      valueColor: '#16a34a',
    },
    {
      label: 'Partner Rejections',
      value: stats.partnerRejections,
      emoji: '👎',
      valueColor: '#dc2626',
    },
    {
      label: 'Avg Completion',
      value: `${stats.avgCompletionPct}%`,
      emoji: '📈',
    },
    { label: 'Tasks Planned', value: stats.tasksPlanned, emoji: '📋' },
    { label: 'Tasks Done', value: stats.tasksCompleted, emoji: '✔️' },
    {
      label: 'Approval Rate',
      value: `${stats.submissionRate}%`,
      emoji: '🎯',
    },
  ];

  return (
    <StatisticsSection title="Accountability" emoji="✅">
      <MetricGrid metrics={metrics} />
    </StatisticsSection>
  );
}

// ─── PomodoroSection ──────────────────────────────────────────────────────────

export interface PomodoroSectionProps {
  stats: PomodoroStats | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function PomodoroSection({ stats, isLoading, error, onRetry }: PomodoroSectionProps) {
  if (isLoading && !stats) return <StatisticsSection title="Pomodoro" emoji="🍅" isLoading />;
  if (error && !stats) return <StatisticsSection title="Pomodoro" emoji="🍅" error={error} onRetry={onRetry} />;
  if (!stats || stats.pomodorosCompleted === 0) {
    return (
      <StatisticsSection title="Pomodoro" emoji="🍅">
        <EmptyState title="No sessions yet" description="Complete a Pomodoro session to see stats." />
      </StatisticsSection>
    );
  }

  const metrics = [
    { label: 'Completed', value: stats.pomodorosCompleted, emoji: '🍅' },
    { label: 'Focus Time', value: `${stats.focusMinutes}m`, emoji: '⏱️' },
    { label: 'Focus Hours', value: (stats.focusMinutes / 60).toFixed(1), emoji: '🕐' },
    { label: 'Avg/Day', value: `${stats.avgSessionMinutes}m`, emoji: '📊' },
    ...(stats.mostProductiveDay
      ? [
          {
            label: 'Best Day',
            value: format(new Date(stats.mostProductiveDay), 'dd MMM'),
            emoji: '🏆',
          },
        ]
      : []),
  ];

  return (
    <StatisticsSection title="Pomodoro" emoji="🍅">
      <MetricGrid metrics={metrics} />
    </StatisticsSection>
  );
}

// ─── PYQSection ───────────────────────────────────────────────────────────────

export interface PYQSectionProps {
  stats: {
    total_tests: number;
    total_questions: number;
    correct_answers: number;
    wrong_answers: number;
    accuracy: number;
    best_score: number;
    today_tests: number;
    today_questions: number;
  } | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function PYQSection({ stats, isLoading, error, onRetry }: PYQSectionProps) {
  if (isLoading && !stats) return <StatisticsSection title="PYQ Practice" emoji="📚" isLoading />;
  if (error && !stats) return <StatisticsSection title="PYQ Practice" emoji="📚" error={error} onRetry={onRetry} />;
  if (!stats || stats.total_tests === 0) {
    return (
      <StatisticsSection title="PYQ Practice" emoji="📚">
        <EmptyState title="No tests yet" description="Attempt a PYQ test to see your performance." />
      </StatisticsSection>
    );
  }

  const metrics = [
    { label: 'Tests Attempted', value: stats.total_tests, emoji: '📝' },
    { label: 'Questions', value: stats.total_questions, emoji: '❓' },
    {
      label: 'Correct',
      value: stats.correct_answers,
      emoji: '✅',
      valueColor: '#16a34a',
    },
    {
      label: 'Wrong',
      value: stats.wrong_answers,
      emoji: '❌',
      valueColor: '#dc2626',
    },
    {
      label: 'Accuracy',
      value: `${stats.accuracy.toFixed(1)}%`,
      emoji: '🎯',
    },
    { label: 'Best Score', value: `${stats.best_score.toFixed(0)}%`, emoji: '🏆' },
  ];

  return (
    <StatisticsSection title="PYQ Practice" emoji="📚">
      <MetricGrid metrics={metrics} />
    </StatisticsSection>
  );
}

// ─── FlashcardSection ─────────────────────────────────────────────────────────

export interface FlashcardSectionProps {
  scheduleStats: {
    totalCards: number;
    dueCards: number;
    avgIntervalDays: number;
    longestIntervalDays: number;
    avgEaseFactor: number;
  } | null;
  reviewsCount: number;
  userStats?: {
    xp: number;
    level: number;
  } | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function FlashcardSection({
  scheduleStats,
  reviewsCount,
  userStats,
  isLoading,
  error,
  onRetry,
}: FlashcardSectionProps) {
  const hasData = scheduleStats && (scheduleStats.totalCards > 0 || reviewsCount > 0 || scheduleStats.dueCards > 0);

  if (isLoading) return <StatisticsSection title="Flashcards" emoji="⚡" isLoading />;
  if (error) return <StatisticsSection title="Flashcards" emoji="⚡" error={error} onRetry={onRetry} />;
  if (!hasData) {
    return (
      <StatisticsSection title="Flashcards" emoji="⚡">
        <EmptyState title="No flashcards reviewed" description="Review or create flashcards to see stats." />
      </StatisticsSection>
    );
  }

  const metrics = [
    { label: 'Total Cards', value: scheduleStats.totalCards, emoji: '📚' },
    { label: 'Reviewed Today', value: reviewsCount, emoji: '🔄' },
    {
      label: 'Cards Due',
      value: scheduleStats.dueCards,
      emoji: '📅',
      valueColor: scheduleStats.dueCards > 0 ? '#f97316' : undefined,
    },
    {
      label: 'Avg Interval',
      value: `${scheduleStats.avgIntervalDays}d`,
      emoji: '📊',
    },
    {
      label: 'Max Interval',
      value: `${scheduleStats.longestIntervalDays}d`,
      emoji: '⭐',
    },
    {
      label: 'Ease Factor',
      value: scheduleStats.avgEaseFactor.toFixed(1),
      emoji: '🎯',
    },
    {
      label: 'XP Level',
      value: `Level ${userStats?.level ?? 1}`,
      emoji: '🎖️',
    },
    {
      label: 'Total XP',
      value: `${userStats?.xp ?? 0} XP`,
      emoji: '✨',
      valueColor: '#10b981',
    },
  ];

  return (
    <StatisticsSection title="Flashcards" emoji="⚡">
      <MetricGrid metrics={metrics} />
    </StatisticsSection>
  );
}

// ─── VocabularySection ────────────────────────────────────────────────────────

export interface VocabularySectionProps {
  stats: {
    today_words: number;
    total_words: number;
    current_streak: number;
  } | null;
  activityRows: DailyActivityRow[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function VocabularySection({
  stats,
  activityRows,
  isLoading,
  error,
  onRetry,
}: VocabularySectionProps) {
  if (isLoading) return <StatisticsSection title="Vocabulary" emoji="📖" isLoading />;
  if (error) return <StatisticsSection title="Vocabulary" emoji="📖" error={error} onRetry={onRetry} />;
  if (!stats || stats.total_words === 0) {
    return (
      <StatisticsSection title="Vocabulary" emoji="📖">
        <EmptyState title="No words learned" description="Learn vocabulary words to see stats." />
      </StatisticsSection>
    );
  }

  const wordsInFilter = activityRows.reduce((s, r) => s + r.vocabulary_words, 0);

  const metrics = [
    { label: 'Words Learned', value: stats.total_words, emoji: '📖' },
    {
      label: 'Vocab Streak',
      value: `${stats.current_streak}d`,
      emoji: '🔥',
      valueColor: '#f97316',
    },
    { label: 'Today', value: stats.today_words, emoji: '📅' },
    {
      label: 'In Period',
      value: wordsInFilter,
      emoji: '📈',
    },
  ];

  return (
    <StatisticsSection title="Vocabulary" emoji="📖">
      <MetricGrid metrics={metrics} />
    </StatisticsSection>
  );
}

// ─── GrammarSection ───────────────────────────────────────────────────────────

export interface GrammarSectionProps {
  stats: {
    total_questions: number;
    today_questions: number;
    today_correct: number;
    accuracy: number;
  } | null;
  topicBreakdown: { topic: string; attempts: number }[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function GrammarSection({
  stats,
  topicBreakdown,
  isLoading,
  error,
  onRetry,
}: GrammarSectionProps) {
  const palette = usePalette();
  if (isLoading) return <StatisticsSection title="Grammar" emoji="✍️" isLoading />;
  if (error) return <StatisticsSection title="Grammar" emoji="✍️" error={error} onRetry={onRetry} />;
  if (!stats || stats.total_questions === 0) {
    return (
      <StatisticsSection title="Grammar" emoji="✍️">
        <EmptyState title="No quizzes yet" description="Complete grammar quizzes to see stats." />
      </StatisticsSection>
    );
  }

  const metrics = [
    { label: 'Questions', value: stats.total_questions, emoji: '❓' },
    { label: 'Accuracy', value: `${stats.accuracy.toFixed(1)}%`, emoji: '🎯' },
    { label: 'Today', value: stats.today_questions, emoji: '📅' },
    {
      label: 'Topics Covered',
      value: topicBreakdown.length,
      emoji: '📚',
    },
  ];

  return (
    <StatisticsSection title="Grammar" emoji="✍️">
      <MetricGrid metrics={metrics} />
      {topicBreakdown.length > 0 ? (
        <View style={{ gap: 4, marginTop: spacing.xs }}>
          <Text style={{ color: palette.mutedText, fontSize: 12, fontWeight: '600' }}>
            Topics
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {topicBreakdown.slice(0, 8).map((t) => (
              <View
                key={t.topic}
                style={{
                  backgroundColor: palette.background,
                  borderRadius: radius.sm,
                  borderWidth: 1,
                  borderColor: palette.border,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ color: palette.text, fontSize: 11 }}>
                  {t.topic} ×{t.attempts}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </StatisticsSection>
  );
}

// ─── WaterSection ─────────────────────────────────────────────────────────────

export interface WaterSectionProps {
  waterRows: {
    total_ml: number;
    goal_ml: number;
    goal_completed: boolean;
    current_streak: number;
    date: string;
  }[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function WaterSection({ waterRows, isLoading, error, onRetry }: WaterSectionProps) {
  if (isLoading) return <StatisticsSection title="Water Tracker" emoji="💧" isLoading />;
  if (error) return <StatisticsSection title="Water Tracker" emoji="💧" error={error} onRetry={onRetry} />;
  if (waterRows.length === 0) {
    return (
      <StatisticsSection title="Water Tracker" emoji="💧">
        <EmptyState title="No water logged" description="Log water intake to see hydration stats." />
      </StatisticsSection>
    );
  }

  const today = waterRows[0]; // rows sorted desc so index 0 is most recent
  const avgDailyMl =
    waterRows.length > 0
      ? Math.round(waterRows.reduce((s, r) => s + r.total_ml, 0) / waterRows.length)
      : 0;
  const goalCompletedCount = waterRows.filter((r) => r.goal_completed).length;
  const goalCompletionPct =
    waterRows.length > 0 ? Math.round((goalCompletedCount / waterRows.length) * 100) : 0;

  const metrics = [
    {
      label: "Today's Intake",
      value: `${today.total_ml}ml`,
      emoji: '💧',
    },
    { label: 'Avg Daily', value: `${avgDailyMl}ml`, emoji: '📊' },
    {
      label: 'Goal Completion',
      value: `${goalCompletionPct}%`,
      emoji: '🎯',
    },
    {
      label: 'Hydration Streak',
      value: `${today.current_streak}d`,
      emoji: '🔥',
      valueColor: '#f97316',
    },
    { label: 'Goal', value: `${today.goal_ml}ml`, emoji: '🏁' },
    { label: 'Days Logged', value: waterRows.length, emoji: '📅' },
  ];

  return (
    <StatisticsSection title="Water Tracker" emoji="💧">
      <MetricGrid metrics={metrics} />
    </StatisticsSection>
  );
}

// ─── CalendarHeatmap ──────────────────────────────────────────────────────────

export interface CalendarHeatmapProps {
  activityRows: DailyActivityRow[];
}

export function CalendarHeatmap({ activityRows }: CalendarHeatmapProps) {
  const palette = usePalette();

  if (activityRows.length === 0) return null;

  // Sort ascending for display
  const sorted = [...activityRows].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: palette.mutedText, fontSize: 12, fontWeight: '600' }}>
        Activity Heatmap
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {sorted.map((row) => {
            const intensity = Math.min(row.study_minutes / 120, 1); // saturate at 2 hours
            const hasActivity =
              row.study_minutes > 0 ||
              row.pyq_tests > 0 ||
              row.vocabulary_words > 0 ||
              row.flashcards_reviewed > 0 ||
              row.grammar_questions > 0;
            const bg = hasActivity
              ? `rgba(79, 70, 229, ${0.2 + intensity * 0.8})`
              : palette.surface;
            return (
              <View
                key={row.date}
                style={{
                  width: 28,
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: radius.sm,
                    backgroundColor: bg,
                    borderWidth: 1,
                    borderColor: palette.border,
                  }}
                />
                <Text style={{ fontSize: 8, color: palette.mutedText }}>
                  {format(new Date(row.date), 'dd')}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── DailyActivitySection ─────────────────────────────────────────────────────

export interface DailyActivitySectionProps {
  activityRows: DailyActivityRow[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function DailyActivitySection({
  activityRows,
  isLoading,
  error,
  onRetry,
}: DailyActivitySectionProps) {
  const palette = usePalette();

  if (isLoading) return <StatisticsSection title="Daily Activity" emoji="📅" isLoading />;
  if (error) return <StatisticsSection title="Daily Activity" emoji="📅" error={error} onRetry={onRetry} />;
  if (activityRows.length === 0) {
    return (
      <StatisticsSection title="Daily Activity" emoji="📅">
        <EmptyState title="No activity yet" description="Activity appears as you study." />
      </StatisticsSection>
    );
  }

  return (
    <StatisticsSection title="Daily Activity" emoji="📅">
      <CalendarHeatmap activityRows={activityRows} />

      <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
        {activityRows.slice(0, 10).map((row) => (
          <View
            key={row.date}
            style={{
              borderBottomColor: palette.border,
              borderBottomWidth: 1,
              paddingVertical: spacing.xs,
              gap: 4,
            }}
          >
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Text style={{ color: palette.text, fontWeight: '600', fontSize: 13 }}>
                {format(new Date(row.date), 'EEE, dd MMM')}
              </Text>
              <Text style={{ color: palette.primary, fontWeight: '700', fontSize: 12 }}>
                +{row.xp_earned} XP
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {[
                row.study_minutes > 0 && `⏱️ ${row.study_minutes}m`,
                row.pomodoros_completed > 0 && `🍅 ${row.pomodoros_completed}`,
                row.completed_tasks > 0 && `✅ ${row.completed_tasks} tasks`,
                row.flashcards_reviewed > 0 && `⚡ ${row.flashcards_reviewed}`,
                row.vocabulary_words > 0 && `📖 ${row.vocabulary_words}`,
                row.grammar_questions > 0 && `✍️ ${row.grammar_questions}`,
                row.pyq_tests > 0 && `📚 ${row.pyq_tests} tests`,
                row.water_ml > 0 && `💧 ${row.water_ml}ml`,
              ]
                .filter(Boolean)
                .map((label, i) => (
                  <Text key={i} style={{ color: palette.mutedText, fontSize: 11 }}>
                    {label}
                  </Text>
                ))}
            </View>
          </View>
        ))}
      </View>
    </StatisticsSection>
  );
}

// ─── RecentReportsSection ─────────────────────────────────────────────────────

export interface RecentReportsSectionProps {
  reports: DailyReportRow[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function RecentReportsSection({
  reports,
  isLoading,
  error,
  onRetry,
}: RecentReportsSectionProps) {
  const palette = usePalette();
  const router = useRouter();

  if (isLoading) return <StatisticsSection title="Recent Reports" emoji="📋" isLoading />;
  if (error) return <StatisticsSection title="Recent Reports" emoji="📋" error={error} onRetry={onRetry} />;
  if (reports.length === 0) {
    return (
      <StatisticsSection title="Recent Reports" emoji="📋">
        <EmptyState
          title="No reports yet"
          description="Reports appear after your partner reviews a submission."
        />
      </StatisticsSection>
    );
  }

  return (
    <StatisticsSection title="Recent Reports" emoji="📋">
      <View style={{ gap: spacing.sm }}>
        {reports.slice(0, 5).map((r) => (
          <Pressable
            key={r.id}
            onPress={() =>
              router.push({
                pathname: '/(app)/accountability/report',
                params: { reportId: r.id },
              })
            }
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottomColor: palette.border,
                borderBottomWidth: 1,
                paddingVertical: spacing.xs,
              }}
            >
              <View style={{ gap: 2 }}>
                <Text style={{ color: palette.text, fontWeight: '600', fontSize: 13 }}>
                  {format(new Date(r.date), 'EEE, dd MMM yyyy')}
                </Text>
                <Text style={{ color: palette.mutedText, fontSize: 11 }}>
                  {r.completed_tasks}/{r.planned_tasks} tasks · 🍅{r.total_pomodoros} · +{r.xp_earned} XP
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: r.approval_status === 'approved' ? '#16a34a' : '#dc2626',
                  borderWidth: 1,
                  borderColor: r.approval_status === 'approved' ? '#16a34a' : '#dc2626',
                  borderRadius: radius.sm,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  textTransform: 'capitalize',
                }}
              >
                {r.approval_status}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </StatisticsSection>
  );
}

// ─── AchievementsSection ──────────────────────────────────────────────────────

export interface AchievementsSectionProps {
  achievements: UserAchievementRow[];
  isLoading: boolean;
  error?: string | null;
}

export function AchievementsSection({ achievements, isLoading, error }: AchievementsSectionProps) {
  const palette = usePalette();
  if (isLoading) return <StatisticsSection title="Achievements" emoji="🏆" isLoading />;
  if (error) return <StatisticsSection title="Achievements" emoji="🏆" error={error} />;
  if (achievements.length === 0) {
    return (
      <StatisticsSection title="Achievements" emoji="🏆">
        <EmptyState title="No achievements yet" description="Keep studying to unlock achievements." />
      </StatisticsSection>
    );
  }

  return (
    <StatisticsSection title={`Achievements (${achievements.length})`} emoji="🏆">
      <View style={{ gap: spacing.xs }}>
        {achievements.map((a) => (
          <View
            key={a.id}
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              alignItems: 'center',
              borderBottomColor: palette.border,
              borderBottomWidth: 1,
              paddingVertical: spacing.xs,
            }}
          >
            <Text style={{ fontSize: 22 }}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.text, fontWeight: '600', fontSize: 13 }}>
                {a.achievements?.name ?? '—'}
              </Text>
              <Text style={{ color: palette.mutedText, fontSize: 11 }}>
                {a.achievements?.description ?? ''}
              </Text>
            </View>
            <Text style={{ color: palette.mutedText, fontSize: 11 }}>
              {format(new Date(a.unlocked_at), 'dd MMM')}
            </Text>
          </View>
        ))}
      </View>
    </StatisticsSection>
  );
}
