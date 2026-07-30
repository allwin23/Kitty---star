/**
 * Submission Screen
 *
 * Flow:
 *  1. Show Initial Plan (read-only) vs Current Tasks side-by-side context
 *  2. Show current tasks with completion status
 *  3. Allow uploading multiple proofs (image picker)
 *  4. Add optional remark
 *  5. Submit via submissionService.submit()
 *  6. After submit → allow uploading more proofs
 *  7. Navigate back on completion
 */
import { useState } from 'react';
import {
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
import * as ImagePicker from 'expo-image-picker';

import { submissionService, plannerService } from '@/services/backend';
import { getInitialPlan, getCurrentPlan } from '@/services/planner-read.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores';
import { Button, Card, ErrorState, Loading, Screen } from '@/components/ui';
import { TodoList, type TodoTask } from '@/features/accountability/todo-list';
import { colors, radius, spacing, typography } from '@/theme';

const today = new Date().toISOString().slice(0, 10);

export default function SubmitScreen() {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const queryClient = useQueryClient();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const user = useAuthStore((s) => s.user);

  const [remark, setRemark] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [proofs, setProofs] = useState<{ uri: string; caption: string }[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

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

  const completedCount = currentTasks.filter((t) => t.status === 'completed').length;

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: () => submissionService.submit(planId, remark.trim() || undefined),
    onSuccess: (data) => {
      setSubmittedId((data as { id: string }).id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.mySubmission(today) });
    },
    onError: (e: Error) => Alert.alert('Submission failed', e.message),
  });

  // Pick and upload a proof image
  const pickAndUploadProof = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const validExt = (['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? (ext === 'jpeg' ? 'jpg' : ext) : 'jpg') as 'jpg' | 'png' | 'webp';

    if (!submittedId || !user) {
      Alert.alert('Submit first', 'Submit your day before uploading proofs.');
      return;
    }

    const idx = proofs.length;
    setUploadingIndex(idx);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      await submissionService.uploadProof(submittedId, user.id, blob, validExt);
      setProofs((prev) => [...prev, { uri: asset.uri, caption: '' }]);
    } catch (e) {
      Alert.alert('Upload failed', (e as Error).message);
    } finally {
      setUploadingIndex(null);
    }
  };

  const isLoading = initialQ.isLoading || currentQ.isLoading;
  const isSubmitted = !!submittedId;

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
              Submit to Partner
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
                    This is what you planned at the start of the day.
                  </Text>
                  <TodoList tasks={initialTasks} readOnly />
                </View>
              </Card>

              <Card>
                <View style={{ gap: spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[typography.title, { color: palette.text, fontSize: 16 }]}>
                      Final Todo List
                    </Text>
                    <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                      {completedCount}/{currentTasks.length} done
                    </Text>
                  </View>
                  <TodoList tasks={currentTasks} readOnly showPomodoro />
                </View>
              </Card>

              {/* Remark */}
              {!isSubmitted ? (
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
              ) : null}

              {/* Proofs */}
              <Card>
                <View style={{ gap: spacing.md }}>
                  <Text style={[typography.title, { color: palette.text, fontSize: 16 }]}>
                    Proof Images
                  </Text>
                  <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                    {isSubmitted
                      ? 'Upload screenshots or photos as proof of your work.'
                      : 'Submit first to enable proof upload.'}
                  </Text>

                  {/* Uploaded proofs preview */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                    {proofs.map((p, i) => (
                      <Image
                        key={i}
                        source={{ uri: p.uri }}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: radius.md,
                          borderWidth: 1,
                          borderColor: palette.border,
                        }}
                      />
                    ))}
                    {uploadingIndex !== null ? (
                      <View
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: radius.md,
                          borderWidth: 1,
                          borderColor: palette.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: palette.surface,
                        }}
                      >
                        <Loading />
                      </View>
                    ) : null}
                  </View>

                  {isSubmitted ? (
                    <Pressable
                      onPress={() => void pickAndUploadProof()}
                      disabled={uploadingIndex !== null}
                      style={{
                        borderColor: palette.primary,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderStyle: 'dashed',
                        padding: spacing.sm,
                        alignItems: 'center',
                        opacity: uploadingIndex !== null ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ color: palette.primary, fontWeight: '600' }}>
                        + Add Proof Image
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </Card>

              {/* Submit / Done */}
              {isSubmitted ? (
                <Card>
                  <View style={{ gap: spacing.sm, alignItems: 'center' }}>
                    <Text style={{ fontSize: 32 }}>✅</Text>
                    <Text style={[typography.title, { color: palette.text }]}>Day submitted!</Text>
                    <Text style={{ color: palette.mutedText, textAlign: 'center' }}>
                      Your partner has been notified. Upload proofs above if needed.
                    </Text>
                    <Button onPress={() => router.replace('/(app)/accountability')}>
                      Back to Accountability
                    </Button>
                  </View>
                </Card>
              ) : (
                <Button
                  disabled={submitMutation.isPending || currentTasks.length === 0}
                  onPress={() => void submitMutation.mutateAsync()}
                >
                  {submitMutation.isPending ? 'Submitting…' : 'Submit Day to Partner'}
                </Button>
              )}

              {submitMutation.isError ? (
                <ErrorState error={(submitMutation.error as Error).message} />
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
