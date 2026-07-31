import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { Button } from './ui/button';
import { Card } from './ui/card';

// Types
export interface BuiltInCard {
  id: string;
  subject: string;
  topic: string;
  front: string;
  back: string;
  image?: string;
}

export interface UserFlashcard {
  id: string;
  collection_id: string;
  created_by: string;
  type: 'user';
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
  flashcard_schedule?: {
    next_review: string;
    last_review: string;
    ease_factor: number;
    interval_days: number;
    repetitions: number;
  } | null;
}

export interface FolderCollection {
  id: string;
  title: string;
  description: string | null;
}

// 1. Flashcard component (Preview/List mode)
export function Flashcard({
  question,
  answer,
  onEdit,
  onDelete,
  onMove,
}: {
  question: string;
  answer: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onMove?: () => void;
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Card style={[styles.cardItem, { borderColor: palette.border }]}>
      <View style={{ gap: spacing.xs, flex: 1 }}>
        <Text style={[styles.cardLabel, { color: palette.mutedText }]}>QUESTION</Text>
        <Text style={{ color: palette.text, fontSize: 15, fontWeight: '600' }} numberOfLines={3}>
          {question}
        </Text>
        
        <View style={[styles.divider, { backgroundColor: palette.border, marginVertical: spacing.xs }]} />
        
        <Text style={[styles.cardLabel, { color: palette.primary }]}>ANSWER</Text>
        <Text style={{ color: palette.mutedText, fontSize: 14 }} numberOfLines={3}>
          {answer}
        </Text>
      </View>

      <View style={styles.actionRow}>
        {onEdit && (
          <Pressable style={styles.actionButton} onPress={onEdit}>
            <Text style={{ color: palette.primary, fontSize: 13, fontWeight: '700' }}>✏️ Edit</Text>
          </Pressable>
        )}
        {onMove && (
          <Pressable style={styles.actionButton} onPress={onMove}>
            <Text style={{ color: palette.mutedText, fontSize: 13, fontWeight: '700' }}>📦 Move</Text>
          </Pressable>
        )}
        {onDelete && (
          <Pressable style={styles.actionButton} onPress={onDelete}>
            <Text style={{ color: palette.danger, fontSize: 13, fontWeight: '700' }}>🗑️ Delete</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
}

// 2. FolderCard component
export function FolderCard({
  name,
  onPress,
  onRename,
  onMove,
  onDelete,
}: {
  name: string;
  onPress: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Card style={[styles.folderCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <Pressable style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }} onPress={onPress}>
        <Text style={{ fontSize: 24 }}>📁</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: palette.text, fontSize: 15 }} numberOfLines={1}>
            {name}
          </Text>
        </View>
      </Pressable>

      <View style={styles.folderActions}>
        {onRename && (
          <Pressable style={styles.iconButton} onPress={onRename}>
            <Text style={{ fontSize: 12, color: palette.mutedText }}>Rename</Text>
          </Pressable>
        )}
        {onMove && (
          <Pressable style={styles.iconButton} onPress={onMove}>
            <Text style={{ fontSize: 12, color: palette.primary }}>Move</Text>
          </Pressable>
        )}
        {onDelete && (
          <Pressable style={styles.iconButton} onPress={onDelete}>
            <Text style={{ fontSize: 12, color: palette.danger }}>Delete</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
}

// 3. FolderBreadcrumb component
export function FolderBreadcrumb({
  currentPath,
  onNavigate,
}: {
  currentPath: string[];
  onNavigate: (path: string[]) => void;
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={styles.breadcrumbContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbScroll}>
        <Pressable onPress={() => onNavigate([])} style={styles.breadcrumbItem}>
          <Text style={[styles.breadcrumbText, { color: palette.primary, fontWeight: currentPath.length === 0 ? '800' : '600' }]}>
            🏠 Root
          </Text>
        </Pressable>

        {currentPath.map((folder, index) => {
          const isLast = index === currentPath.length - 1;
          return (
            <View key={index} style={styles.breadcrumbSegment}>
              <Text style={{ color: palette.mutedText, marginHorizontal: 4 }}>/</Text>
              <Pressable
                onPress={() => onNavigate(currentPath.slice(0, index + 1))}
                style={styles.breadcrumbItem}
              >
                <Text
                  style={[
                    styles.breadcrumbText,
                    {
                      color: isLast ? palette.text : palette.primary,
                      fontWeight: isLast ? '700' : '600',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {folder}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// 4. FlashcardViewer component (Inside review session)
export function FlashcardViewer({
  front,
  back,
  revealed,
  onReveal,
  type,
  image,
}: {
  front: string;
  back: string;
  revealed: boolean;
  onReveal: () => void;
  type: 'builtin' | 'user';
  image?: string;
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Card style={[styles.viewerCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View style={{ position: 'absolute', top: spacing.md, left: spacing.md, right: spacing.md, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[styles.badge, { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border, borderWidth: 1 }]}>
          {type === 'builtin' ? '📖 Revision Note' : '✍️ Custom Card'}
        </Text>
      </View>

      <View style={styles.cardContent}>
        {!revealed ? (
          <View style={styles.faceContainer}>
            <Text style={[styles.mainText, { color: palette.text }]}>{front}</Text>
          </View>
        ) : (
          <View style={styles.faceContainer}>
            <Text style={[styles.mainText, { color: palette.text, opacity: 0.6, fontSize: 16, marginBottom: spacing.md }]}>
              {front}
            </Text>
            <View style={[styles.divider, { backgroundColor: palette.border, width: 120, alignSelf: 'center', marginBottom: spacing.md }]} />
            <Text style={[styles.mainText, { color: palette.primary, fontWeight: '700' }]}>
              {back}
            </Text>
          </View>
        )}
      </View>

      {!revealed && (
        <Button style={styles.revealButton} onPress={onReveal}>
          👁️ Reveal Answer
        </Button>
      )}
    </Card>
  );
}

// 5. ReviewButtons component
export function ReviewButtons({
  onRate,
}: {
  onRate: (rating: 'again' | 'hard' | 'good' | 'easy') => void;
}) {
  return (
    <View style={styles.reviewButtonsRow}>
      <Pressable style={[styles.rateButton, { backgroundColor: '#EF4444' }]} onPress={() => onRate('again')}>
        <Text style={styles.rateButtonText}>😫 Again</Text>
      </Pressable>
      <Pressable style={[styles.rateButton, { backgroundColor: '#F59E0B' }]} onPress={() => onRate('hard')}>
        <Text style={styles.rateButtonText}>😕 Hard</Text>
      </Pressable>
      <Pressable style={[styles.rateButton, { backgroundColor: '#3B82F6' }]} onPress={() => onRate('good')}>
        <Text style={styles.rateButtonText}>🙂 Good</Text>
      </Pressable>
      <Pressable style={[styles.rateButton, { backgroundColor: '#10B981' }]} onPress={() => onRate('easy')}>
        <Text style={styles.rateButtonText}>🤩 Easy</Text>
      </Pressable>
    </View>
  );
}

// 6. ReviewProgress component
export function ReviewProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const percent = total > 0 ? (current / total) * 100 : 0;

  return (
    <View style={styles.progressContainer}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, color: palette.mutedText, fontWeight: '600' }}>
          Session Progress
        </Text>
        <Text style={{ fontSize: 12, color: palette.primary, fontWeight: '700' }}>
          {current} / {total} Cards
        </Text>
      </View>
      <View style={[styles.progressBarBg, { backgroundColor: palette.border }]}>
        <View style={[styles.progressBarFill, { backgroundColor: palette.primary, width: `${percent}%` }]} />
      </View>
    </View>
  );
}

// 7. DueTodayCard component
export function DueTodayCard({
  dueCount,
  streak,
  onStartReview,
}: {
  dueCount: number;
  streak: number;
  onStartReview: () => void;
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Card style={[styles.dueCard, { borderColor: palette.border }]}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Text style={{ fontSize: 44 }}>🧠</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: palette.text }}>
          {dueCount} Cards Due Today
        </Text>
        <Text style={{ fontSize: 13, color: palette.mutedText, textAlign: 'center', paddingHorizontal: spacing.sm }}>
          Revising daily items guarantees memory retention. Only due items require your focus today.
        </Text>

        <View style={styles.statsStreakContainer}>
          <Text style={{ fontSize: 13, color: palette.text, fontWeight: '700' }}>
            🔥 Revision Streak: <Text style={{ color: palette.primary }}>{streak} Days</Text>
          </Text>
        </View>

        <Button
          disabled={dueCount === 0}
          style={{ width: '100%', height: 50, marginTop: spacing.xs }}
          onPress={onStartReview}
        >
          🚀 Start Review
        </Button>
      </View>
    </Card>
  );
}

// 8. SubjectCard component
export function SubjectCard({
  subject,
  cardCount,
  onPress,
}: {
  subject: string;
  cardCount: number;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Card style={[styles.topicItem, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <Pressable onPress={onPress} style={styles.pressableItem}>
        <View>
          <Text style={{ fontWeight: '700', color: palette.text, fontSize: 16 }}>{subject}</Text>
          <Text style={{ color: palette.mutedText, fontSize: 12, marginTop: 2 }}>
            {cardCount} flashcards available
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: palette.mutedText }}>➡️</Text>
      </Pressable>
    </Card>
  );
}

// 9. TopicCard component
export function TopicCard({
  topic,
  cardCount,
  onPress,
}: {
  topic: string;
  cardCount: number;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Card style={[styles.topicItem, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <Pressable onPress={onPress} style={styles.pressableItem}>
        <View>
          <Text style={{ fontWeight: '700', color: palette.text, fontSize: 16 }}>{topic}</Text>
          <Text style={{ color: palette.mutedText, fontSize: 12, marginTop: 2 }}>
            {cardCount} cards in topic
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: palette.mutedText }}>➡️</Text>
      </Pressable>
    </Card>
  );
}

// 10. FlashcardEditor component (Modal form)
export function FlashcardEditor({
  visible,
  mode,
  front,
  back,
  onChangeFront,
  onChangeBack,
  onSave,
  onCancel,
}: {
  visible: boolean;
  mode: 'create' | 'edit';
  front: string;
  back: string;
  onChangeFront: (text: string) => void;
  onChangeBack: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Card style={{ width: '90%', gap: spacing.md }}>
          <Text style={{ fontWeight: '700', fontSize: 16, color: palette.text }}>
            {mode === 'create' ? 'Add Flashcard' : 'Edit Flashcard'}
          </Text>

          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: palette.mutedText }}>FRONT SIDE (Question)</Text>
            <TextInput
              value={front}
              onChangeText={onChangeFront}
              placeholder="Enter Question (Front side)..."
              multiline
              style={[styles.modalInput, { height: 90, borderColor: palette.border, color: palette.text, backgroundColor: palette.background }]}
              placeholderTextColor={palette.mutedText}
            />
          </View>

          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: palette.mutedText }}>BACK SIDE (Answer)</Text>
            <TextInput
              value={back}
              onChangeText={onChangeBack}
              placeholder="Enter Answer (Back side)..."
              multiline
              style={[styles.modalInput, { height: 90, borderColor: palette.border, color: palette.text, backgroundColor: palette.background }]}
              placeholderTextColor={palette.mutedText}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', marginTop: spacing.xs }}>
            <Button
              style={{ backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.border }}
              onPress={onCancel}
            >
              <Text style={{ color: palette.text }}>Cancel</Text>
            </Button>
            <Button onPress={onSave}>Save</Button>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

// 11. Folder Selector / Mover Modal
export function FolderSelectorModal({
  visible,
  folders,
  currentFolderId,
  onSelect,
  onCancel,
  targetType,
}: {
  visible: boolean;
  folders: { id: string; title: string }[];
  currentFolderId?: string;
  onSelect: (folderId: string) => void;
  onCancel: () => void;
  targetType: 'card' | 'folder';
}) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Card style={{ width: '85%', maxHeight: '70%', gap: spacing.md }}>
          <Text style={{ fontWeight: '700', fontSize: 16, color: palette.text }}>
            Move {targetType === 'card' ? 'Flashcard' : 'Folder'}
          </Text>
          <Text style={{ fontSize: 13, color: palette.mutedText }}>
            Select the destination folder:
          </Text>

          <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={true}>
            <View style={{ gap: spacing.xs }}>
              {/* Root option */}
              <Pressable
                onPress={() => onSelect('root')}
                style={[
                  styles.selectFolderItem,
                  {
                    borderColor: palette.border,
                    backgroundColor: currentFolderId === 'root' ? palette.border : 'transparent',
                  },
                ]}
              >
                <Text style={{ fontWeight: '700', color: palette.text }}>🏠 Root Directory</Text>
              </Pressable>

              {folders.map((folder) => {
                if (folder.id === currentFolderId) return null; // Can't move into itself
                return (
                  <Pressable
                    key={folder.id}
                    onPress={() => onSelect(folder.id)}
                    style={[
                      styles.selectFolderItem,
                      {
                        borderColor: palette.border,
                        backgroundColor: currentFolderId === folder.id ? palette.border : 'transparent',
                      },
                    ]}
                  >
                    <Text style={{ color: palette.text }}>📁 {folder.title}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs }}>
            <Button
              style={{ backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.border }}
              onPress={onCancel}
            >
              <Text style={{ color: palette.text }}>Cancel</Text>
            </Button>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cardItem: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  folderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  folderActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    padding: 4,
  },
  breadcrumbContainer: {
    marginBottom: spacing.sm,
  },
  breadcrumbScroll: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  breadcrumbItem: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  breadcrumbSegment: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbText: {
    fontSize: 14,
  },
  viewerCard: {
    flex: 1,
    minHeight: 250,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginVertical: spacing.lg,
  },
  faceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  mainText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
  },
  revealButton: {
    width: '100%',
    height: 48,
  },
  reviewButtonsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    width: '100%',
  },
  rateButton: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  rateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  progressContainer: {
    width: '100%',
    marginBottom: spacing.xs,
  },
  progressBarBg: {
    height: 8,
    borderRadius: radius.full,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  dueCard: {
    padding: spacing.lg,
  },
  statsStreakContainer: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  topicItem: {
    marginBottom: spacing.sm,
    padding: 0,
    overflow: 'hidden',
  },
  pressableItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  selectFolderItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 4,
  },
});
