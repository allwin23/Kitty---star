/**
 * Review Screen — for the partner to review a submission.
 *
 * Shows:
 *  - Partner name + submitted time
 *  - Initial plan (snapshot)
 *  - Final todo list with completion + pomodoros
 *  - Proof images (grouped by task, and general)
 *  - Optional comment
 *  - Approve / Reject buttons -> submissionService.review()
 *    (which calls review_submission RPC -> approve_day or reject_day)
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { submissionService } from '@/services/backend';
import { getProofImageUrl } from '@/services/planner-read.service';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import { Card, ErrorState, Loading, Screen } from '@/components/ui';
import type { TodoTask } from '@/features/accountability/todo-list';
import { colors, radius, spacing, typography } from '@/theme';

type SubmissionWithRelations = {
  id: string;
  user_id: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  remark: string | null;
  submission_proofs: { id: string; image_url: string; caption: string | null; task_id: string | null }[];
  current_plans: {
    id: string;
    date: string;
    current_tasks: {
      id: string;
      title: string;
      estimated_minutes: number;
      completed_minutes: number;
      completed_pomodoros: number;
      status: 'pending' | 'completed';
      order: number;
    }[];
  } | null;
  profiles?: { full_name: string | null } | null;
};

async function fetchSubmission(submissionId: string): Promise<SubmissionWithRelations> {
  const { data, error } = await supabase
    .from('daily_submissions')
    .select(
      '*, submission_proofs(*), current_plans(*, current_tasks(*)), profiles!daily_submissions_user_id_fkey(full_name)',
    )
    .eq('id', submissionId)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as SubmissionWithRelations;
}

async function fetchInitialPlan(userId: string, date: string) {
  const { data, error } = await supabase
    .from('initial_plans')
    .select('*, initial_tasks(*)')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export default function ReviewScreen() {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const queryClient = useQueryClient();
  const { submissionId } = useLocalSearchParams<{ submissionId: string }>();

  const [comment, setComment] = useState('');
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});

  const submissionQ = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => fetchSubmission(submissionId),
    enabled: !!submissionId,
  });

  const submission = submissionQ.data;
  const planDate = submission?.current_plans?.date;
  const submitterId = submission?.user_id;

  const initialPlanQ = useQuery({
    queryKey: ['partner-initial-plan', submitterId, planDate],
    queryFn: () => fetchInitialPlan(submitterId!, planDate!),
    enabled: !!planDate && !!submitterId,
  });

  // Load signed URLs for proof images
  const loadProofUrl = async (path: string) => {
    if (proofUrls[path]) return;
    const url = await getProofImageUrl(path);
    if (url) setProofUrls((prev) => ({ ...prev, [path]: url }));
  };

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: (decision: 'approved' | 'rejected') =>
      submissionService.review(submissionId, decision, comment.trim() || undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.partnerSubmission });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      void queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
      void queryClient.invalidateQueries({ queryKey: queryKeys.achievements });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      void queryClient.invalidateQueries({ queryKey: ['current-plan'] });
      void queryClient.invalidateQueries({ queryKey: ['initial-plan'] });
      void queryClient.invalidateQueries({ queryKey: ['my-submission'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.mascotFeed });
      void queryClient.invalidateQueries({ queryKey: queryKeys.mascotUnread });
      Alert.alert('Done', 'Review submitted. The report has been finalised.', [
        { text: 'OK', onPress: () => router.replace('/(app)/accountability') },
      ]);
    },
    onError: (e: Error) => Alert.alert('Review failed', e.message),
  });

  const handleDecision = (decision: 'approved' | 'rejected') => {
    Alert.alert(
      decision === 'approved' ? 'Approve submission' : 'Reject submission',
      decision === 'approved'
        ? "Approve your partner's study day?"
        : 'Reject this submission? Your partner will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: decision === 'approved' ? 'Approve' : 'Reject',
          style: decision === 'rejected' ? 'destructive' : 'default',
          onPress: () => reviewMutation.mutate(decision),
        },
      ],
    );
  };

  const initialTasks: TodoTask[] = (
    (initialPlanQ.data as { initial_tasks?: { id: string; title: string; estimated_minutes: number; order: number }[] } | null)?.initial_tasks ?? []
  )
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((t) => ({ ...t, status: 'pending' as const }));

  const currentTasks: TodoTask[] = (submission?.current_plans?.current_tasks ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((t) => ({
      id: t.id,
      title: t.title,
      estimated_minutes: t.estimated_minutes,
      status: t.status,
      completed_pomodoros: t.completed_pomodoros,
      order: t.order,
    }));

  const completedCount = currentTasks.filter((t) => t.status === 'completed').length;
  const totalPomodoros = currentTasks.reduce((sum, t) => sum + (t.completed_pomodoros ?? 0), 0);

  if (submissionQ.isLoading) {
    return (
      <Screen centered>
        <Loading />
      </Screen>
    );
  }

  if (submissionQ.error) {
    return (
      <Screen centered>
        <ErrorState
          error={(submissionQ.error as Error).message}
          onRetry={() => void submissionQ.refetch()}
        />
      </Screen>
    );
  }

  if (!submission) return null;

  const alreadyReviewed = submission.status !== 'pending';
  const generalProofs = submission.submission_proofs.filter((p) => !p.task_id);
  const totalProofsUploaded = submission.submission_proofs.length;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg, paddingBottom: spacing['2xl'] }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Pressable onPress={() => router.back()}>
              <Text style={{ color: palette.primary, fontSize: 16 }}>← Back</Text>
            </Pressable>
            <Text style={[typography.title, { color: palette.text, flex: 1 }]}>
              Partner Review
            </Text>
          </View>

          {/* Submitter info */}
          <Card>
            <View style={{ gap: spacing.xs }}>
              <Text style={{ color: palette.text, fontWeight: '700', fontSize: 16 }}>
                {submission.profiles?.full_name ?? 'Your partner'}
              </Text>
              <Text style={{ color: palette.mutedText, fontSize: 12 }}>
                Submitted {new Date(submission.submitted_at).toLocaleString()}
              </Text>
              {submission.remark ? (
                <Text style={{ color: palette.text, fontSize: 14, marginTop: spacing.xs, fontStyle: 'italic' }}>
                  &quot;{submission.remark}&quot;
                </Text>
              ) : null}
              {/* Study summary */}
              <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', fontSize: 20, color: palette.primary }}>
                    {completedCount}
                  </Text>
                  <Text style={{ color: palette.mutedText, fontSize: 11 }}>Completed</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', fontSize: 20, color: palette.text }}>
                    {currentTasks.length}
                  </Text>
                  <Text style={{ color: palette.mutedText, fontSize: 11 }}>Total Tasks</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', fontSize: 20, color: palette.text }}>
                    {totalPomodoros}
                  </Text>
                  <Text style={{ color: palette.mutedText, fontSize: 11 }}>🍅 Pomodoros</Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Initial Plan */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <Text style={[typography.title, { color: palette.text, fontSize: 16 }]}>
                Initial Plan snapshot
              </Text>
              {initialPlanQ.isLoading ? (
                <Loading />
              ) : initialTasks.length === 0 ? (
                <Text style={{ color: palette.mutedText }}>No initial plan snapshot available.</Text>
              ) : (
                initialTasks.map((t) => (
                  <View key={t.id} style={{ borderBottomWidth: 1, borderBottomColor: palette.border, paddingVertical: 4 }}>
                    <Text style={{ color: palette.text }}>{t.title}</Text>
                    <Text style={{ color: palette.mutedText, fontSize: 12 }}>{t.estimated_minutes} min</Text>
                  </View>
                ))
              )}
            </View>
          </Card>

          {/* Final Todo & Proofs Grouped */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[typography.title, { color: palette.text, fontSize: 16 }]}>
                  Final Plan & Task Proofs
                </Text>
                <Text style={{ color: palette.mutedText, fontSize: 12 }}>
                  {completedCount}/{currentTasks.length} done
                </Text>
              </View>

              <View style={{ gap: spacing.sm }}>
                {currentTasks.map((task) => {
                  const taskProofs = submission.submission_proofs.filter((p) => p.task_id === task.id);
                  const isDone = task.status === 'completed';

                  return (
                    <View
                      key={task.id}
                      style={{
                        backgroundColor: palette.surface,
                        borderColor: palette.border,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        padding: spacing.sm,
                        gap: spacing.xs,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            borderWidth: 2,
                            borderColor: isDone ? palette.primary : palette.border,
                            backgroundColor: isDone ? palette.primary : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isDone ? (
                            <Text style={{ color: palette.primaryText, fontSize: 11, fontWeight: '700' }}>✓</Text>
                          ) : null}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: palette.text,
                              textDecorationLine: isDone ? 'line-through' : 'none',
                              opacity: isDone ? 0.6 : 1,
                              fontWeight: '600',
                            }}
                          >
                            {task.title}
                          </Text>
                          <Text style={{ color: palette.mutedText, fontSize: 12 }}>
                            {task.estimated_minutes} min · 🍅 {task.completed_pomodoros ?? 0} focus sessions
                          </Text>
                        </View>
                      </View>

                      {/* Display task-specific proofs */}
                      {taskProofs.length > 0 && (
                        <View style={{ paddingLeft: 28, marginTop: spacing.xs, gap: spacing.xs }}>
                          <Text style={{ color: palette.mutedText, fontSize: 11, fontWeight: '700' }}>
                            Attached Proofs ({taskProofs.length})
                          </Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                            {taskProofs.map((proof) => {
                              void loadProofUrl(proof.image_url);
                              const url = proofUrls[proof.image_url];
                              return (
                                <View key={proof.id}>
                                  {url ? (
                                    <Image
                                      source={{ uri: url }}
                                      style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: radius.sm,
                                        borderWidth: 1,
                                        borderColor: palette.border,
                                      }}
                                    />
                                  ) : (
                                    <View
                                      style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: radius.sm,
                                        borderWidth: 1,
                                        borderColor: palette.border,
                                        backgroundColor: palette.surface,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      <ActivityIndicator size="small" />
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </Card>

          {/* General Proofs */}
          {generalProofs.length > 0 && (
            <Card>
              <View style={{ gap: spacing.md }}>
                <Text style={[typography.title, { color: palette.text, fontSize: 16 }]}>
                  General Proofs ({generalProofs.length})
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {generalProofs.map((proof) => {
                    void loadProofUrl(proof.image_url);
                    const url = proofUrls[proof.image_url];
                    return (
                      <View key={proof.id}>
                        {url ? (
                          <Image
                            source={{ uri: url }}
                            style={{
                              width: 100,
                              height: 100,
                              borderRadius: radius.md,
                              borderWidth: 1,
                              borderColor: palette.border,
                            }}
                          />
                        ) : (
                          <View
                            style={{
                              width: 100,
                              height: 100,
                              borderRadius: radius.md,
                              borderWidth: 1,
                              borderColor: palette.border,
                              backgroundColor: palette.surface,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ActivityIndicator size="small" />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </Card>
          )}

          {/* Review status and comments */}
          {alreadyReviewed ? (
            <Card>
              <Text
                style={{
                  color: submission.status === 'approved' ? 'green' : palette.danger,
                  fontWeight: '700',
                  textAlign: 'center',
                  textTransform: 'capitalize',
                  fontSize: 16,
                }}
              >
                Reviewed: {submission.status}
              </Text>
            </Card>
          ) : (
            <Card>
              <View style={{ gap: spacing.md }}>
                <Text style={[typography.title, { color: palette.text, fontSize: 16 }]}>
                  Your Decision
                </Text>
                <TextInput
                  style={{
                    borderColor: palette.border,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    color: palette.text,
                    minHeight: 70,
                    padding: spacing.sm,
                    textAlignVertical: 'top',
                  }}
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Optional comment for your partner…"
                  placeholderTextColor={palette.mutedText}
                  multiline
                />

                {reviewMutation.isPending ? (
                  <Loading />
                ) : (
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Pressable
                      onPress={() => handleDecision('approved')}
                      disabled={totalProofsUploaded === 0}
                      style={{
                        flex: 1,
                        backgroundColor: totalProofsUploaded === 0 ? palette.surface : '#16a34a',
                        borderRadius: radius.md,
                        padding: spacing.sm,
                        alignItems: 'center',
                        opacity: totalProofsUploaded === 0 ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700' }}>✓ Approve</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDecision('rejected')}
                      disabled={totalProofsUploaded === 0}
                      style={{
                        flex: 1,
                        backgroundColor: totalProofsUploaded === 0 ? palette.surface : palette.danger,
                        borderRadius: radius.md,
                        padding: spacing.sm,
                        alignItems: 'center',
                        opacity: totalProofsUploaded === 0 ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700' }}>✗ Reject</Text>
                    </Pressable>
                  </View>
                )}

                {totalProofsUploaded === 0 ? (
                  <Text style={{ color: palette.danger, fontSize: 12, textAlign: 'center' }}>
                    The backend requires at least one proof image before you can review.
                  </Text>
                ) : null}

                {reviewMutation.isError ? (
                  <ErrorState error={(reviewMutation.error as Error).message} />
                ) : null}
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
