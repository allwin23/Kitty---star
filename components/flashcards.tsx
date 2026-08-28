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
import {
  Book,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  Eye,
  Flame,
  Folder,
  FolderInput,
  HelpCircle,
  Home,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react-native';

import { glassCardStyle, palette, radius, spacing } from '@/theme';
import { Button } from './ui/button';

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

// 1. Flashcard component (Preview/List mode) — Light Rose Glass Card
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
  return (
    <View style={[glassCardStyle, styles.pinkGlassCard, { marginBottom: spacing.sm }]}>
      <View style={{ gap: spacing.xs, flex: 1 }}>
        <Text style={[styles.cardLabel, { color: '#2A1D22' }]}>QUESTION</Text>
        <Text style={{ color: '#2A1D22', fontSize: 15, fontWeight: '700' }} numberOfLines={3}>
          {question}
        </Text>

        <View
          style={[
            styles.divider,
            { backgroundColor: 'rgba(250, 215, 224, 0.90)', marginVertical: spacing.xs },
          ]}
        />

        <Text style={[styles.cardLabel, { color: palette.danger }]}>ANSWER</Text>
        <Text style={{ color: '#66545B', fontSize: 14, fontWeight: '600' }} numberOfLines={3}>
          {answer}
        </Text>
      </View>

      <View style={styles.actionRow}>
        {onEdit && (
          <Pressable style={styles.actionButton} onPress={onEdit}>
            <Edit3 size={14} color="#D94C61" strokeWidth={2.2} />
            <Text style={{ color: '#D94C61', fontSize: 13, fontWeight: '800' }}>Edit</Text>
          </Pressable>
        )}
        {onMove && (
          <Pressable style={styles.actionButton} onPress={onMove}>
            <FolderInput size={14} color="#2A1D22" strokeWidth={2.2} />
            <Text style={{ color: '#2A1D22', fontSize: 13, fontWeight: '800' }}>Move</Text>
          </Pressable>
        )}
        {onDelete && (
          <Pressable style={styles.actionButton} onPress={onDelete}>
            <Trash2 size={14} color={palette.danger} strokeWidth={2.2} />
            <Text style={{ color: palette.danger, fontSize: 13, fontWeight: '800' }}>Delete</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// 2. FolderCard component — Light Rose Glass Card
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
  return (
    <View style={[glassCardStyle, styles.pinkGlassCard, styles.folderCardRow]}>
      <Pressable
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        onPress={onPress}
      >
        <Folder size={22} color="#D94C61" strokeWidth={2.2} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 15 }} numberOfLines={1}>
            {name}
          </Text>
        </View>
      </Pressable>

      <View style={styles.folderActions}>
        {onRename && (
          <Pressable style={styles.iconButton} onPress={onRename}>
            <Text style={{ fontSize: 12, color: '#2A1D22', fontWeight: '800' }}>Rename</Text>
          </Pressable>
        )}
        {onMove && (
          <Pressable style={styles.iconButton} onPress={onMove}>
            <Text style={{ fontSize: 12, color: '#D94C61', fontWeight: '800' }}>Move</Text>
          </Pressable>
        )}
        {onDelete && (
          <Pressable style={styles.iconButton} onPress={onDelete}>
            <Text style={{ fontSize: 12, color: palette.danger, fontWeight: '800' }}>Delete</Text>
          </Pressable>
        )}
      </View>
    </View>
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
  return (
    <View style={styles.breadcrumbContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.breadcrumbScroll}
      >
        <Pressable onPress={() => onNavigate([])} style={styles.breadcrumbItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Home size={14} color="#D94C61" strokeWidth={2.2} />
            <Text
              style={[
                styles.breadcrumbText,
                { color: '#D94C61', fontWeight: currentPath.length === 0 ? '800' : '600' },
              ]}
            >
              Root
            </Text>
          </View>
        </Pressable>

        {currentPath.map((folder, index) => {
          const isLast = index === currentPath.length - 1;
          return (
            <View key={index} style={styles.breadcrumbSegment}>
              <Text style={{ color: '#66545B', marginHorizontal: 4, fontWeight: '600' }}>/</Text>
              <Pressable
                onPress={() => onNavigate(currentPath.slice(0, index + 1))}
                style={styles.breadcrumbItem}
              >
                <Text
                  style={[
                    styles.breadcrumbText,
                    {
                      color: isLast ? '#2A1D22' : '#D94C61',
                      fontWeight: isLast ? '800' : '600',
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

// 4. FlashcardViewer component (Inside review session) — Light Rose Glass Card Flip Frame
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
  return (
    <View style={[glassCardStyle, styles.pinkGlassCard, styles.viewerCard]}>
      <View
        style={{
          position: 'absolute',
          top: spacing.md,
          left: spacing.md,
          right: spacing.md,
          flexDirection: 'row',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        <View style={styles.badge}>
          <BookOpen size={12} color="#D94C61" strokeWidth={2.2} />
          <Text style={{ color: '#D94C61', fontSize: 11, fontWeight: '800' }}>
            {type === 'builtin' ? 'Revision Note' : 'Custom Card'}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        {!revealed ? (
          <View style={styles.faceContainer}>
            <Text
              style={{
                color: '#2A1D22',
                fontSize: 20,
                fontWeight: '800',
                textAlign: 'center',
                lineHeight: 28,
              }}
            >
              {front}
            </Text>
          </View>
        ) : (
          <View style={styles.faceContainer}>
            <Text
              style={{
                color: '#66545B',
                fontSize: 15,
                fontWeight: '600',
                textAlign: 'center',
                marginBottom: spacing.md,
              }}
            >
              {front}
            </Text>
            <View
              style={[
                styles.divider,
                {
                  backgroundColor: 'rgba(250, 215, 224, 0.90)',
                  width: 140,
                  alignSelf: 'center',
                  marginBottom: spacing.md,
                },
              ]}
            />
            <Text
              style={{
                color: palette.danger,
                fontSize: 20,
                fontWeight: '800',
                textAlign: 'center',
                lineHeight: 28,
              }}
            >
              {back}
            </Text>
          </View>
        )}
      </View>

      {!revealed && (
        <Pressable style={styles.revealBtn} onPress={onReveal}>
          <Eye size={18} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>Reveal Answer</Text>
        </Pressable>
      )}
    </View>
  );
}

// 5. ReviewButtons component (Rating controls with vector icons)
export function ReviewButtons({
  onRate,
}: {
  onRate: (rating: 'again' | 'hard' | 'good' | 'easy') => void;
}) {
  return (
    <View style={styles.reviewButtonsRow}>
      <Pressable
        style={[styles.rateButton, { backgroundColor: '#EF4444' }]}
        onPress={() => onRate('again')}
      >
        <RotateCcw size={14} color="#FFFFFF" strokeWidth={2.4} />
        <Text style={styles.rateButtonText}>Again</Text>
      </Pressable>
      <Pressable
        style={[styles.rateButton, { backgroundColor: '#F59E0B' }]}
        onPress={() => onRate('hard')}
      >
        <HelpCircle size={14} color="#FFFFFF" strokeWidth={2.4} />
        <Text style={styles.rateButtonText}>Hard</Text>
      </Pressable>
      <Pressable
        style={[styles.rateButton, { backgroundColor: '#3B82F6' }]}
        onPress={() => onRate('good')}
      >
        <CheckCircle2 size={14} color="#FFFFFF" strokeWidth={2.4} />
        <Text style={styles.rateButtonText}>Good</Text>
      </Pressable>
      <Pressable
        style={[styles.rateButton, { backgroundColor: '#10B981' }]}
        onPress={() => onRate('easy')}
      >
        <Sparkles size={14} color="#FFFFFF" strokeWidth={2.4} />
        <Text style={styles.rateButtonText}>Easy</Text>
      </Pressable>
    </View>
  );
}

// 6. ReviewProgress component — Light Rose Glass Pink Carded
export function ReviewProgress({ current, total }: { current: number; total: number }) {
  const percent = total > 0 ? (current / total) * 100 : 0;

  return (
    <View style={[glassCardStyle, styles.pinkGlassCard, styles.progressContainer]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 13, color: '#2A1D22', fontWeight: '800' }}>Session Progress</Text>
        <Text style={{ fontSize: 13, color: palette.danger, fontWeight: '800' }}>
          {current} / {total} Cards
        </Text>
      </View>
      <View style={[styles.progressBarBg, { backgroundColor: 'rgba(250, 215, 224, 0.60)' }]}>
        <View
          style={[
            styles.progressBarFill,
            { backgroundColor: palette.cherryBloom, width: `${percent}%` },
          ]}
        />
      </View>
    </View>
  );
}

// 7. DueTodayCard component — Light Rose Frosted Glass
export function DueTodayCard({
  dueCount,
  streak,
  onStartReview,
}: {
  dueCount: number;
  streak: number;
  onStartReview: () => void;
}) {
  return (
    <View style={[glassCardStyle, styles.pinkGlassCard, styles.dueCard]}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: 'rgba(232, 77, 114, 0.14)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles size={28} color="#D94C61" strokeWidth={2.2} />
        </View>

        <Text style={{ fontSize: 22, fontWeight: '800', color: '#2A1D22' }}>
          {dueCount} Cards Due Today
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: '#66545B',
            fontWeight: '600',
            textAlign: 'center',
            paddingHorizontal: spacing.sm,
          }}
        >
          Revising daily items guarantees memory retention. Only due items require your focus today.
        </Text>

        <View style={styles.statsStreakContainer}>
          <Flame size={15} color="#FF9F1C" strokeWidth={2.4} />
          <Text style={{ fontSize: 13, color: '#2A1D22', fontWeight: '800' }}>
            Revision Streak: <Text style={{ color: palette.danger }}>{streak} Days</Text>
          </Text>
        </View>

        <Pressable
          disabled={dueCount === 0}
          style={[styles.primaryBtn, { width: '100%', opacity: dueCount === 0 ? 0.5 : 1 }]}
          onPress={onStartReview}
        >
          <Play size={18} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>Start Review</Text>
        </Pressable>
      </View>
    </View>
  );
}

// 8. SubjectCard component — Light Rose Frosted Glass
export function SubjectCard({
  subject,
  cardCount,
  onPress,
}: {
  subject: string;
  cardCount: number;
  onPress: () => void;
}) {
  return (
    <View style={[glassCardStyle, styles.pinkGlassCard, { marginBottom: spacing.xs }]}>
      <Pressable onPress={onPress} style={styles.pressableItem}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
          <BookOpen size={20} color="#D94C61" strokeWidth={2.2} />
          <View>
            <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 15 }}>{subject}</Text>
            <Text style={{ color: '#66545B', fontSize: 12, fontWeight: '600', marginTop: 2 }}>
              {cardCount} flashcards available
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color="#2A1D22" strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

// 9. TopicCard component — Light Rose Frosted Glass
export function TopicCard({
  topic,
  cardCount,
  onPress,
}: {
  topic: string;
  cardCount: number;
  onPress: () => void;
}) {
  return (
    <View style={[glassCardStyle, styles.pinkGlassCard, { marginBottom: spacing.xs }]}>
      <Pressable onPress={onPress} style={styles.pressableItem}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
          <Book size={18} color="#D94C61" strokeWidth={2.2} />
          <View>
            <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 15 }}>{topic}</Text>
            <Text style={{ color: '#66545B', fontSize: 12, fontWeight: '600', marginTop: 2 }}>
              {cardCount} cards in topic
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color="#2A1D22" strokeWidth={2.2} />
      </Pressable>
    </View>
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
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[glassCardStyle, styles.pinkGlassCard, { width: '90%', gap: spacing.md }]}>
          <Text style={{ fontWeight: '800', fontSize: 18, color: '#2A1D22' }}>
            {mode === 'create' ? 'Add Flashcard' : 'Edit Flashcard'}
          </Text>

          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#2A1D22' }}>
              FRONT SIDE (Question)
            </Text>
            <TextInput
              value={front}
              onChangeText={onChangeFront}
              placeholder="Enter Question (Front side)..."
              multiline
              style={[
                styles.modalInput,
                {
                  height: 90,
                  borderColor: 'rgba(250, 215, 224, 0.90)',
                  color: '#2A1D22',
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                },
              ]}
              placeholderTextColor="#66545B"
            />
          </View>

          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#2A1D22' }}>
              BACK SIDE (Answer)
            </Text>
            <TextInput
              value={back}
              onChangeText={onChangeBack}
              placeholder="Enter Answer (Back side)..."
              multiline
              style={[
                styles.modalInput,
                {
                  height: 90,
                  borderColor: 'rgba(250, 215, 224, 0.90)',
                  color: '#2A1D22',
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                },
              ]}
              placeholderTextColor="#66545B"
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              justifyContent: 'flex-end',
              marginTop: spacing.xs,
            }}
          >
            <Pressable style={styles.outlineBtn} onPress={onCancel}>
              <Text style={{ color: '#2A1D22', fontWeight: '800' }}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={onSave}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Save</Text>
            </Pressable>
          </View>
        </View>
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
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View
          style={[
            glassCardStyle,
            styles.pinkGlassCard,
            { width: '85%', maxHeight: '70%', gap: spacing.md },
          ]}
        >
          <Text style={{ fontWeight: '800', fontSize: 18, color: '#2A1D22' }}>
            Move {targetType === 'card' ? 'Flashcard' : 'Folder'}
          </Text>
          <Text style={{ fontSize: 13, color: '#66545B', fontWeight: '600' }}>
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
                    borderColor: 'rgba(250, 215, 224, 0.90)',
                    backgroundColor:
                      currentFolderId === 'root'
                        ? 'rgba(232, 77, 114, 0.14)'
                        : 'rgba(255, 255, 255, 0.85)',
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Home size={16} color="#D94C61" strokeWidth={2.2} />
                  <Text style={{ fontWeight: '800', color: '#2A1D22' }}>Root Directory</Text>
                </View>
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
                        borderColor: 'rgba(250, 215, 224, 0.90)',
                        backgroundColor:
                          currentFolderId === folder.id
                            ? 'rgba(232, 77, 114, 0.14)'
                            : 'rgba(255, 255, 255, 0.85)',
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Folder size={16} color="#D94C61" strokeWidth={2.2} />
                      <Text style={{ color: '#2A1D22', fontWeight: '700' }}>{folder.title}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: spacing.sm,
              marginTop: spacing.xs,
            }}
          >
            <Pressable style={styles.outlineBtn} onPress={onCancel}>
              <Text style={{ color: '#2A1D22', fontWeight: '800' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pinkGlassCard: {
    backgroundColor: 'rgba(255, 243, 245, 0.85)',
    borderColor: 'rgba(250, 215, 224, 0.90)',
    borderRadius: 24,
    padding: spacing.md,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  folderCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    width: '100%',
    minHeight: 250,
    maxHeight: 320,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    position: 'relative',
    marginVertical: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(232, 77, 114, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(232, 77, 114, 0.30)',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginVertical: spacing.md,
  },
  faceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: spacing.sm,
  },
  revealBtn: {
    backgroundColor: palette.cherryBloom,
    width: '100%',
    paddingVertical: 12,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reviewButtonsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    width: '100%',
  },
  rateButton: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  rateButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(250, 215, 224, 0.90)',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  pressableItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInput: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: spacing.md,
    fontSize: 14,
  },
  selectFolderItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginBottom: 6,
  },
  primaryBtn: {
    backgroundColor: palette.cherryBloom,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  outlineBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderWidth: 1.5,
    borderColor: '#E5D8DC',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
