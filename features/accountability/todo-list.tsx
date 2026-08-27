import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { glassCardStyle, palette, radius, spacing } from '@/theme';
import { CompanionBus } from '@/features/companion/event-bus';
import { EventBus } from '@/features/notifications/event-bus';
import { useAuthStore } from '@/stores';
import { useGrowthAnimStore } from '@/stores/growth-anim-store';

export type TodoTask = {
  id: string;
  title: string;
  estimated_minutes: number;
  completed_minutes?: number;
  status?: 'pending' | 'completed';
  completed_pomodoros?: number;
  order: number;
};

type TodoListProps = {
  tasks: TodoTask[];
  readOnly?: boolean;
  onToggle?: (task: TodoTask) => Promise<void>;
  onEdit?: (task: TodoTask, title: string, minutes: number) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  onPomodoro?: (task: TodoTask) => void;
  onAdd?: (title: string, minutes: number) => Promise<void>;
  showPomodoro?: boolean;
  savingId?: string | null;
};

// Focus-aware Pink Text Input component
function PinkTextInput({ style, onFocus, onBlur, placeholderTextColor, ...props }: TextInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      placeholderTextColor={placeholderTextColor ?? palette.textMuted}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        {
          backgroundColor: 'rgba(255, 243, 245, 0.85)',
          borderColor: focused ? palette.cherryBloom : 'rgba(250, 215, 224, 0.90)',
          borderRadius: radius.input,
          borderWidth: 1.5,
          color: palette.textPrimary,
          paddingHorizontal: spacing[12],
          paddingVertical: 8,
          fontSize: 14,
        },
        Platform.OS === 'web' && ({
          outline: focused ? `2px solid ${palette.cherryBloom}` : 'none',
          outlineOffset: 1,
        } as any),
        style,
      ]}
      {...props}
    />
  );
}

export function TodoList({
  tasks,
  readOnly = false,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  showPomodoro = false,
  savingId,
}: TodoListProps) {
  const user = useAuthStore((s) => s.user);

  const handleToggle = async (task: TodoTask) => {
    const isNowDone = task.status !== 'completed';
    await onToggle?.(task);
    if (isNowDone) {
      useGrowthAnimStore.getState().queueXp(15);
      CompanionBus.emit({
        eventType: 'DailyGoalAchieved',
        priority: 'high',
        payload: { taskTitle: task.title },
      });
      if (user?.id) {
        EventBus.emit({
          type: 'GoalCompleted',
          userId: user.id,
          targetId: task.id,
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

  return (
    <View style={{ gap: spacing[8] }}>
      {tasks.length === 0 ? (
        <Text style={{ color: palette.textSecondary, textAlign: 'center', paddingVertical: spacing[12], fontSize: 13 }}>
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
              borderRadius: 16,
              padding: spacing[12],
              gap: spacing[8],
              backgroundColor: isDone ? 'rgba(255, 245, 247, 0.40)' : 'rgba(255, 240, 243, 0.75)',
              borderColor: isDone ? 'rgba(232, 77, 114, 0.12)' : 'rgba(232, 77, 114, 0.22)',
              borderWidth: 1,
            }}
          >
            {isEditing ? (
              <View style={{ gap: spacing[8] }}>
                <PinkTextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Task title"
                  autoFocus
                />
                <View style={{ flexDirection: 'row', gap: spacing[8], alignItems: 'center' }}>
                  <PinkTextInput
                    style={{ flex: 1 }}
                    value={editMinutes}
                    onChangeText={setEditMinutes}
                    keyboardType="number-pad"
                    placeholder="Minutes"
                  />
                  <Text style={{ color: palette.textSecondary, fontSize: 13 }}>min</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing[8] }}>
                  <Pressable
                    onPress={() => void saveEdit(task)}
                    style={{
                      backgroundColor: palette.cherryBloom,
                      borderRadius: radius.button,
                      paddingHorizontal: spacing[16],
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: palette.warmWhite, fontSize: 13, fontWeight: '700' }}>
                      Save
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setEditingId(null)}
                    style={{
                      backgroundColor: palette.blush,
                      borderRadius: radius.button,
                      paddingHorizontal: spacing[16],
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[12] }}>
                {/* Checkbox */}
                {onToggle ? (
                  <Pressable
                    onPress={() => void handleToggle(task)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: radius.pill,
                      borderWidth: 2,
                      borderColor: isDone ? palette.cherryBloom : 'rgba(232, 77, 114, 0.35)',
                      backgroundColor: isDone ? palette.cherryBloom : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isDone ? (
                      <Text style={{ color: palette.warmWhite, fontSize: 11, fontWeight: '800' }}>
                        ✓
                      </Text>
                    ) : null}
                  </Pressable>
                ) : (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: radius.pill,
                      borderWidth: 2,
                      borderColor: isDone ? palette.cherryBloom : 'rgba(232, 77, 114, 0.35)',
                      backgroundColor: isDone ? palette.cherryBloom : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isDone ? (
                      <Text style={{ color: palette.warmWhite, fontSize: 11, fontWeight: '800' }}>
                        ✓
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Title + meta */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      {
                        fontSize: 15,
                        fontWeight: '600',
                        color: isDone ? palette.textMuted : palette.textPrimary,
                        textDecorationLine: isDone ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {task.title}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing[8], marginTop: 2, flexWrap: 'wrap' }}>
                    <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '600' }}>
                      ⏳ {task.completed_minutes !== undefined ? `${task.completed_minutes}/${task.estimated_minutes}` : `${task.estimated_minutes}`} min
                      {task.completed_minutes !== undefined && task.completed_minutes > task.estimated_minutes ? ` 🔥 (+${task.completed_minutes - task.estimated_minutes}m Overtime)` : ''}
                    </Text>
                    {showPomodoro && task.completed_pomodoros !== undefined ? (
                      <Text style={{ color: palette.cherryBloom, fontSize: 12, fontWeight: '700' }}>
                        🍅 {task.completed_pomodoros}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Actions */}
                {isSaving ? (
                  <ActivityIndicator size="small" color={palette.cherryBloom} />
                ) : (
                  <View style={{ flexDirection: 'row', gap: spacing[4] }}>
                    {!readOnly && onEdit ? (
                      <Pressable
                        onPress={() => startEdit(task)}
                        style={{
                          paddingHorizontal: spacing[12],
                          paddingVertical: 4,
                          borderRadius: radius.pill,
                          backgroundColor: palette.blush,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: palette.cherryBloom, fontWeight: '700' }}>Edit</Text>
                      </Pressable>
                    ) : null}
                    {!readOnly && onDelete ? (
                      <Pressable
                        onPress={() => confirmDelete(task)}
                        style={{
                          paddingHorizontal: spacing[12],
                          paddingVertical: 4,
                          borderRadius: radius.pill,
                          backgroundColor: 'rgba(217, 76, 97, 0.12)',
                        }}
                      >
                        <Text style={{ fontSize: 12, color: palette.danger, fontWeight: '700' }}>Del</Text>
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
        <View style={{ marginTop: spacing[4] }}>
          {addOpen ? (
            <View
              style={[
                glassCardStyle,
                {
                  borderRadius: radius.card,
                  padding: spacing[12],
                  gap: spacing[8],
                  backgroundColor: 'rgba(255, 243, 245, 0.75)',
                  borderColor: 'rgba(250, 215, 224, 0.85)',
                },
              ]}
            >
              <PinkTextInput
                value={addTitle}
                onChangeText={setAddTitle}
                placeholder="Task title"
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: spacing[8], alignItems: 'center' }}>
                <PinkTextInput
                  style={{ flex: 1 }}
                  value={addMinutes}
                  onChangeText={setAddMinutes}
                  keyboardType="number-pad"
                  placeholder="Minutes"
                />
                <Text style={{ color: palette.textSecondary, fontSize: 13 }}>min</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing[8] }}>
                <Pressable
                  onPress={() => void handleAdd()}
                  disabled={adding}
                  style={{
                    backgroundColor: palette.cherryBloom,
                    borderRadius: radius.button,
                    paddingHorizontal: spacing[16],
                    paddingVertical: 8,
                    opacity: adding ? 0.6 : 1,
                  }}
                >
                  {adding ? (
                    <ActivityIndicator size="small" color={palette.warmWhite} />
                  ) : (
                    <Text style={{ color: palette.warmWhite, fontSize: 13, fontWeight: '700' }}>
                      Add Task
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => { setAddOpen(false); setAddTitle(''); setAddMinutes('25'); }}
                  style={{
                    backgroundColor: palette.blush,
                    borderRadius: radius.button,
                    paddingHorizontal: spacing[16],
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setAddOpen(true)}
              style={{
                borderColor: 'rgba(232, 77, 114, 0.35)',
                borderRadius: radius.card,
                borderWidth: 1,
                borderStyle: 'dashed',
                backgroundColor: 'rgba(255, 245, 247, 0.45)',
                padding: spacing[12],
                alignItems: 'center',
              }}
            >
              <Text style={{ color: palette.cherryBloom, fontWeight: '700', fontSize: 14 }}>+ Add New Task</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}
