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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';

import { submissionService } from '@/services/backend';
import {
  getInitialPlan,
  getCurrentPlan,
  getMySubmission,
  getProofImageUrl,
  getPartnerProfile,
} from '@/services/planner-read.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores';
import { Button, Card, HeaderTitleCard, Loading, NotificationBadge, ProofViewerModal, Screen } from '@/components/ui';
import { CompanionBus } from '@/features/companion/event-bus';
import { EventBus } from '@/features/notifications/event-bus';
import type { TodoTask } from '@/features/accountability/todo-list';
import { colors, glassCardStyle, radius, spacing, typography } from '@/theme';

type PickedImage = {
  uri: string;
  ext: 'jpg' | 'png' | 'webp';
  taskId?: string; // undefined = general proof
};

export default function SubmitScreen() {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const queryClient = useQueryClient();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const user = useAuthStore((s) => s.user);

  const today = format(new Date(), 'yyyy-MM-dd');

  const [remark, setRemark] = useState('');
  const [pickedImages, setPickedImages] = useState<PickedImage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [viewingProof, setViewingProof] = useState<{ url: string; caption?: string | null } | null>(null);

  // Queries
  const partnerProfileQ = useQuery({
    queryKey: queryKeys.partnerProfile,
    queryFn: getPartnerProfile,
    enabled: !!user,
  });

  const partnerProfile = partnerProfileQ.data;
  const partnerName = partnerProfile?.full_name?.trim() || partnerProfile?.email?.split('@')[0] || 'Your partner';

  const initialQ = useQuery({
    queryKey: queryKeys.initialPlan(today),
    queryFn: () => getInitialPlan(today),
    enabled: !!user,
  });

  const currentQ = useQuery({
    queryKey: queryKeys.currentPlan(today),
    queryFn: () => getCurrentPlan(today),
    enabled: !!user,
  });

  const submissionQ = useQuery({
    queryKey: queryKeys.mySubmission(today),
    queryFn: () => getMySubmission(today),
    enabled: !!user,
  });

  const initialTasks: TodoTask[] = (
    (initialQ.data as { initial_tasks?: { id: string; title: string; estimated_minutes: number; order: number }[] } | null)?.initial_tasks ?? []
  )
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((t) => ({ ...t, status: 'pending' as const }));

  const currentTasks: TodoTask[] = (
    (currentQ.data as { current_tasks?: { id: string; title: string; estimated_minutes: number; completed_pomodoros: number; status: 'pending' | 'completed'; order: number }[] } | null)?.current_tasks ?? []
  )
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

  const submission = submissionQ.data;
  const isSubmitted = !!submission;
  const completedCount = currentTasks.filter((t) => t.status === 'completed').length;

  const proofsArray = (submission?.submission_proofs ? (Array.isArray(submission.submission_proofs) ? submission.submission_proofs : [submission.submission_proofs]) : []) as any[];

  const loadProofUrl = async (path: string) => {
    if (proofUrls[path]) return;
    const url = await getProofImageUrl(path);
    if (url) setProofUrls((prev) => ({ ...prev, [path]: url }));
  };

  const removePickedImage = (imgToRemove: PickedImage) => {
    setPickedImages((prev) => prev.filter((img) => img.uri !== imgToRemove.uri));
  };

  const pickLocalProof = async (taskId?: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const validExt = (['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? (ext === 'jpeg' ? 'jpg' : ext) : 'jpg') as 'jpg' | 'png' | 'webp';

    setPickedImages((prev) => [...prev, { uri: asset.uri, ext: validExt, taskId }]);
  };

  const pickAndUploadProof = async (taskId?: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0] || !user?.id || !submission?.id) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const validExt = (['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? (ext === 'jpeg' ? 'jpg' : ext) : 'jpg') as 'jpg' | 'png' | 'webp';

    if (taskId) setUploadingTaskId(taskId);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      await submissionService.uploadProof(
        submission.id,
        user.id,
        blob,
        validExt,
        undefined,
        taskId
      );

      void queryClient.invalidateQueries({ queryKey: queryKeys.mySubmission(today) });
      Alert.alert('Proof uploaded', 'Proof image uploaded successfully!');
    } catch (e: any) {
      Alert.alert('Upload failed', e.message || 'Could not upload proof image.');
    } finally {
      setUploadingTaskId(null);
    }
  };

  const handleSend = async () => {
    const effectivePlanId = planId || currentQ.data?.id;
    if (!effectivePlanId || !user?.id) {
      Alert.alert('No active plan', 'Please start a daily plan before submitting.');
      return;
    }

    if (pickedImages.length === 0) {
      Alert.alert('Proof required', 'Please add at least 1 proof image before submitting.');
      return;
    }

    setIsSending(true);

    try {
      const subResult = await submissionService.submit(effectivePlanId, remark.trim() || undefined);

      if (subResult?.id) {
        for (const img of pickedImages) {
          try {
            const response = await fetch(img.uri);
            const blob = await response.blob();
            await submissionService.uploadProof(subResult.id, user.id, blob, img.ext, undefined, img.taskId);
          } catch (e) {
            console.warn('Failed uploading image during submit:', e);
          }
        }
      }

      CompanionBus.emit({
        eventType: 'DailyGoalAchieved',
        priority: 'high',
        payload: { date: today },
      });

      EventBus.emit({
        type: 'GoalCompleted',
        userId: user.id,
        data: { taskTitle: 'Daily Plan Submitted' },
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.mySubmission(today) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
      await queryClient.invalidateQueries({ queryKey: ['today-report', today] });

      setPickedImages([]);
      setRemark('');

      Alert.alert(
        'Day Submitted!',
        `Your daily report has been sent to ${partnerName} for review.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Submission Failed', e.message || 'An error occurred while submitting.');
    } finally {
      setIsSending(false);
    }
  };

  const isLoading = initialQ.isLoading || currentQ.isLoading || submissionQ.isLoading;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg, paddingBottom: spacing['2xl'] }}>
          {/* Header Row: Back Arrow + Dark Obsidian Glass Oval Title Card + Notification Badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
                <Text style={{ color: '#2A1D22', fontSize: 20, fontWeight: '800' }}>←</Text>
              </Pressable>
              <HeaderTitleCard title={isSubmitted ? "Submission" : "Submit Plan"} showWavingHand={false} />
            </View>
            <NotificationBadge />
          </View>

          {isLoading ? (
            <Loading />
          ) : (
            <>
              {/* Initial Plan Snapshot Card */}
              <View style={[glassCardStyle, styles.pinkGlassCard]}>
                <View style={{ gap: spacing.md }}>
                  <Text style={styles.cardTitleText}>
                    Initial Plan Snapshot
                  </Text>
                  <Text style={styles.cardSubText}>
                    Snapshot created at the start of the day.
                  </Text>
                  {initialTasks.length === 0 ? (
                    <Text style={styles.cardSubText}>No initial plan tasks recorded.</Text>
                  ) : (
                    initialTasks.map((t) => (
                      <View key={t.id} style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(250, 215, 224, 0.60)', paddingVertical: 6 }}>
                        <Text style={styles.itemTitleText}>{t.title}</Text>
                        <Text style={styles.cardSubText}>{t.estimated_minutes} min estimated</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>

              {/* Tasks Checklist with Individual Proof Attachment */}
              <View style={[glassCardStyle, styles.pinkGlassCard]}>
                <View style={{ gap: spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.cardTitleText}>
                      {"Today's Live Tasks & Proofs"}
                    </Text>
                    <Text style={styles.badgeCountText}>
                      {completedCount}/{currentTasks.length} done
                    </Text>
                  </View>
                  <Text style={styles.cardSubText}>
                    Attach proof images to each task below to show your work. Tap image to zoom.
                  </Text>

                  <View style={{ gap: spacing.sm }}>
                    {currentTasks.map((task) => {
                      const taskProofs = proofsArray.filter((p: any) => p.task_id === task.id);
                      const taskPickedImages = pickedImages.filter((img) => img.taskId === task.id);
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
                                borderColor: isDone ? palette.primary : 'rgba(232, 77, 114, 0.35)',
                                backgroundColor: isDone ? palette.primary : 'transparent',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {isDone ? (
                                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>✓</Text>
                              ) : null}
                            </View>
                            <Text
                              style={{
                                flex: 1,
                                color: isDone ? palette.mutedText : '#2A1D22',
                                fontWeight: '700',
                                fontSize: 15,
                                textDecorationLine: isDone ? 'line-through' : 'none',
                              }}
                            >
                              {task.title}
                            </Text>
                            <Text style={{ color: '#66545B', fontSize: 12, fontWeight: '600' }}>
                              {task.estimated_minutes}m
                            </Text>
                          </View>

                          {/* Task proofs container */}
                          <View style={{ marginTop: 4 }}>
                            {isSubmitted && taskProofs.length > 0 && (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                                {taskProofs.map((proof: any) => {
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
                                          style={{ width: 54, height: 54, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(250, 215, 224, 0.90)' }}
                                        />
                                      ) : (
                                        <View style={{ width: 54, height: 54, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                                          <ActivityIndicator size="small" color={palette.primary} />
                                        </View>
                                      )}
                                    </Pressable>
                                  );
                                })}
                              </View>
                            )}

                            {!isSubmitted && taskPickedImages.length > 0 && (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                                {taskPickedImages.map((img) => (
                                  <View key={img.uri} style={{ position: 'relative' }}>
                                    <Image source={{ uri: img.uri }} style={{ width: 54, height: 54, borderRadius: 8 }} />
                                    <Pressable
                                      onPress={() => removePickedImage(img)}
                                      style={{
                                        position: 'absolute',
                                        top: -4,
                                        right: -4,
                                        backgroundColor: 'rgba(0,0,0,0.7)',
                                        borderRadius: 10,
                                        width: 18,
                                        height: 18,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✕</Text>
                                    </Pressable>
                                  </View>
                                ))}
                              </View>
                            )}

                            <Pressable
                              onPress={() => void (isSubmitted ? pickAndUploadProof(task.id) : pickLocalProof(task.id))}
                              disabled={uploadingTaskId === task.id}
                              style={{
                                alignSelf: 'flex-start',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                backgroundColor: 'rgba(232, 77, 114, 0.10)',
                                borderColor: 'rgba(232, 77, 114, 0.25)',
                                borderWidth: 1,
                                borderRadius: radius.pill,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                              }}
                            >
                              {uploadingTaskId === task.id ? (
                                <ActivityIndicator size="small" color={palette.primary} />
                              ) : (
                                <>
                                  <Text style={{ fontSize: 12 }}>📷</Text>
                                  <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '700' }}>
                                    {isSubmitted ? '+ Add Task Proof' : taskPickedImages.length > 0 ? '+ Add More' : 'Attach Proof'}
                                  </Text>
                                </>
                              )}
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* General proofs */}
              <View style={[glassCardStyle, styles.pinkGlassCard]}>
                <View style={{ gap: spacing.md }}>
                  <Text style={styles.cardTitleText}>General Proof Images</Text>
                  <Text style={styles.cardSubText}>
                    Optional overall screenshots, study notes, or workspace photos.
                  </Text>

                  {isSubmitted && proofsArray.filter((p: any) => !p.task_id).length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {proofsArray
                        .filter((p: any) => !p.task_id)
                        .map((proof: any) => {
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
                                  style={{ width: 64, height: 64, borderRadius: 8 }}
                                />
                              ) : (
                                <View style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                                  <ActivityIndicator size="small" color={palette.primary} />
                                </View>
                              )}
                            </Pressable>
                          );
                        })}
                    </View>
                  )}

                  {!isSubmitted && pickedImages.filter((img) => !img.taskId).length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {pickedImages
                        .filter((img) => !img.taskId)
                        .map((img) => (
                          <View key={img.uri} style={{ position: 'relative' }}>
                            <Image source={{ uri: img.uri }} style={{ width: 64, height: 64, borderRadius: 8 }} />
                            <Pressable
                              onPress={() => removePickedImage(img)}
                              style={{
                                position: 'absolute',
                                top: -4,
                                right: -4,
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                borderRadius: 10,
                                width: 18,
                                height: 18,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✕</Text>
                            </Pressable>
                          </View>
                        ))}
                    </View>
                  )}

                  <Pressable
                    onPress={() => void (isSubmitted ? pickAndUploadProof() : pickLocalProof())}
                    style={{
                      alignSelf: 'flex-start',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: 'rgba(232, 77, 114, 0.10)',
                      borderColor: 'rgba(232, 77, 114, 0.25)',
                      borderWidth: 1,
                      borderRadius: radius.pill,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>📸</Text>
                    <Text style={{ color: palette.primary, fontSize: 13, fontWeight: '700' }}>
                      {isSubmitted ? '+ Add General Proof' : 'Add General Proof'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Remark */}
              {!isSubmitted && (
                <View style={[glassCardStyle, styles.pinkGlassCard]}>
                  <View style={{ gap: spacing.sm }}>
                    <Text style={styles.cardTitleText}>Notes & Reflection</Text>
                    <TextInput
                      style={{
                        backgroundColor: 'rgba(255, 243, 245, 0.85)',
                        borderColor: 'rgba(250, 215, 224, 0.90)',
                        borderRadius: radius.input,
                        borderWidth: 1.5,
                        color: '#2A1D22',
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        fontSize: 14,
                        minHeight: 60,
                      }}
                      value={remark}
                      onChangeText={setRemark}
                      placeholder="Optional notes or reflection for your partner..."
                      placeholderTextColor="#A89A9F"
                      multiline
                    />
                  </View>
                </View>
              )}

              {/* Submit / Done Action */}
              {isSubmitted ? (
                <View style={[glassCardStyle, styles.pinkGlassCard]}>
                  <View style={{ gap: spacing.sm, alignItems: 'center' }}>
                    <Text style={{ fontSize: 32 }}>✅</Text>
                    <Text style={styles.cardTitleText}>Day submitted!</Text>
                    <Text style={styles.cardSubText}>
                      {`${partnerName} has been notified. You can still upload extra proof images above.`}
                    </Text>
                    <Button onPress={() => router.back()}>
                      Back to Accountability
                    </Button>
                  </View>
                </View>
              ) : (
                <View style={[glassCardStyle, styles.pinkGlassCard]}>
                  <View style={{ gap: spacing.sm }}>
                    {pickedImages.length === 0 ? (
                      <View
                        style={{
                          backgroundColor: 'rgba(232, 77, 114, 0.10)',
                          borderColor: 'rgba(232, 77, 114, 0.30)',
                          borderRadius: radius.md,
                          borderWidth: 1,
                          padding: spacing.sm,
                        }}
                      >
                        <Text style={{ color: palette.primary, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
                          📸 Add at least 1 proof image above before submitting
                        </Text>
                        <Text style={{ color: '#66545B', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                          Attach proof to individual tasks or add general proof images to show your work.
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          backgroundColor: 'rgba(232, 77, 114, 0.10)',
                          borderRadius: radius.md,
                          padding: spacing.sm,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: spacing.xs,
                        }}
                      >
                        <Text style={{ fontSize: 16 }}>✅</Text>
                        <Text style={{ color: palette.primary, fontSize: 13, fontWeight: '700' }}>
                          {pickedImages.length} proof{pickedImages.length > 1 ? 's' : ''} attached — ready to submit!
                        </Text>
                      </View>
                    )}
                    <Button
                      disabled={isSending || currentTasks.length === 0 || pickedImages.length === 0}
                      onPress={() => void handleSend()}
                    >
                      {isSending ? 'Sending…' : `Send to ${partnerName} (${pickedImages.length} proof${pickedImages.length !== 1 ? 's' : ''})`}
                    </Button>
                  </View>
                </View>
              )}
            </>
          )}
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
  cardTitleText: {
    color: '#2A1D22',
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: -0.2,
  },
  cardSubText: {
    color: '#66545B',
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  itemTitleText: {
    color: '#2A1D22',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  badgeCountText: {
    color: '#C73A57',
    fontSize: 13,
    fontWeight: '800' as const,
  },
};
