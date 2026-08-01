/**
 * TodoList — reusable task list component.
 *
 * Used in:
 *  - Prior Planning (create/edit draft tasks)
 *  - Today's Live Todo (edit current_tasks via plannerService)
 *
 * Props decide whether the list is editable or read-only.
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { CompanionBus } from '@/features/companion/event-bus';
import { EventBus } from '@/features/notifications/event-bus';
import { useAuthStore } from '@/stores';

export type TodoTask = {
  id: string;
  title: string;
  estimated_minutes: number;
  status?: 'pending' | 'completed';
  completed_pomodoros?: number;
  order: number;
};

type TodoListProps = {
  tasks: TodoTask[];
  readOnly?: boolean;
  /** Called when checkbox is toggled (complete/incomplete task). `null` means not supported. */
  onToggle?: (task: TodoTask) => Promise<void>;
  /** Called when a task title/minutes is saved inline. */
  onEdit?: (task: TodoTask, title: string, minutes: number) => Promise<void>;
  /** Called when delete icon pressed. */
  onDelete?: (taskId: string) => Promise<void>;
  /** Called to start a pomodoro for a task. */
  onPomodoro?: (task: TodoTask) => void;
  /** Called when the add-task form is submitted. */
  onAdd?: (title: string, minutes: number) => Promise<void>;
  /** Show pomodoro column. */
  showPomodoro?: boolean;
  savingId?: string | null;
};

export function TodoList({
  tasks,
  readOnly = false,
  onToggle,
  onEdit,
  onDelete,
  onPomodoro,
  onAdd,
  showPomodoro = false,
  savingId,
}: TodoListProps) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const user = useAuthStore((s) => s.user);

  const handleToggle = async (task: TodoTask) => {
    const isNowDone = task.status !== 'completed';
    await onToggle?.(task);
    if (isNowDone) {
      CompanionBus.emit({
        eventType: 'DailyGoalAchieved',
        priority: 'high',
        payload: { taskTitle: task.title },
      });
      if (user?.id) {
        EventBus.emit({
          type: 'GoalCompleted',
          userId: user.id,
          data: { taskTitle: task.title },
        });
      }
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMinutes, setEditMinutes] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addMinutes, setAddMinutes] = useState('25');
  const [adding, setAdding] = useState(false);

  const startEdit = (task: TodoTask) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditMinutes(String(task.estimated_minutes));
  };

  const saveEdit = async (task: TodoTask) => {
    const mins = parseInt(editMinutes, 10);
    if (!editTitle.trim() || isNaN(mins) || mins < 1) return;
    await onEdit?.(task, editTitle.trim(), mins);
    setEditingId(null);
  };

  const handleAdd = async () => {
    const mins = parseInt(addMinutes, 10);
    if (!addTitle.trim() || isNaN(mins) || mins < 1) return;
    setAdding(true);
    try {
      await onAdd?.(addTitle.trim(), mins);
      setAddTitle('');
      setAddMinutes('25');
      setAddOpen(false);
    } finally {
      setAdding(false);
    }
  };

  const confirmDelete = (task: TodoTask) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Delete "${task.title}"?`);
      if (confirmed) {
        void onDelete?.(task.id);
      }
      return;
    }

    Alert.alert('Delete task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void onDelete?.(task.id) },
    ]);
  };

  const inputStyle = {
    borderColor: palette.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: palette.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 14,
  };

  return (
    <View style={{ gap: spacing.sm }}>
      {tasks.length === 0 ? (
        <Text style={{ color: palette.mutedText, textAlign: 'center', paddingVertical: spacing.md }}>
          No tasks yet.
        </Text>
      ) : null}

      {tasks.map((task) => {
        const isEditing = editingId === task.id;
        const isSaving = savingId === task.id;
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
            {isEditing ? (
              <View style={{ gap: spacing.xs }}>
                <TextInput
                  style={inputStyle}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Task title"
                  placeholderTextColor={palette.mutedText}
                  autoFocus
                />
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                  <TextInput
                    style={[inputStyle, { flex: 1 }]}
                    value={editMinutes}
                    onChangeText={setEditMinutes}
                    keyboardType="number-pad"
                    placeholder="Minutes"
                    placeholderTextColor={palette.mutedText}
                  />
                  <Text style={{ color: palette.mutedText, fontSize: 13 }}>min</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Pressable
                    onPress={() => void saveEdit(task)}
                    style={{
                      backgroundColor: palette.primary,
                      borderRadius: radius.sm,
                      paddingHorizontal: spacing.md,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ color: palette.primaryText, fontSize: 13, fontWeight: '600' }}>
                      Save
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setEditingId(null)}
                    style={{
                      borderColor: palette.border,
                      borderRadius: radius.sm,
                      borderWidth: 1,
                      paddingHorizontal: spacing.md,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ color: palette.text, fontSize: 13 }}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                {/* Checkbox */}
                {onToggle ? (
                  <Pressable
                    onPress={() => void handleToggle(task)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: isDone ? palette.primary : palette.border,
                      backgroundColor: isDone ? palette.primary : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 2,
                    }}
                  >
                    {isDone ? (
                      <Text style={{ color: palette.primaryText, fontSize: 12, fontWeight: '700' }}>
                        ✓
                      </Text>
                    ) : null}
                  </Pressable>
                ) : (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: isDone ? palette.primary : palette.border,
                      backgroundColor: isDone ? palette.primary : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 2,
                    }}
                  >
                    {isDone ? (
                      <Text style={{ color: palette.primaryText, fontSize: 12, fontWeight: '700' }}>
                        ✓
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Title + meta */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      typography.body,
                      {
                        color: palette.text,
                        textDecorationLine: isDone ? 'line-through' : 'none',
                        opacity: isDone ? 0.6 : 1,
                      },
                    ]}
                  >
                    {task.title}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 2 }}>
                    <Text style={{ color: palette.mutedText, fontSize: 12 }}>
                      {task.estimated_minutes} min
                    </Text>
                    {showPomodoro && task.completed_pomodoros !== undefined ? (
                      <Text style={{ color: palette.mutedText, fontSize: 12 }}>
                        🍅 {task.completed_pomodoros}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Actions */}
                {isSaving ? (
                  <ActivityIndicator size="small" color={palette.primary} />
                ) : (
                  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                    {!readOnly && onEdit ? (
                      <Pressable
                        onPress={() => startEdit(task)}
                        style={{
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 4,
                          borderRadius: radius.sm,
                          borderWidth: 1,
                          borderColor: palette.border,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: palette.text }}>Edit</Text>
                      </Pressable>
                    ) : null}
                    {!readOnly && onDelete ? (
                      <Pressable
                        onPress={() => confirmDelete(task)}
                        style={{
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 4,
                          borderRadius: radius.sm,
                          borderWidth: 1,
                          borderColor: palette.danger,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: palette.danger }}>Del</Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* Add task */}
      {!readOnly && onAdd ? (
        <View>
          {addOpen ? (
            <View
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                borderRadius: radius.md,
                borderWidth: 1,
                padding: spacing.sm,
                gap: spacing.xs,
              }}
            >
              <TextInput
                style={inputStyle}
                value={addTitle}
                onChangeText={setAddTitle}
                placeholder="Task title"
                placeholderTextColor={palette.mutedText}
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                <TextInput
                  style={[inputStyle, { flex: 1 }]}
                  value={addMinutes}
                  onChangeText={setAddMinutes}
                  keyboardType="number-pad"
                  placeholder="Minutes"
                  placeholderTextColor={palette.mutedText}
                />
                <Text style={{ color: palette.mutedText, fontSize: 13 }}>min</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Pressable
                  onPress={() => void handleAdd()}
                  disabled={adding}
                  style={{
                    backgroundColor: palette.primary,
                    borderRadius: radius.sm,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 6,
                    opacity: adding ? 0.6 : 1,
                  }}
                >
                  {adding ? (
                    <ActivityIndicator size="small" color={palette.primaryText} />
                  ) : (
                    <Text style={{ color: palette.primaryText, fontSize: 13, fontWeight: '600' }}>
                      Add
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => { setAddOpen(false); setAddTitle(''); setAddMinutes('25'); }}
                  style={{
                    borderColor: palette.border,
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: palette.text, fontSize: 13 }}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setAddOpen(true)}
              style={{
                borderColor: palette.border,
                borderRadius: radius.md,
                borderWidth: 1,
                borderStyle: 'dashed',
                padding: spacing.sm,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: palette.primary, fontWeight: '600' }}>+ Add task</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}
