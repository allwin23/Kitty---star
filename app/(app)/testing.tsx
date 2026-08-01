import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';

import { Button, Card, Input, Screen } from '@/components/ui';
import {
  notificationService,
  plannerService,
  pomodoroService,
  reportService,
  submissionService,
} from '@/services';
import type { TableRow } from '@/types/database';
import { useAuthStore } from '@/stores';
import { colors, spacing, typography } from '@/theme';

type CurrentTask = TableRow<'current_tasks'>;
type PendingSubmission = TableRow<'daily_submissions'> & {
  submission_proofs?: TableRow<'submission_proofs'>[];
  current_plans?: { id: string; date: string; status: string; current_tasks?: CurrentTask[] };
};
type EarnedAchievement = TableRow<'user_achievements'> & {
  achievements?: Pick<TableRow<'achievements'>, 'name' | 'description'>;
};

const today = () => format(new Date(), 'yyyy-MM-dd');

export default function BackendTestingScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [date] = useState(today);
  const [tasks, setTasks] = useState<CurrentTask[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingSubmission[]>([]);
  const [remark, setRemark] = useState('Demo submission from the backend test lab.');
  const [reviewComment, setReviewComment] = useState('Reviewed in the backend test lab.');
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [stats, setStats] = useState<TableRow<'user_stats'> | null>(null);
  const [reports, setReports] = useState<TableRow<'daily_reports'>[]>([]);
  const [achievements, setAchievements] = useState<EarnedAchievement[]>([]);
  const [notifications, setNotifications] = useState<TableRow<'notifications'>[]>([]);

  const log = useCallback((message: string) => {
    setLogs((current) =>
      [`${new Date().toLocaleTimeString()}  ${message}`, ...current].slice(0, 40),
    );
  }, []);

  const run = useCallback(
    async (label: string, action: () => Promise<void>) => {
      setBusy(label);
      try {
        await action();
        log(`${label}: success`);
      } catch (error) {
        log(`${label}: ${error instanceof Error ? error.message : 'failed'}`);
      } finally {
        setBusy(null);
      }
    },
    [log],
  );

  const refreshPlan = useCallback(async () => {
    const plan = await plannerService.getCurrentPlan(date);
    if (!plan) return;
    setPlanId(plan.id);
    setTasks((plan.current_tasks ?? []) as unknown as CurrentTask[]);
  }, [date]);

  const refreshReviewData = useCallback(async () => {
    const [nextPending, nextStats, nextReports, nextAchievements, nextNotifications] =
      await Promise.all([
        submissionService.getPendingForReview(),
        reportService.stats().catch(() => null),
        reportService.list(),
        reportService.achievements(),
        notificationService.listUnread(),
      ]);
    setPending((nextPending ?? []) as unknown as PendingSubmission[]);
    setStats(nextStats as TableRow<'user_stats'> | null);
    setReports((nextReports ?? []) as TableRow<'daily_reports'>[]);
    setAchievements((nextAchievements ?? []) as unknown as EarnedAchievement[]);
    setNotifications((nextNotifications ?? []) as TableRow<'notifications'>[]);
  }, []);

  const refreshWorkspace = () =>
    run('Refresh workspace', async () => {
      await Promise.all([refreshPlan(), refreshReviewData()]);
    });

  const createDraft = () =>
    run('Create draft', async () => {
      await plannerService.createDraft(date, [
        { title: 'Read study material', estimated_minutes: 25 },
        { title: 'Practice questions', estimated_minutes: 25 },
        { title: 'Review notes', estimated_minutes: 25 },
      ]);
    });

  const createPlan = () =>
    run('Create today plans', async () => {
      const result = (await plannerService.createDailyPlans(date)) as { current_plan_id?: string };
      setPlanId(result.current_plan_id ?? null);
      await refreshPlan();
    });

  const completePomodoro = () =>
    run('Complete Pomodoro', async () => {
      if (!planId || !tasks[0]) throw new Error('Create today plans first.');
      await pomodoroService.complete({ planId, taskId: tasks[0].id, duration: 25 });
      await refreshPlan();
    });

  const pickAndUploadProof = () =>
    run('Upload proof', async () => {
      if (!submissionId) throw new Error('Submit the day first.');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Media-library permission is required.');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const file: Blob = asset.file
        ? (asset.file as Blob)
        : await fetch(asset.uri).then((response) => response.blob());
      const extension = asset.mimeType?.includes('png')
        ? 'png'
        : asset.mimeType?.includes('webp')
          ? 'webp'
          : 'jpg';
      if (!user) throw new Error('You must be signed in to upload proof.');
      await submissionService.uploadProof(
        submissionId,
        user.id,
        file,
        extension,
        'Demo proof image',
      );
      await refreshReviewData();
    });

  const submit = () =>
    run('Submit day', async () => {
      if (!planId) throw new Error('Create today plans first.');
      const submission = await submissionService.submit(planId, remark);
      if (!submission) throw new Error('The submission was not returned by Supabase.');
      setSubmissionId(submission.id);
      await refreshReviewData();
    });

  const review = (id: string, decision: 'approved' | 'rejected') =>
    run(`${decision} submission`, async () => {
      await submissionService.review(id, decision, reviewComment);
      await refreshReviewData();
    });

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: 120 }}>
        <View style={{ gap: spacing.xs }}>
          <Button onPress={() => router.replace('/(app)/home')} style={{ alignSelf: 'flex-start' }}>
            Return home
          </Button>
          <Text style={typography.heading}>Backend test lab</Text>
          <Text style={{ color: colors.light.mutedText }}>
            Use account A to create and submit a day, sign in as account B to review it, then return
            to account A to view its results.
          </Text>
          <Text style={{ color: colors.light.mutedText }}>Testing date: {date}</Text>
          <Button disabled={!!busy} onPress={refreshWorkspace}>
            Refresh this account&apos;s workspace
          </Button>
        </View>

        <Card>
          <Text style={typography.title}>Account A · plan and study</Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Button disabled={!!busy} onPress={createDraft}>
              1. Create demo draft
            </Button>
            <Button disabled={!!busy} onPress={createPlan}>
              2. Create initial/current plans
            </Button>
            <Button disabled={!!busy} onPress={completePomodoro}>
              3. Complete 25-minute Pomodoro
            </Button>
            <Input onChangeText={setRemark} value={remark} placeholder="Submission remark" />
            <Button disabled={!!busy} onPress={submit}>
              4. Submit day
            </Button>
            <Button disabled={!!busy} onPress={pickAndUploadProof}>
              5. Pick and upload proof image
            </Button>
            <Text style={{ color: colors.light.mutedText }}>
              Plan: {planId ?? 'not created'} · Submission: {submissionId ?? 'not submitted'}
            </Text>
            {tasks.map((task) => (
              <Text key={task.id} style={{ color: colors.light.mutedText }}>
                {task.order + 1}. {task.title} · {task.completed_minutes}/{task.estimated_minutes}{' '}
                minutes · {task.status}
              </Text>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={typography.title}>Account B · partner review</Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Input
              onChangeText={setReviewComment}
              value={reviewComment}
              placeholder="Review comment"
            />
            <Button disabled={!!busy} onPress={refreshWorkspace}>
              Refresh pending submissions
            </Button>
            {pending.length === 0 ? (
              <Text style={{ color: colors.light.mutedText }}>
                No pending submission visible to this account.
              </Text>
            ) : null}
            {pending.map((item) => (
              <View key={item.id} style={{ gap: spacing.xs }}>
                <Text>
                  Submission {item.id.slice(0, 8)} · {item.submission_proofs?.length ?? 0} proof(s)
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button disabled={!!busy} onPress={() => review(item.id, 'approved')}>
                    Approve
                  </Button>
                  <Button disabled={!!busy} onPress={() => review(item.id, 'rejected')}>
                    Reject
                  </Button>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={typography.title}>Permanent results</Text>
            {busy ? <ActivityIndicator /> : null}
          </View>
          <Button disabled={!!busy} onPress={refreshWorkspace}>
            Refresh report, stats, achievements, notifications
          </Button>
          {stats ? (
            <Text style={{ marginTop: spacing.sm }}>
              XP {stats.xp} · Level {stats.level} · Streak {stats.current_streak} ·{' '}
              {stats.total_minutes} minutes
            </Text>
          ) : null}
          {reports.map((report) => (
            <Text key={report.id}>
              Report {report.date}: {report.approval_status} · {report.xp_earned} XP
            </Text>
          ))}
          {achievements.map((achievement) => (
            <Text key={achievement.id}>
              Achievement: {achievement.achievements?.name ?? 'Unlocked'}
              {achievement.achievements?.description
                ? ` · ${achievement.achievements.description}`
                : ''}
            </Text>
          ))}
          {notifications.map((notification) => (
            <Text key={notification.id}>Notification: {notification.title}</Text>
          ))}
        </Card>

        <Card>
          <Text style={typography.title}>Activity log</Text>
          {logs.length === 0 ? (
            <Text style={{ color: colors.light.mutedText }}>Actions will appear here.</Text>
          ) : (
            logs.map((entry) => <Text key={entry}>{entry}</Text>)
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}
