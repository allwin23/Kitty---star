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
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { submissionService } from '@/services/backend';
import { getProofImageUrl } from '@/services/planner-read.service';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import { Card, ErrorState, HeaderTitleCard, Loading, NotificationBadge, ProofViewerModal, Screen } from '@/components/ui';
import { CompanionBus } from '@/features/companion/event-bus';
import { useGrowthAnimStore } from '@/stores/growth-anim-store';
import type { TodoTask } from '@/features/accountability/todo-list';
import { colors, glassCardStyle, palette, radius, spacing, typography } from '@/theme';

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

export default function ReviewScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { submissionId } = useLocalSearchParams<{ submissionId: string }>();

  const [reviewRemark, setReviewRemark] = useState('');
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [viewingProof, setViewingProof] = useState<{ url: string; caption?: string | null } | null>(null);

  // Fetch submission details with proofs and plan tasks
  const submissionQ = useQuery({
    queryKey: ['submission-review-details', submissionId],
    queryFn: async () => {
      if (!submissionId) return null;
      const { data, error } = await supabase
        .from('daily_submissions')
        .select(`
          *,
          submission_proofs(*),
          current_plans(*, current_tasks(*)),
          profiles:user_id(full_name)
        `)
        .eq('id', submissionId)
        .single();
      if (error) throw error;
      return data as SubmissionWithRelations;
    },
    enabled: !!submissionId,
  });

  const submission = submissionQ.data;

  // Initial plan snapshot query
  const initialPlanQ = useQuery({
    queryKey: ['submission-initial-plan', submission?.user_id, submission?.current_plans?.date],
    queryFn: async () => {
      if (!submission?.user_id || !submission?.current_plans?.date) return null;
      const { data, error } = await supabase
        .from('initial_plans')
        .select('*, initial_tasks(*)')
        .eq('user_id', submission.user_id)
        .eq('date', submission.current_plans.date)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!submission?.user_id && !!submission?.current_plans?.date,
  });

  useEffect(() => {
    if (!submission?.submission_proofs) return;
    for (const proof of submission.submission_proofs) {
      if (proof.image_url && !proofUrls[proof.image_url]) {
        void getProofImageUrl(proof.image_url).then((url) => {
          if (url) {
            setProofUrls((prev) => ({ ...prev, [proof.image_url]: url }));
          }
        });
      }
    }
  }, [submission]);

  useFocusEffect(
    useCallback(() => {
      void submissionQ.refetch();
    }, [submissionQ])
  );

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ status, comment }: { status: 'approved' | 'rejected'; comment?: string }) => {
      if (!submissionId) throw new Error('No submission ID');
      await submissionService.review(submissionId, status, comment);
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['submission-review-details', submissionId] });
      void queryClient.invalidateQueries({ queryKey: ['partner-submission'] });
      void queryClient.invalidateQueries({ queryKey: ['partner-current-plan'] });

      if (variables.status === 'approved') {
        useGrowthAnimStore.getState().queueApproved();
        useGrowthAnimStore.getState().queueXp(50);
      }

      CompanionBus.emit({
        eventType: 'DailyGoalAchieved',
        priority: 'high',
        payload: { submissionId },
      });

      Alert.alert(
        variables.status === 'approved' ? 'Day Approved!' : 'Day Rejected',
        variables.status === 'approved'
          ? 'You approved your partner\'s day. Stats updated!'
          : 'Submission marked as rejected.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (e: Error) => Alert.alert('Review error', e.message),
  });

  const loadProofUrl = async (path: string) => {
    if (proofUrls[path]) return;
    const url = await getProofImageUrl(path);
    if (url) setProofUrls((prev) => ({ ...prev, [path]: url }));
  };

  if (submissionQ.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  if (submissionQ.isError || !submission) {
    return (
      <Screen>
        <ErrorState
          error="Could not load partner submission details."
          onRetry={() => void submissionQ.refetch()}
        />
      </Screen>
    );
  }

  const initialTasks = Array.isArray((initialPlanQ.data as any)?.initial_tasks)
    ? ((initialPlanQ.data as any).initial_tasks as any[]).slice().sort((a, b) => a.order - b.order)
    : [];
  const currentTasks = (submission.current_plans?.current_tasks ?? []).slice().sort((a, b) => a.order - b.order);
  const completedCount = currentTasks.filter((t) => t.status === 'completed').length;
  const totalPomodoros = currentTasks.reduce((acc, t) => acc + (t.completed_pomodoros || 0), 0);

  const alreadyReviewed = submission.status !== 'pending';
  const generalProofs = submission.submission_proofs.filter((p) => !p.task_id);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg, paddingBottom: 120 }}>
          {/* Header Row: Back Arrow + Dark Obsidian Glass Oval Title Card + Notification Badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
                <Text style={{ color: palette.textPrimary, fontSize: 20, fontWeight: '800' }}>←</Text>
              </Pressable>
              <HeaderTitleCard title="Partner Review" showWavingHand={false} />
            </View>
            <NotificationBadge />
          </View>

          {/* Submitter info */}
          <View style={[glassCardStyle, styles.pinkGlassCard]}>
            <View style={{ gap: spacing.xs }}>
              <Text style={styles.sectionTitleText}>
                {submission.profiles?.full_name ?? 'Your partner'}
              </Text>
              <Text style={styles.cardSubText}>
                Submitted {new Date(submission.submitted_at).toLocaleString()}
              </Text>
              {submission.remark ? (
                <Text style={{ color: palette.textPrimary, fontSize: 14, marginTop: spacing.xs, fontStyle: 'italic', fontWeight: '500' }}>
                  &quot;{submission.remark}&quot;
                </Text>
              ) : null}
              {/* Study summary */}
              <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', fontSize: 20, color: palette.cherryBloom }}>
                    {completedCount}
                  </Text>
                  <Text style={styles.cardSubText}>Completed</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', fontSize: 20, color: palette.textPrimary }}>
                    {currentTasks.length}
                  </Text>
                  <Text style={styles.cardSubText}>Total Tasks</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', fontSize: 20, color: palette.textPrimary }}>
                    {totalPomodoros}
                  </Text>
                  <Text style={styles.cardSubText}>🍅 Pomodoros</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Initial Plan */}
          <View style={[glassCardStyle, styles.pinkGlassCard]}>
            <View style={{ gap: spacing.md }}>
              <Text style={styles.sectionTitleText}>
                Initial Plan Snapshot
              </Text>
              {initialPlanQ.isLoading ? (
                <Loading />
              ) : initialTasks.length === 0 ? (
                <Text style={styles.cardSubText}>No initial plan snapshot available.</Text>
              ) : (
                initialTasks.map((t: any) => (
                  <View key={t.id} style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(250, 215, 224, 0.60)', paddingVertical: 6 }}>
                    <Text style={styles.itemTitleText}>{t.title}</Text>
                    <Text style={styles.cardSubText}>{t.estimated_minutes} min</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Final Todo & Proofs Grouped */}
          <View style={[glassCardStyle, styles.pinkGlassCard]}>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.sectionTitleText}>
                  Final Plan & Task Proofs
                </Text>
                <Text style={styles.badgeCountText}>
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
                        backgroundColor: 'rgba(255, 255, 255, 0.70)',
                        borderColor: 'rgba(250, 215, 224, 0.90)',
                        borderRadius: radius.md,
                        borderWidth: 1.5,
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
                            borderColor: isDone ? palette.cherryBloom : 'rgba(232, 77, 114, 0.35)',
                            backgroundColor: isDone ? palette.cherryBloom : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isDone ? (
                            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>✓</Text>
                          ) : null}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '700',
                              color: isDone ? palette.textMuted : palette.textPrimary,
                              textDecorationLine: isDone ? 'line-through' : 'none',
                            }}
                          >
                            {task.title}
                          </Text>
                          <Text style={styles.cardSubText}>
                            ⏳ Worked/Planned: <Text style={{ color: palette.cherryBloom, fontWeight: '800' }}>{task.completed_minutes || 0}/{task.estimated_minutes} min</Text> • 🍅 {task.completed_pomodoros || 0} pomodoros
                            {(task.completed_minutes || 0) > task.estimated_minutes ? ` 🔥 (+${(task.completed_minutes || 0) - task.estimated_minutes}m overtime)` : ''}
                          </Text>
                        </View>
                      </View>

                      {/* Task proof images gallery */}
                      {taskProofs.length > 0 ? (
                        <View style={{ marginTop: 6 }}>
                          <Text style={[styles.cardSubText, { fontWeight: '700', marginBottom: 4 }]}>
                            TASK PROOF ({taskProofs.length})
                          </Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {taskProofs.map((proof) => {
                              void loadProofUrl(proof.image_url);
                              const signedUrl = proofUrls[proof.image_url];
                              return (
                                <Pressable
                                  key={proof.id}
                                  onPress={() => signedUrl && setViewingProof({ url: signedUrl, caption: task.title })}
                                >
                                  {signedUrl ? (
                                    <Image
                                      source={{ uri: signedUrl }}
                                      style={{ width: 64, height: 64, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(250, 215, 224, 0.90)' }}
                                    />
                                  ) : (
                                    <View style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                                      <ActivityIndicator size="small" color={palette.cherryBloom} />
                                    </View>
                                  )}
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      ) : (
                        <Text style={[styles.cardSubText, { fontStyle: 'italic', marginTop: 4 }]}>
                          No proof attached to this task.
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* General Proofs (Legacy Support Only) */}
          {generalProofs.length > 0 && (
            <View style={[glassCardStyle, styles.pinkGlassCard]}>
              <View style={{ gap: spacing.md }}>
                <Text style={styles.sectionTitleText}>General Proof Images ({generalProofs.length})</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {generalProofs.map((proof) => {
                    void loadProofUrl(proof.image_url);
                    const signedUrl = proofUrls[proof.image_url];
                    return (
                      <Pressable
                        key={proof.id}
                        onPress={() => signedUrl && setViewingProof({ url: signedUrl, caption: 'General Proof' })}
                      >
                        {signedUrl ? (
                          <Image
                            source={{ uri: signedUrl }}
                            style={{ width: 72, height: 72, borderRadius: 8 }}
                          />
                        ) : (
                          <View style={{ width: 72, height: 72, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator size="small" color={palette.cherryBloom} />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* Review Status & Actions */}
          <View style={[glassCardStyle, styles.pinkGlassCard]}>
            <View style={{ gap: spacing.md }}>
              <Text style={styles.sectionTitleText}>Review Decision</Text>

              {alreadyReviewed ? (
                <View style={{ gap: spacing.xs, alignItems: 'center', paddingVertical: spacing.sm }}>
                  <Text style={{ fontSize: 32 }}>
                    {submission.status === 'approved' ? '✅' : '❌'}
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color: submission.status === 'approved' ? palette.cherryBloom : palette.danger,
                    }}
                  >
                    Submission {submission.status.toUpperCase()}
                  </Text>
                  <Text style={styles.cardSubText}>
                    You have already reviewed this day.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: spacing.md }}>
                  <View style={{ gap: spacing.xs }}>
                    <Text style={[styles.cardSubText, { fontWeight: '700' }]}>Optional Feedback Comment</Text>
                    <TextInput
                      style={{
                        backgroundColor: 'rgba(255, 243, 245, 0.85)',
                        borderColor: 'rgba(250, 215, 224, 0.90)',
                        borderRadius: radius.input,
                        borderWidth: 1.5,
                        color: palette.textPrimary,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        fontSize: 14,
                        minHeight: 60,
                      }}
                      value={reviewRemark}
                      onChangeText={setReviewRemark}
                      placeholder="Add an encouraging note or feedback..."
                      placeholderTextColor={palette.textMuted}
                      multiline
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: spacing.md }}>
                    <Pressable
                      onPress={() => void reviewMutation.mutate({ status: 'approved', comment: reviewRemark })}
                      disabled={reviewMutation.isPending}
                      style={{
                        flex: 1,
                        backgroundColor: palette.cherryBloom,
                        borderRadius: radius.button,
                        paddingVertical: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: reviewMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      {reviewMutation.isPending ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                          Approve Day ✓
                        </Text>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() => void reviewMutation.mutate({ status: 'rejected', comment: reviewRemark })}
                      disabled={reviewMutation.isPending}
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(217, 76, 97, 0.15)',
                        borderColor: palette.danger,
                        borderWidth: 1,
                        borderRadius: radius.button,
                        paddingVertical: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: reviewMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      {reviewMutation.isPending ? (
                        <ActivityIndicator color={palette.danger} />
                      ) : (
                        <Text style={{ color: palette.danger, fontSize: 15, fontWeight: '800' }}>
                          Reject ✕
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Proof Image Fullscreen Viewer */}
      {viewingProof ? (
        <ProofViewerModal
          visible={!!viewingProof}
          imageUrl={viewingProof.url}
          caption={viewingProof.caption}
          onClose={() => setViewingProof(null)}
        />
      ) : null}
    </Screen>
  );
}

const styles = {
  pinkGlassCard: {
    backgroundColor: 'rgba(255, 243, 245, 0.85)',
    borderColor: 'rgba(250, 215, 224, 0.90)',
    borderRadius: 24,
    padding: spacing.md,
  },
  sectionTitleText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: palette.danger,
    letterSpacing: -0.2,
  },
  cardSubText: {
    fontSize: 12,
    lineHeight: 16,
    color: palette.textSecondary,
    fontWeight: '500' as const,
  },
  itemTitleText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: palette.textPrimary,
    letterSpacing: -0.1,
  },
  badgeCountText: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: '800' as const,
  },
};
