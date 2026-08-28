import { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import {
  Book,
  BookOpen,
  CheckCircle2,
  Edit3,
  Flame,
  FolderPlus,
  HelpCircle,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react-native';

import { Button, Card, EmptyState, HeaderTitleCard, Loading, Screen } from '@/components/ui';
import { useAuthStore, useFlashcardStore } from '@/stores';
import { glassCardStyle, palette, radius, spacing } from '@/theme';

import { flashcardService, reportService } from '@/services/backend';

// Import our modular components
import {
  Flashcard,
  FolderCard,
  FolderBreadcrumb,
  FlashcardViewer,
  ReviewButtons,
  ReviewProgress,
  DueTodayCard,
  SubjectCard,
  TopicCard,
  FlashcardEditor,
  FolderSelectorModal,
  type BuiltInCard,
  type UserFlashcard,
  type FolderCollection,
} from '@/components/flashcards';

// Local built-in flashcards dataset
import builtInCardsRaw from '@/assets/data/flashcards.json';
const builtInCards = builtInCardsRaw as BuiltInCard[];

type TabType = 'due' | 'builtin' | 'user';

export default function FlashcardsScreen() {
  const user = useAuthStore((s) => s.user);

  // Zustand local store for built-in card schedules
  const { localSchedules, reviewCardLocally } = useFlashcardStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('due');

  // Directory navigation state for My Flashcards
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [folderModalVisible, setFolderModalVisible] = useState<boolean>(false);
  const [folderMode, setFolderMode] = useState<'create' | 'rename'>('create');
  const [folderInputName, setFolderInputName] = useState<string>('');
  const [targetCollectionId, setTargetCollectionId] = useState<string | null>(null);

  const [cardModalVisible, setCardModalVisible] = useState<boolean>(false);
  const [cardMode, setCardMode] = useState<'create' | 'edit'>('create');
  const [cardFront, setCardFront] = useState<string>('');
  const [cardBack, setCardBack] = useState<string>('');
  const [targetCardId, setTargetCardId] = useState<string | null>(null);

  // Move Modals state
  const [moveModalVisible, setMoveModalVisible] = useState<boolean>(false);
  const [moveTargetType, setMoveTargetType] = useState<'card' | 'folder'>('card');
  const [movingCardId, setMovingCardId] = useState<string | null>(null);
  const [movingFolderName, setMovingFolderName] = useState<string | null>(null);
  const [movingFolderId, setMovingFolderId] = useState<string | null>(null);

  // Spaced repetition review states
  const [reviewMode, setReviewMode] = useState<boolean>(false);
  const [reviewSessionCards, setReviewSessionCards] = useState<
    { type: 'builtin' | 'user'; card: BuiltInCard | UserFlashcard }[]
  >([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState<number>(0);
  const [revealed, setRevealed] = useState<boolean>(false);
  const [reviewStats, setReviewStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [showSummary, setShowSummary] = useState<boolean>(false);

  // Built-in cards browsing state
  const [selectedBuiltInSubject, setSelectedBuiltInSubject] = useState<string | null>(null);
  const [selectedBuiltInTopic, setSelectedBuiltInTopic] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Queries
  const collectionsQ = useQuery({
    queryKey: ['flashcard-collections'],
    queryFn: () => flashcardService.getCollections(),
    enabled: !!user,
  });

  const cardsQ = useQuery({
    queryKey: ['user-flashcards'],
    queryFn: () => flashcardService.getFlashcards(),
    enabled: !!user,
  });

  const statsQ = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => reportService.stats(),
    enabled: !!user,
  });

  // Focus refetches — empty deps array prevents infinite loop
  useFocusEffect(
    useCallback(() => {
      void collectionsQ.refetch();
      void cardsQ.refetch();
      void statsQ.refetch();
    }, []),
  );

  // Quit Session Handler
  const handleQuitSession = () => {
    setReviewMode(false);
    setShowSummary(false);
    setCurrentReviewIndex(0);
    setRevealed(false);
    setReviewSessionCards([]);
  };

  // Mutations
  const createCollectionMutation = useMutation({
    mutationFn: flashcardService.createCollection,
    onSuccess: () => {
      void collectionsQ.refetch();
      setFolderModalVisible(false);
      setFolderInputName('');
    },
  });

  const renameCollectionMutation = useMutation({
    mutationFn: (args: { id: string; title: string }) =>
      flashcardService.updateCollection(args.id, args.title),
    onSuccess: () => {
      void collectionsQ.refetch();
      setFolderModalVisible(false);
      setFolderInputName('');
    },
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: flashcardService.deleteCollection,
    onSuccess: () => {
      void collectionsQ.refetch();
      void cardsQ.refetch();
    },
  });

  const createCardMutation = useMutation({
    mutationFn: flashcardService.create,
    onSuccess: () => {
      void cardsQ.refetch();
      void queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['journey'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
      setCardModalVisible(false);
      setCardFront('');
      setCardBack('');
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: flashcardService.update,
    onSuccess: () => {
      void cardsQ.refetch();
      setCardModalVisible(false);
      setCardFront('');
      setCardBack('');
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: flashcardService.delete,
    onSuccess: () => {
      void cardsQ.refetch();
    },
  });

  const reviewCardMutation = useMutation({
    mutationFn: flashcardService.review,
    onSuccess: () => {
      void cardsQ.refetch();
      void statsQ.refetch();
      void queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['journey'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  // Calculate stats & due today
  const collections = (collectionsQ.data ?? []) as FolderCollection[];
  const userCards = (cardsQ.data ?? []) as any as UserFlashcard[];
  const userStats = statsQ.data;

  const getDueTodayCards = () => {
    const today = new Date();

    // 1. User-created cards due today
    const dueUser = userCards
      .filter((card) => {
        const rawSched = card.flashcard_schedule;
        const sched = Array.isArray(rawSched) ? rawSched[0] : rawSched;
        if (!sched || !sched.next_review) return true; // never reviewed
        return new Date(sched.next_review) <= today;
      })
      .map((card) => ({ type: 'user' as const, card }));

    // 2. Built-in cards due today
    const dueBuiltIn = builtInCards
      .filter((card) => {
        const sched = localSchedules[card.id];
        if (!sched) return true; // never reviewed
        return new Date(sched.next_review) <= today;
      })
      .map((card) => ({ type: 'builtin' as const, card }));

    return [...dueUser, ...dueBuiltIn];
  };

  const dueSessionCards = getDueTodayCards();

  // Spaced Repetition action handler
  const handleRateCard = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    const item = reviewSessionCards[currentReviewIndex];
    if (!item) return;

    setReviewStats((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));

    if (item.type === 'user') {
      const card = item.card as UserFlashcard;
      await reviewCardMutation.mutateAsync({ card_id: card.id, rating });
    } else {
      const card = item.card as BuiltInCard;
      reviewCardLocally(card.id, rating);
    }

    if (currentReviewIndex < reviewSessionCards.length - 1) {
      setRevealed(false);
      setCurrentReviewIndex((prev) => prev + 1);
    } else {
      // Completed session! Show summary
      setShowSummary(true);
    }
  };

  // Directory structures for My Flashcards
  const getSubfoldersAndCards = () => {
    const currentPrefix = currentPath.join('/');

    // Subfolders extraction
    const folderSet = new Set<string>();
    const folderMap: Record<string, string> = {}; // folder name -> collection id

    collections.forEach((col) => {
      const parts = col.title.split('/');
      const isSub = parts.slice(0, currentPath.length).join('/') === currentPrefix;
      if (isSub && parts.length > currentPath.length) {
        const nextFolder = parts[currentPath.length];
        folderSet.add(nextFolder);
        if (parts.length === currentPath.length + 1) {
          folderMap[nextFolder] = col.id;
        }
      }
    });

    const subfolders = Array.from(folderSet).map((name) => ({
      name,
      collectionId: folderMap[name] || null,
      fullPath: [...currentPath, name],
    }));

    // Cards extraction at exact current folder level
    const currentCollection = collections.find((col) => col.title === currentPrefix);
    let cards = currentCollection
      ? userCards.filter((c) => c.collection_id === currentCollection.id)
      : [];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      cards = cards.filter(
        (c) => c.question.toLowerCase().includes(query) || c.answer.toLowerCase().includes(query),
      );
    }

    return { subfolders, cards, currentCollection };
  };

  const { subfolders, cards, currentCollection } = getSubfoldersAndCards();

  // Folder Operations
  const handleOpenCreateFolder = () => {
    setFolderMode('create');
    setFolderInputName('');
    setFolderModalVisible(true);
  };

  const handleOpenRenameFolder = (folderName: string, collectionId: string | null) => {
    setFolderMode('rename');
    setFolderInputName(folderName);
    setTargetCollectionId(collectionId);
    setFolderModalVisible(true);
  };

  const handleSubmitFolder = async () => {
    if (!folderInputName.trim()) return;

    if (folderMode === 'create') {
      const title = [...currentPath, folderInputName.trim()].join('/');
      await createCollectionMutation.mutateAsync({ title });
    } else {
      if (targetCollectionId) {
        const oldPrefix = [...currentPath, folderInputName].join('/');
        const newPrefix = [...currentPath, folderInputName.trim()].join('/');

        const targetCollections = collections.filter(
          (c) => c.title === oldPrefix || c.title.startsWith(oldPrefix + '/'),
        );

        for (const col of targetCollections) {
          let updatedTitle = col.title;
          if (col.title === oldPrefix) {
            updatedTitle = newPrefix;
          } else if (col.title.startsWith(oldPrefix + '/')) {
            updatedTitle = newPrefix + col.title.slice(oldPrefix.length);
          }
          await renameCollectionMutation.mutateAsync({ id: col.id, title: updatedTitle });
        }
      }
    }
  };

  const handleDeleteFolder = (colId: string, folderName: string) => {
    const fullFolderPath = [...currentPath, folderName].join('/');
    Alert.alert(
      'Delete Folder',
      'This will delete this folder and all subfolders and cards inside. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const targetCols = collections.filter(
              (c) => c.title === fullFolderPath || c.title.startsWith(fullFolderPath + '/'),
            );
            for (const col of targetCols) {
              await deleteCollectionMutation.mutateAsync(col.id);
            }
          },
        },
      ],
    );
  };

  // Card Operations
  const handleOpenCreateCard = () => {
    if (currentPath.length === 0) {
      Alert.alert(
        'Cannot Create Card',
        'Please enter or create a folder before adding flashcards.',
      );
      return;
    }
    setCardMode('create');
    setCardFront('');
    setCardBack('');
    setCardModalVisible(true);
  };

  const handleOpenEditCard = (card: UserFlashcard) => {
    setCardMode('edit');
    setCardFront(card.question);
    setCardBack(card.answer);
    setTargetCardId(card.id);
    setCardModalVisible(true);
  };

  const handleSubmitCard = async () => {
    if (!cardFront.trim() || !cardBack.trim()) return;

    let colId = currentCollection?.id;
    if (!colId) {
      const title = currentPath.join('/');
      const newCol = await createCollectionMutation.mutateAsync({ title });
      if (newCol?.id) {
        colId = newCol.id;
      }
    }

    if (!colId) return;

    if (cardMode === 'create') {
      await createCardMutation.mutateAsync({
        collection_id: colId,
        type: 'user',
        question: cardFront.trim(),
        answer: cardBack.trim(),
      });
    } else if (targetCardId) {
      await updateCardMutation.mutateAsync({
        card_id: targetCardId,
        collection_id: colId,
        type: 'user',
        question: cardFront.trim(),
        answer: cardBack.trim(),
      });
    }
  };

  const handleDeleteCard = (cardId: string) => {
    Alert.alert('Delete Flashcard', 'Are you sure you want to delete this card?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteCardMutation.mutate({ card_id: cardId }),
      },
    ]);
  };

  // Move Actions
  const handleOpenMoveCard = (cardId: string) => {
    setMovingCardId(cardId);
    setMoveTargetType('card');
    setMoveModalVisible(true);
  };

  const handleOpenMoveFolder = (folderName: string, collectionId: string | null) => {
    setMovingFolderName(folderName);
    setMovingFolderId(collectionId);
    setMoveTargetType('folder');
    setMoveModalVisible(true);
  };

  const handleMoveConfirm = async (destCollectionId: string) => {
    setMoveModalVisible(false);

    if (moveTargetType === 'card' && movingCardId) {
      const card = userCards.find((c) => c.id === movingCardId);
      if (!card) return;

      if (destCollectionId === 'root') {
        Alert.alert(
          'Invalid Move',
          'Cards cannot reside in the Root directory. Move them into a folder.',
        );
        return;
      }

      await updateCardMutation.mutateAsync({
        card_id: movingCardId,
        collection_id: destCollectionId,
        type: 'user',
        question: card.question,
        answer: card.answer,
      });
      Alert.alert('Moved', 'Flashcard moved successfully.');
    } else if (moveTargetType === 'folder' && movingFolderName) {
      const oldPrefix = [...currentPath, movingFolderName].join('/');
      const destCol = collections.find((c) => c.id === destCollectionId);
      const destPrefix = destCollectionId === 'root' ? '' : destCol ? destCol.title : '';

      const newPrefix = destPrefix ? `${destPrefix}/${movingFolderName}` : movingFolderName;

      if (newPrefix === oldPrefix || newPrefix.startsWith(oldPrefix + '/')) {
        Alert.alert('Invalid Move', 'Cannot move a folder into itself or its own subfolder.');
        return;
      }

      const targetCollections = collections.filter(
        (c) => c.title === oldPrefix || c.title.startsWith(oldPrefix + '/'),
      );

      for (const col of targetCollections) {
        let updatedTitle = col.title;
        if (col.title === oldPrefix) {
          updatedTitle = newPrefix;
        } else if (col.title.startsWith(oldPrefix + '/')) {
          updatedTitle = newPrefix + col.title.slice(oldPrefix.length);
        }
        await renameCollectionMutation.mutateAsync({ id: col.id, title: updatedTitle });
      }

      Alert.alert('Moved', 'Folder and its contents moved successfully.');
    }

    setMovingCardId(null);
    setMovingFolderName(null);
    setMovingFolderId(null);
  };

  // Built-in cards structure
  const builtInSubjects = Array.from(new Set(builtInCards.map((c) => c.subject)));
  const getBuiltInTopics = () => {
    if (!selectedBuiltInSubject) return [];
    return Array.from(
      new Set(builtInCards.filter((c) => c.subject === selectedBuiltInSubject).map((c) => c.topic)),
    );
  };
  const getBuiltInActiveCards = () => {
    if (!selectedBuiltInSubject || !selectedBuiltInTopic) return [];
    return builtInCards.filter(
      (c) => c.subject === selectedBuiltInSubject && c.topic === selectedBuiltInTopic,
    );
  };

  const handleStartReviewSession = (
    cards: { type: 'builtin' | 'user'; card: BuiltInCard | UserFlashcard }[],
  ) => {
    if (cards.length === 0) return;
    const shuffled = [...cards].sort(() => 0.5 - Math.random());
    setReviewSessionCards(shuffled);
    setCurrentReviewIndex(0);
    setRevealed(false);
    setReviewStats({ again: 0, hard: 0, good: 0, easy: 0 });
    setShowSummary(false);
    setReviewMode(true);
  };

  // Stats Calculations
  const getReviewedTodayCount = () => {
    const todayStr = new Date().toDateString();
    const reviewedUser = userCards.filter((card) => {
      const sched = card.flashcard_schedule;
      return sched && new Date(sched.last_review).toDateString() === todayStr;
    }).length;
    const reviewedBuiltIn = Object.values(localSchedules).filter((sched) => {
      return new Date(sched.last_review).toDateString() === todayStr;
    }).length;
    return reviewedUser + reviewedBuiltIn;
  };
  const totalReviewedToday = getReviewedTodayCount();

  const longestInterval = userCards.reduce((max, card) => {
    const sched = card.flashcard_schedule;
    if (sched && sched.interval_days > max) return sched.interval_days;
    return max;
  }, 0);

  const averageRetention = () => {
    const scheduled = userCards.filter((c) => c.flashcard_schedule);
    if (scheduled.length === 0) return 100;
    const correctSchedules = scheduled.filter(
      (c) => c.flashcard_schedule && c.flashcard_schedule.ease_factor > 1.8,
    );
    return Math.round((correctSchedules.length / scheduled.length) * 100);
  };

  // ─── RENDERING SUB-VIEWS ───────────────────────────────────────────────────

  if (collectionsQ.isLoading || cardsQ.isLoading || statsQ.isLoading) {
    return (
      <Screen centered>
        <Loading />
      </Screen>
    );
  }

  // SESSION SUMMARY VIEW
  if (showSummary) {
    const totalSessionCards = reviewSessionCards.length;
    const sessionAccuracy =
      totalSessionCards > 0
        ? Math.round(
            ((reviewStats.hard + reviewStats.good + reviewStats.easy) / totalSessionCards) * 100,
          )
        : 100;

    return (
      <Screen>
        <ScrollView
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryHeader}>
            <HeaderTitleCard title="Review Complete" showWavingHand={false} />
            <Text
              style={{
                color: '#66545B',
                fontSize: 14,
                fontWeight: '600',
                textAlign: 'center',
                marginTop: 4,
              }}
            >
              Fantastic job. Spaced repetition works best when practiced daily.
            </Text>
          </View>

          <View
            style={[
              glassCardStyle,
              styles.pinkGlassCard,
              { marginBottom: spacing.md, gap: spacing.md },
            ]}
          >
            <Text style={{ fontWeight: '800', fontSize: 16, color: '#2A1D22' }}>
              Today&apos;s Session Stats
            </Text>

            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.statValue, { color: palette.danger }]}>
                  {totalSessionCards}
                </Text>
                <Text style={{ fontSize: 12, color: '#2A1D22', fontWeight: '700' }}>
                  Cards Revised
                </Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.statValue, { color: '#16a34a' }]}>{sessionAccuracy}%</Text>
                <Text style={{ fontSize: 12, color: '#2A1D22', fontWeight: '700' }}>Accuracy</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.statValue, { color: '#FF9F1C' }]}>
                  {userStats?.current_streak ?? 0}
                </Text>
                <Text style={{ fontSize: 12, color: '#2A1D22', fontWeight: '700' }}>
                  Day Streak
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: 'rgba(250, 215, 224, 0.90)' }]} />

            <Text style={{ fontWeight: '800', fontSize: 14, color: '#2A1D22' }}>
              Rating Breakdowns
            </Text>

            <View style={{ gap: spacing.xs }}>
              {[
                { label: 'Easy (Immediate retention)', count: reviewStats.easy, color: '#16a34a' },
                { label: 'Good (Normal revision)', count: reviewStats.good, color: '#3B82F6' },
                { label: 'Hard (Requires early retry)', count: reviewStats.hard, color: '#F59E0B' },
                { label: 'Again (Failed retention)', count: reviewStats.again, color: '#EF4444' },
              ].map((item) => (
                <View
                  key={item.label}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#2A1D22', fontSize: 13, fontWeight: '700' }}>
                    {item.label}
                  </Text>
                  <Text style={{ fontWeight: '800', color: item.color }}>{item.count}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ gap: spacing.sm }}>
            <Pressable onPress={handleQuitSession} style={styles.primaryBtn}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                Finish Session
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // REVIEW SESSION SCREEN — Obsidian Black Title Card & Frosted Pink Session Card
  if (reviewMode) {
    const item = reviewSessionCards[currentReviewIndex];
    const cardData = item.card;
    const frontText =
      item.type === 'user' ? (cardData as UserFlashcard).question : (cardData as BuiltInCard).front;
    const backText =
      item.type === 'user' ? (cardData as UserFlashcard).answer : (cardData as BuiltInCard).back;

    return (
      <Screen>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'space-between',
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar: Black Component Card */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.xs,
            }}
          >
            <HeaderTitleCard title="Review Session" showWavingHand={false} />
            <Pressable style={styles.quitBtn} onPress={handleQuitSession}>
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Quit</Text>
            </Pressable>
          </View>

          {/* Frosted Pink Glass Progress Card */}
          <ReviewProgress current={currentReviewIndex + 1} total={reviewSessionCards.length} />

          {/* Centered Flashcard Frame */}
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              paddingVertical: spacing.sm,
              minHeight: 260,
            }}
          >
            <FlashcardViewer
              front={frontText}
              back={backText}
              revealed={revealed}
              onReveal={() => setRevealed(true)}
              type={item.type}
            />
          </View>

          {/* Rate Controls */}
          {revealed && (
            <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
              <Text
                style={{
                  textAlign: 'center',
                  color: '#2A1D22',
                  fontSize: 13,
                  fontWeight: '800',
                  marginBottom: 4,
                }}
              >
                How well did you remember?
              </Text>
              <ReviewButtons onRate={handleRateCard} />
            </View>
          )}
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {/* Header navigation */}
        <HeaderTitleCard
          title="Smart Flashcards"
          showWavingHand={false}
          style={{ marginBottom: spacing[16] }}
        />

        {/* Navigation Tabs */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: spacing.md }}>
          {[
            { key: 'due' as const, label: `Due Today (${dueSessionCards.length})` },
            { key: 'builtin' as const, label: 'Revision Notes' },
            { key: 'user' as const, label: 'My Flashcards' },
          ].map((t) => {
            const isAct = activeTab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => {
                  setActiveTab(t.key);
                  setCurrentPath([]);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  backgroundColor: isAct ? palette.cherryBloom : 'rgba(255, 243, 245, 0.75)',
                  borderWidth: 1.5,
                  borderColor: isAct ? palette.cherryBloom : 'rgba(250, 215, 224, 0.90)',
                }}
              >
                <Text
                  style={{ fontWeight: '800', color: isAct ? '#FFFFFF' : '#2A1D22', fontSize: 12 }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* TAB 1: DUE TODAY */}
        {activeTab === 'due' && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ gap: spacing.md, paddingBottom: 120 }}>
              <DueTodayCard
                dueCount={dueSessionCards.length}
                streak={userStats?.current_streak ?? 0}
                onStartReview={() => handleStartReviewSession(dueSessionCards)}
              />

              {/* Statistics Card */}
              <View style={[glassCardStyle, styles.pinkGlassCard]}>
                <View style={{ gap: spacing.md }}>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: '#2A1D22' }}>
                    Your Retention Stats
                  </Text>

                  <View style={styles.statsGrid}>
                    <View style={styles.statsCardCol}>
                      <Text style={[styles.statsValueMain, { color: palette.danger }]}>
                        {userCards.length + builtInCards.length}
                      </Text>
                      <Text style={styles.statsLabel}>Total Cards</Text>
                    </View>
                    <View style={styles.statsCardCol}>
                      <Text style={[styles.statsValueMain, { color: '#16a34a' }]}>
                        {totalReviewedToday}
                      </Text>
                      <Text style={styles.statsLabel}>Reviewed Today</Text>
                    </View>
                    <View style={styles.statsCardCol}>
                      <Text style={[styles.statsValueMain, { color: '#3B82F6' }]}>
                        {averageRetention()}%
                      </Text>
                      <Text style={styles.statsLabel}>Average Retention</Text>
                    </View>
                    <View style={styles.statsCardCol}>
                      <Text style={[styles.statsValueMain, { color: '#FF9F1C' }]}>
                        {longestInterval} d
                      </Text>
                      <Text style={styles.statsLabel}>Max Interval</Text>
                    </View>
                  </View>

                  <View
                    style={[styles.divider, { backgroundColor: 'rgba(250, 215, 224, 0.90)' }]}
                  />

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, color: '#2A1D22', fontWeight: '700' }}>
                      XP Level:{' '}
                      <Text style={{ color: palette.danger, fontWeight: '800' }}>
                        Level {userStats?.level ?? 1}
                      </Text>
                    </Text>
                    <Text style={{ fontSize: 13, color: '#2A1D22', fontWeight: '700' }}>
                      Total XP:{' '}
                      <Text style={{ color: palette.danger, fontWeight: '800' }}>
                        {userStats?.xp ?? 0} XP
                      </Text>
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        )}

        {/* TAB 2: BUILT-IN REVISION NOTES */}
        {activeTab === 'builtin' && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ gap: spacing.md, paddingBottom: 120 }}>
              {!selectedBuiltInSubject ? (
                /* 1. Subjects Selection */
                <View style={{ gap: spacing.xs }}>
                  <Text
                    style={{
                      fontWeight: '800',
                      color: '#2A1D22',
                      fontSize: 16,
                      marginBottom: spacing.xs,
                    }}
                  >
                    Subjects
                  </Text>
                  {builtInSubjects.length === 0 ? (
                    <View
                      style={[
                        glassCardStyle,
                        styles.pinkGlassCard,
                        { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
                      ]}
                    >
                      <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 16 }}>
                        All Custom Flashcards
                      </Text>
                      <Text
                        style={{
                          color: '#66545B',
                          fontSize: 13,
                          textAlign: 'center',
                          lineHeight: 18,
                        }}
                      >
                        Default pre-made cards have been removed. Switch to "My Flashcards" tab to
                        create your own custom folders and cards!
                      </Text>
                      <Pressable
                        onPress={() => setActiveTab('user')}
                        style={[styles.primaryBtn, { marginTop: spacing.xs }]}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                          Go to My Flashcards
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    builtInSubjects.map((subject) => {
                      const count = builtInCards.filter((c) => c.subject === subject).length;
                      return (
                        <SubjectCard
                          key={subject}
                          subject={subject}
                          cardCount={count}
                          onPress={() => setSelectedBuiltInSubject(subject)}
                        />
                      );
                    })
                  )}
                </View>
              ) : !selectedBuiltInTopic ? (
                /* 2. Topics Selection */
                <View style={{ gap: spacing.md }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 16 }}>
                      {selectedBuiltInSubject} topics
                    </Text>
                    <Pressable
                      onPress={() => setSelectedBuiltInSubject(null)}
                      style={styles.outlineBtn}
                    >
                      <Text style={{ color: '#2A1D22', fontSize: 12, fontWeight: '800' }}>
                        Back
                      </Text>
                    </Pressable>
                  </View>

                  <View style={{ gap: spacing.xs }}>
                    {getBuiltInTopics().map((topic) => {
                      const count = builtInCards.filter(
                        (c) => c.subject === selectedBuiltInSubject && c.topic === topic,
                      ).length;
                      return (
                        <TopicCard
                          key={topic}
                          topic={topic}
                          cardCount={count}
                          onPress={() => setSelectedBuiltInTopic(topic)}
                        />
                      );
                    })}
                  </View>
                </View>
              ) : (
                /* 3. Cards list in selected topic */
                <View style={{ gap: spacing.md }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 16 }}>
                        {selectedBuiltInTopic}
                      </Text>
                      <Text
                        style={{ color: '#66545B', fontSize: 12, fontWeight: '600', marginTop: 2 }}
                      >
                        {getBuiltInActiveCards().length} flashcards in this topic
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                      <Pressable
                        onPress={() => setSelectedBuiltInTopic(null)}
                        style={styles.outlineBtn}
                      >
                        <Text style={{ color: '#2A1D22', fontSize: 12, fontWeight: '800' }}>
                          Back
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          handleStartReviewSession(
                            getBuiltInActiveCards().map((card) => ({ type: 'builtin', card })),
                          )
                        }
                        style={styles.primaryBtn}
                      >
                        <Zap size={14} color="#FFFFFF" strokeWidth={2.4} />
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                          Review
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={{ gap: spacing.xs }}>
                    {getBuiltInActiveCards().map((card) => (
                      <View key={card.id} style={[glassCardStyle, styles.pinkGlassCard]}>
                        <View style={{ gap: 4 }}>
                          <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 14 }}>
                            Q: {card.front}
                          </Text>
                          <Text style={{ color: palette.danger, fontSize: 13, fontWeight: '700' }}>
                            A: {card.back}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* TAB 3: MY FLASHCARDS */}
        {activeTab === 'user' && (
          <View style={{ flex: 1 }}>
            {/* Breadcrumb controls */}
            <FolderBreadcrumb currentPath={currentPath} onNavigate={setCurrentPath} />

            {/* Folder Actions row */}
            <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm }}>
              <Pressable onPress={handleOpenCreateFolder} style={styles.outlineBtn}>
                <FolderPlus size={15} color="#2A1D22" strokeWidth={2.2} />
                <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 13 }}>
                  Create Folder
                </Text>
              </Pressable>
              <Pressable
                onPress={handleOpenCreateCard}
                style={[styles.primaryBtn, currentPath.length === 0 && { opacity: 0.5 }]}
              >
                <Plus size={15} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Add Card</Text>
              </Pressable>
            </View>

            {/* Search filter */}
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search cards in this folder..."
              style={styles.searchInput}
              placeholderTextColor="#66545B"
            />

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: spacing.md, paddingBottom: 120 }}>
                {/* Render nested Subfolders */}
                {subfolders.length > 0 && (
                  <View style={{ gap: spacing.xs }}>
                    <Text
                      style={{
                        fontWeight: '800',
                        fontSize: 12,
                        color: '#2A1D22',
                        letterSpacing: 0.5,
                      }}
                    >
                      FOLDERS
                    </Text>
                    {subfolders.map((sub) => (
                      <FolderCard
                        key={sub.name}
                        name={sub.name}
                        onPress={() => {
                          setCurrentPath(sub.fullPath);
                          setSearchQuery('');
                        }}
                        onRename={() => handleOpenRenameFolder(sub.name, sub.collectionId)}
                        onMove={() => handleOpenMoveFolder(sub.name, sub.collectionId)}
                        onDelete={
                          sub.collectionId
                            ? () => handleDeleteFolder(sub.collectionId!, sub.name)
                            : undefined
                        }
                      />
                    ))}
                  </View>
                )}

                {/* Render Flashcards at current depth */}
                <View style={{ gap: spacing.xs }}>
                  <Text
                    style={{
                      fontWeight: '800',
                      fontSize: 12,
                      color: '#2A1D22',
                      letterSpacing: 0.5,
                    }}
                  >
                    FLASHCARDS ({cards.length})
                  </Text>

                  {cards.length === 0 ? (
                    <EmptyState
                      title="No cards here"
                      description={
                        currentPath.length === 0
                          ? 'Navigate to a folder or create a new folder first.'
                          : 'Add cards using the Add Card button above.'
                      }
                    />
                  ) : (
                    cards.map((card) => (
                      <Flashcard
                        key={card.id}
                        question={card.question}
                        answer={card.answer}
                        onEdit={() => handleOpenEditCard(card)}
                        onMove={() => handleOpenMoveCard(card.id)}
                        onDelete={() => handleDeleteCard(card.id)}
                      />
                    ))
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* ─── MODALS ─── */}

      {/* Folder Create/Rename Modal */}
      <Modal visible={folderModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[glassCardStyle, styles.pinkGlassCard, { width: '85%', gap: spacing.md }]}>
            <Text style={{ fontWeight: '800', fontSize: 18, color: '#2A1D22' }}>
              {folderMode === 'create' ? 'Create Folder' : 'Rename Folder'}
            </Text>

            <TextInput
              value={folderInputName}
              onChangeText={setFolderInputName}
              placeholder="Enter folder name..."
              style={styles.modalInput}
              placeholderTextColor="#66545B"
              autoFocus
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' }}>
              <Pressable style={styles.outlineBtn} onPress={() => setFolderModalVisible(false)}>
                <Text style={{ color: '#2A1D22', fontWeight: '800' }}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={handleSubmitFolder}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Flashcard Create/Edit Modal */}
      <FlashcardEditor
        visible={cardModalVisible}
        mode={cardMode}
        front={cardFront}
        back={cardBack}
        onChangeFront={setCardFront}
        onChangeBack={setCardBack}
        onSave={handleSubmitCard}
        onCancel={() => setCardModalVisible(false)}
      />

      {/* Move Folder/Card destination selection modal */}
      <FolderSelectorModal
        visible={moveModalVisible}
        folders={collections}
        currentFolderId={movingFolderId ?? undefined}
        onSelect={handleMoveConfirm}
        onCancel={() => setMoveModalVisible(false)}
        targetType={moveTargetType}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pinkGlassCard: {
    backgroundColor: 'rgba(255, 243, 245, 0.85)',
    borderColor: 'rgba(250, 215, 224, 0.90)',
    borderRadius: 24,
    padding: spacing.md,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  searchInput: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(250, 215, 224, 0.90)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: '#2A1D22',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    marginBottom: spacing.md,
    fontWeight: '600',
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
    borderColor: 'rgba(250, 215, 224, 0.90)',
    padding: spacing.md,
    fontSize: 14,
    color: '#2A1D22',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quitBtn: {
    backgroundColor: palette.danger,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsCardCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statsValueMain: {
    fontSize: 22,
    fontWeight: '800',
  },
  statsLabel: {
    fontSize: 11,
    color: '#2A1D22',
    fontWeight: '700',
    textAlign: 'center',
  },
  summaryHeader: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  summaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
  },
});
