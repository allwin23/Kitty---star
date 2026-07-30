/**
 * PomodoroModal — starts a countdown for a selected task and records a completed
 * pomodoro session via pomodoroService.complete() when the user finishes.
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, Text, useColorScheme, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { pomodoroService } from '@/services/backend';
import { queryKeys } from '@/lib/query-keys';
import { colors, radius, spacing, typography } from '@/theme';
import { Loading } from '@/components/ui';
import type { TodoTask } from './todo-list';

const FOCUS_DURATION = 25; // minutes default

type PomodoroModalProps = {
  visible: boolean;
  task: TodoTask | null;
  planId: string;
  onClose: () => void;
};

export function PomodoroModal({ visible, task, planId, onClose }: PomodoroModalProps) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const queryClient = useQueryClient();

  const [secondsLeft, setSecondsLeft] = useState(FOCUS_DURATION * 60);
  const [running, setRunning] = useState(false);
  const startedAtRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when a new task is selected
  useEffect(() => {
    if (visible) {
      setSecondsLeft(FOCUS_DURATION * 60);
      setRunning(false);
      startedAtRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, task?.id]);

  const completeMutation = useMutation({
    mutationFn: (vars: { startedAt: string; endedAt: string }) =>
      pomodoroService.complete({
        planId,
        taskId: task!.id,
        duration: FOCUS_DURATION,
        sessionType: 'focus',
        startedAt: vars.startedAt,
        endedAt: vars.endedAt,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(new Date().toISOString().slice(0, 10)) });
      onClose();
    },
    onError: (e: Error) => {
      Alert.alert('Error', e.message);
    },
  });

  const startTimer = () => {
    startedAtRef.current = new Date().toISOString();
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
  };

  const finishNow = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    const endedAt = new Date().toISOString();
    completeMutation.mutate({
      startedAt: startedAtRef.current ?? new Date(Date.now() - FOCUS_DURATION * 60 * 1000).toISOString(),
      endedAt,
    });
  };

  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const secs = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          padding: spacing.lg,
        }}
      >
        <View
          style={{
            backgroundColor: palette.background,
            borderRadius: radius.lg,
            padding: spacing.xl,
            gap: spacing.lg,
            alignItems: 'center',
          }}
        >
          <Text style={[typography.title, { color: palette.text }]}>🍅 Pomodoro</Text>
          {task ? (
            <Text style={{ color: palette.mutedText, textAlign: 'center' }}>{task.title}</Text>
          ) : null}

          {/* Timer */}
          <Text style={{ fontSize: 56, fontWeight: '700', color: palette.primary, fontVariant: ['tabular-nums'] }}>
            {mins}:{secs}
          </Text>

          {completeMutation.isPending ? (
            <Loading />
          ) : (
            <View style={{ gap: spacing.sm, width: '100%' }}>
              {!running ? (
                <Pressable
                  onPress={startTimer}
                  style={{
                    backgroundColor: palette.primary,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: palette.primaryText, fontWeight: '600' }}>
                    {startedAtRef.current ? 'Resume' : 'Start'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={pauseTimer}
                  style={{
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    borderWidth: 1,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: palette.text, fontWeight: '600' }}>Pause</Text>
                </Pressable>
              )}

              {startedAtRef.current ? (
                <Pressable
                  onPress={finishNow}
                  style={{
                    backgroundColor: palette.surface,
                    borderColor: palette.primary,
                    borderWidth: 1,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: palette.primary, fontWeight: '600' }}>Finish & Record</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={onClose}
                style={{ padding: spacing.sm, alignItems: 'center' }}
              >
                <Text style={{ color: palette.mutedText }}>Close</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
