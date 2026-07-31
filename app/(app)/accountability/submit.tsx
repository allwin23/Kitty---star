/**
 * Submission Screen
 *
 * Flow:
 *  1. Show Initial Plan (read-only)
 *  2. Show current tasks with completion status
 *  3. Pick proofs (local state) before sending
 *  4. Add optional remark
 *  5. Submit day and upload local proofs
 *  6. After submit -> read-only view, allow uploading extra proofs
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { submissionService } from '@/services/backend';
import {
  getInitialPlan,
  getCurrentPlan,
  getMySubmission,
  getProofImageUrl,
} from '@/services/planner-read.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores';
import { Button, Card, Loading, Screen } from '@/components/ui';
import type { TodoTask } from '@/features/accountability/todo-list';
import { colors, radius, spacing, typography } from '@/theme';

const today = new Date().toISOString().slice(0, 10);

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

  const [remark, setRemark] = useState('');
  const [pickedImages, setPickedImages] = useState<PickedImage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});

  // Queries
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

  // Safe cast proofs to array to handle database types mapping
  const proofsArray = (submission?.submission_proofs ? (Array.isArray(submission.submission_proofs) ? submission.submission_proofs : [submission.submission_proofs]) : []) as any[];

  // Load signed URLs for proof images
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

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const validExt = (['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? (ext === 'jpeg' ? 'jpg' : ext) : 'jpg') as 'jpg' | 'png' | 'webp';

    if (!submission || !user) {
      Alert.alert('Submit first', 'Submit your day before uploading proofs.');
      return;
    }

    const taskKey = taskId ?? 'general';
    setUploadingTaskId(taskKey);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      await submissionService.uploadProof(submission.id, user.id, blob, validExt, undefined, taskId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.mySubmission(today) });
    } catch (e) {
      Alert.alert('Upload failed', (e as Error).message);
    } finally {
      setUploadingTaskId(null);
    }
  };

  const handleSend = async () => {
    if (!user) return;
    setIsSending(true);
    try {
      // 1. Submit the day
      await submissionService.submit(planId, remark.trim() || undefined);

      // 2. Fetch the newly created submission to get its ID
      const { data: newSub } = await submissionQ.refetch();
      if (!newSub) throw new Error('Failed to retrieve submission after creating');

      // 3. Upload all picked images
      for (const img of pickedImages) {
        const response = await fetch(img.uri);
        const blob = await response.blob();
        await submissionService.uploadProof(newSub.id, user.id, blob, img.ext, undefined, img.taskId);
      }

      // 4. Invalidate queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.mySubmission(today) });

      setPickedImages([]);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  const isLoading = initialQ.isLoading || currentQ.isLoading || submissionQ.isLoading;

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
              {isSubmitted ? 'Your Submission' : 'Submit to Partner'}
            </Text>
          </View>

          {isLoading ? (
            <Loading />
          ) : (
            <>
              {/* Initial Plan vs Final */}
              <Card>
                <View style={{ gap: spacing.md }}>
                  <Text style={[typography.title, { color: palette.text, fontSize: 16 }]}>
                    Initial Plan
                  </Text>
                  <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                    Snapshot created at the start of the day.
                  </Text>
                  {initialTasks.length === 0 ? (
                    <Text style={{ color: palette.mutedText }}>No initial plan tasks.</Text>
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

              {/* Tasks Checklist with Individual Proof Attachment */}
              <Card>
                <View style={{ gap: spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[typography.title, { color: palette.text, fontSize: 16 }]}>
                      {"Today's Live Tasks & Proofs"}
                    </Text>
                    <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                      {completedCount}/{currentTasks.length} completed
                    </Text>
                  </View>
                  <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                    Attach proof images to each task below to show your work.
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
                            backgroundColor: palette.surface,
                            borderColor: palette.border,
                            borderRadius: radius.md,
                            borderWidth: 1,
                            padding: spacing.sm,
                            gap: spacing.xs,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                            {/* Read-only status checkbox */}
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
                                style={[
                                  typography.body,
                                  {
                                    color: palette.text,
                                    textDecorationLine: isDone ? 'line-through' : 'none',
                                    opacity: isDone ? 0.6 : 1,
                                    fontWeight: '600',
                                  },
                                ]}
                              >
                                {task.title}
                              </Text>
                              <Text style={{ color: palette.mutedText, fontSize: 12 }}>
                                {task.estimated_minutes} min · 🍅 {task.completed_pomodoros ?? 0} focus sessions
                              </Text>
                            </View>
                          </View>

                          {/* Task-specific proof list */}
                          <View style={{ marginTop: spacing.xs, paddingLeft: 28, gap: spacing.xs }}>
                            {(taskProofs.length > 0 || taskPickedImages.length > 0) && (
                              <Text style={{ color: palette.mutedText, fontSize: 12, fontWeight: '700' }}>
                                Task Proofs ({isSubmitted ? taskProofs.length : taskPickedImages.length})
                              </Text>
                            )}

                            {isSubmitted && taskProofs.length > 0 && (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                                {taskProofs.map((proof: any) => {
                                  void loadProofUrl(proof.image_url);
                                  const url = proofUrls[proof.image_url];
                                  return (
                                    <View key={proof.id}>
                                      {url ? (
                                        <Image
                                          source={{ uri: url }}
                                          style={{
                                            width: 60,
                                            height: 60,
                                            borderRadius: radius.sm,
                                            borderWidth: 1,
                                            borderColor: palette.border,
                                          }}
                                        />
                                      ) : (
                                        <View
                                          style={{
                                            width: 60,
                                            height: 60,
                                            borderRadius: radius.sm,
                                            backgroundColor: palette.surface,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}
                                        >
                                          <ActivityIndicator size="small" color={palette.primary} />
                                        </View>
                                      )}
                                    </View>
                                  );
                                })}
                              </View>
                            )}

                            {!isSubmitted && taskPickedImages.length > 0 && (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                                {taskPickedImages.map((img, i) => (
                                  <View key={i}>
                                    <Image
                                      source={{ uri: img.uri }}
                                      style={{
                                        width: 60,
                                        height: 60,
                                        borderRadius: radius.sm,
                                        borderWidth: 1,
                                        borderColor: palette.border,
                                      }}
                                    />
                                    <Pressable
                                      onPress={() => removePickedImage(img)}
                                      style={{
                                        position: 'absolute',
                                        top: -5,
                                        right: -5,
                                        backgroundColor: '#ef4444', // red
                                        borderRadius: 10,
                                        width: 20,
                                        height: 20,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>×</Text>
                                    </Pressable>
                                  </View>
                                ))}
                              </View>
                            )}

                            <Pressable
                              onPress={() => void (isSubmitted ? pickAndUploadProof(task.id) : pickLocalProof(task.id))}
                              disabled={uploadingTaskId !== null}
                              style={{
                                borderColor: palette.primary,
                                borderRadius: radius.sm,
                                borderWidth: 1,
                                borderStyle: 'dashed',
                                paddingVertical: 6,
                                paddingHorizontal: spacing.sm,
                                alignItems: 'center',
                                alignSelf: 'flex-start',
                                opacity: uploadingTaskId !== null ? 0.5 : 1,
                              }}
                            >
                              <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '600' }}>
                                {uploadingTaskId === task.id ? 'Uploading…' : '+ Attach Proof'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </Card>

              {/* Remark */}
              {isSubmitted ? (
                submission.remark ? (
                  <Card>
                    <View style={{ gap: spacing.xs }}>
                      <Text style={[typography.title, { color: palette.text, fontSize: 16 }]}>
                        Submission Note
                      </Text>
                      <Text style={{ color: palette.text, fontSize: 14 }}>
                         &quot;{submission.remark}&quot;
                      </Text>
                    </View>
                  </Card>
                ) : null
              ) : (
                <Card>
                  <View style={{ gap: spacing.sm }}>
                    <Text style={[typography.title, { color: palette.text, fontSize: 16 }]}>
                      Remark (optional)
                    </Text>
                    <TextInput
                      style={{
                        borderColor: palette.border,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        color: palette.text,
                        minHeight: 80,
                        padding: spacing.sm,
                        textAlignVertical: 'top',
                      }}
                      value={remark}
                      onChangeText={setRemark}
                      placeholder="Add a note for your partner…"
                      placeholderTextColor={palette.mutedText}
                      multiline
                    />
                  </View>
                </Card>
              )}

              {/* General Proofs */}
              <Card>
                <View style={{ gap: spacing.md }}>
                  <Text style={[typography.title, { color: palette.text, fontSize: 16 }]}>
                    General Proof Images
                  </Text>
                  <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                    General proof photos of your study day.
                  </Text>

                  {/* Submitted general proofs */}
                  {isSubmitted && proofsArray.filter((p: any) => !p.task_id).length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                      {proofsArray
                        .filter((p: any) => !p.task_id)
                        .map((proof: any) => {
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
                                    borderRadius: radius.md,
                                    borderWidth: 1,
                                    borderColor: palette.border,
                                  }}
                                />
                              ) : (
                                <View
                                  style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: radius.md,
                                    backgroundColor: palette.surface,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <ActivityIndicator size="small" color={palette.primary} />
                                </View>
                              )}
                            </View>
                          );
                        })}
                    </View>
                  )}

                  {/* Local general proofs (before submit) */}
                  {!isSubmitted && pickedImages.filter((img) => !img.taskId).length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                      {pickedImages
                        .filter((img) => !img.taskId)
                        .map((img, i) => (
                          <View key={i}>
                            <Image
                              source={{ uri: img.uri }}
                              style={{
                                width: 80,
                                height: 80,
                                borderRadius: radius.md,
                                borderWidth: 1,
                                borderColor: palette.border,
                              }}
                            />
                            <Pressable
                              onPress={() => removePickedImage(img)}
                              style={{
                                position: 'absolute',
                                top: -5,
                                right: -5,
                                backgroundColor: '#ef4444',
                                borderRadius: 10,
                                width: 20,
                                height: 20,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>×</Text>
                            </Pressable>
                          </View>
                        ))}
                    </View>
                  )}

                  <Pressable
                    onPress={() => void (isSubmitted ? pickAndUploadProof() : pickLocalProof())}
                    disabled={uploadingTaskId !== null}
                    style={{
                      borderColor: palette.primary,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      padding: spacing.sm,
                      alignItems: 'center',
                      opacity: uploadingTaskId !== null ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ color: palette.primary, fontWeight: '600' }}>
                      {uploadingTaskId === 'general' ? 'Uploading…' : '+ Add General Proof Image'}
                    </Text>
                  </Pressable>
                </View>
              </Card>

              {/* Submit / Done */}
              {isSubmitted ? (
                <Card>
                  <View style={{ gap: spacing.sm, alignItems: 'center' }}>
                    <Text style={{ fontSize: 32 }}>✅</Text>
                    <Text style={[typography.title, { color: palette.text }]}>Day submitted!</Text>
                    <Text style={{ color: palette.mutedText, textAlign: 'center' }}>
                      Your partner has been notified. You can still upload extra proof images above.
                    </Text>
                    <Button onPress={() => router.back()}>
                      Back to Accountability
                    </Button>
                  </View>
                </Card>
              ) : (
                <Card>
                  <View style={{ gap: spacing.sm }}>
                    {pickedImages.length === 0 ? (
                      <View
                        style={{
                          backgroundColor: `${palette.primary}15`,
                          borderColor: palette.primary,
                          borderRadius: radius.md,
                          borderWidth: 1,
                          padding: spacing.sm,
                        }}
                      >
                        <Text style={{ color: palette.primary, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                          📸 Add at least 1 proof image above before submitting
                        </Text>
                        <Text style={{ color: palette.mutedText, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                          Attach proof to individual tasks or add general proof images to show your work.
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          backgroundColor: `${palette.primary}15`,
                          borderRadius: radius.md,
                          padding: spacing.sm,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: spacing.xs,
                        }}
                      >
                        <Text style={{ fontSize: 16 }}>✅</Text>
                        <Text style={{ color: palette.primary, fontSize: 13, fontWeight: '600' }}>
                          {pickedImages.length} proof{pickedImages.length > 1 ? 's' : ''} attached — ready to submit!
                        </Text>
                      </View>
                    )}
                    <Button
                      disabled={isSending || currentTasks.length === 0 || pickedImages.length === 0}
                      onPress={() => void handleSend()}
                    >
                      {isSending ? 'Sending…' : `Send to Partner (${pickedImages.length} proof${pickedImages.length !== 1 ? 's' : ''})`}
                    </Button>
                  </View>
                </Card>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
