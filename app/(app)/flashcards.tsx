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

import { Button, Card, EmptyState, HeaderTitleCard, Loading, Screen } from '@/components/ui';
import { useAuthStore, useFlashcardStore } from '@/stores';
import { palette, radius, spacing } from '@/theme';

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
    ({ type: 'builtin' | 'user'; card: BuiltInCard | UserFlashcard })[]
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
    }, [])
  );

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
      // Matches path prefix
      const isSub = parts.slice(0, currentPath.length).join('/') === currentPrefix;
      if (isSub && parts.length > currentPath.length) {
        const nextFolder = parts[currentPath.length];
        folderSet.add(nextFolder);
        // Map collection id to direct folder match if any
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
        (c) =>
          c.question.toLowerCase().includes(query) || c.answer.toLowerCase().includes(query)
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

        // Find all collections that need prefix renaming
        const targetCollections = collections.filter(
          (c) => c.title === oldPrefix || c.title.startsWith(oldPrefix + '/')
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
            // Find all collections under this folder
            const targetCols = collections.filter(
              (c) => c.title === fullFolderPath || c.title.startsWith(fullFolderPath + '/')
            );
            for (const col of targetCols) {
              await deleteCollectionMutation.mutateAsync(col.id);
            }
          },
        },
      ]
    );
  };

  // Card Operations
  const handleOpenCreateCard = () => {
    if (currentPath.length === 0) {
      Alert.alert('Cannot Create Card', 'Please enter or create a folder before adding flashcards.');
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
        Alert.alert('Invalid Move', 'Cards cannot reside in the Root directory. Move them into a folder.');
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

      // Ensure we aren't moving a folder into its own subdirectory
      if (newPrefix === oldPrefix || newPrefix.startsWith(oldPrefix + '/')) {
        Alert.alert('Invalid Move', 'Cannot move a folder into itself or its own subfolder.');
        return;
      }

      // Rename collection and all sub-collections
      const targetCollections = collections.filter(
        (c) => c.title === oldPrefix || c.title.startsWith(oldPrefix + '/')
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
      new Set(
        builtInCards
          .filter((c) => c.subject === selectedBuiltInSubject)
          .map((c) => c.topic)
      )
    );
  };
  const getBuiltInActiveCards = () => {
    if (!selectedBuiltInSubject || !selectedBuiltInTopic) return [];
    return builtInCards.filter(
      (c) => c.subject === selectedBuiltInSubject && c.topic === selectedBuiltInTopic
    );
  };

  const handleStartReviewSession = (
    cards: ({ type: 'builtin' | 'user'; card: BuiltInCard | UserFlashcard })[]
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
      (c) => c.flashcard_schedule && c.flashcard_schedule.ease_factor > 1.8
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
            ((reviewStats.hard + reviewStats.good + reviewStats.easy) / totalSessionCards) * 100
          )
        : 100;

    return (
      <Screen>
        <ScrollView contentContainerStyle={{ paddingVertical: spacing.lg }}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>✨ Review Completed!</Text>
            <Text style={{ color: palette.mutedText, fontSize: 14 }}>
              Fantastic job. Spaced repetition works best when practiced daily.
            </Text>
          </View>

          <Card style={{ marginBottom: spacing.md, gap: spacing.md }}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: palette.text }}>
              {"Today's Session Stats"}
            </Text>

            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.statValue, { color: palette.primary }]}>{totalSessionCards}</Text>
                <Text style={{ fontSize: 12, color: palette.mutedText }}>Cards Revised</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.statValue, { color: '#10B981' }]}>{sessionAccuracy}%</Text>
                <Text style={{ fontSize: 12, color: palette.mutedText }}>Accuracy</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.statValue, { color: palette.text }]}>
                  {userStats?.current_streak ?? 0}
                </Text>
                <Text style={{ fontSize: 12, color: palette.mutedText }}>Day Streak</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: palette.border }]} />

            <Text style={{ fontWeight: '600', fontSize: 14, color: palette.text }}>Rating Breakdowns</Text>

            <View style={{ gap: spacing.xs }}>
              {[
                { label: '🤩 Easy (Immediate retention)', count: reviewStats.easy, color: '#10B981' },
                { label: '🙂 Good (Normal revision)', count: reviewStats.good, color: '#3B82F6' },
                { label: '😕 Hard (Requires early retry)', count: reviewStats.hard, color: '#F59E0B' },
                { label: '😫 Again (Failed retention)', count: reviewStats.again, color: '#EF4444' },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: palette.text, fontSize: 13 }}>{item.label}</Text>
                  <Text style={{ fontWeight: '700', color: item.color }}>{item.count}</Text>
                </View>
              ))}
            </View>
          </Card>

          <View style={{ gap: spacing.sm }}>
            <Button
              onPress={() => {
                setShowSummary(false);
                setReviewMode(false);
                setActiveTab('due');
              }}
            >
              🎉 Finish Session
            </Button>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // REVIEW SESSION SCREEN
  if (reviewMode) {
    const item = reviewSessionCards[currentReviewIndex];
    const cardData = item.card;
    const frontText =
      item.type === 'user' ? (cardData as UserFlashcard).question : (cardData as BuiltInCard).front;
    const backText =
      item.type === 'user' ? (cardData as UserFlashcard).answer : (cardData as BuiltInCard).back;

    return (
      <Screen>
        <View style={{ flex: 1, gap: spacing.lg, paddingBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: palette.mutedText }}>
              Review Session
            </Text>
            <Pressable
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: radius.sm,
                borderWidth: 1,
                borderColor: palette.border,
              }}
              onPress={() =>
                Alert.alert('Quit Session?', 'Your current session progress will be saved, but the session will end.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Quit', onPress: () => setReviewMode(false) },
                ])
              }
            >
              <Text style={{ color: palette.text, fontSize: 12, fontWeight: '600' }}>Quit</Text>
            </Pressable>
          </View>

          <ReviewProgress current={currentReviewIndex + 1} total={reviewSessionCards.length} />

          {/* Flashcard Frame */}
          <FlashcardViewer
            front={frontText}
            back={backText}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            type={item.type}
          />

          {/* Rate Controls */}
          {revealed && (
            <View style={{ gap: spacing.xs }}>
              <Text style={{ textAlign: 'center', color: palette.mutedText, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>
                How well did you remember?
              </Text>
              <ReviewButtons onRate={handleRateCard} />
            </View>
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {/* Header navigation */}
        <HeaderTitleCard
          title="Smart Flashcards ⚡"
          subtitle="Spaced repetition schedules designed specifically for maximum long-term memory retention"
          style={{ marginBottom: spacing[16] }}
        />


        {/* Navigation Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: palette.border }]}>
          {[
            { key: 'due' as const, label: `⭐ Due Today (${dueSessionCards.length})` },
            { key: 'builtin' as const, label: '📖 Revision Notes' },
            { key: 'user' as const, label: '✍️ My Flashcards' },
          ].map((t) => {
            const isAct = activeTab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => {
                  setActiveTab(t.key);
                  setCurrentPath([]);
                }}
                style={[
                  styles.tabButton,
                  isAct && { borderBottomColor: palette.primary, borderBottomWidth: 3 },
                ]}
              >
                <Text style={{ fontWeight: '700', color: isAct ? palette.primary : palette.mutedText, fontSize: 13 }}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* TAB 1: DUE TODAY */}
        {activeTab === 'due' && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ gap: spacing.md, paddingBottom: spacing['2xl'] }}>
              <DueTodayCard
                dueCount={dueSessionCards.length}
                streak={userStats?.current_streak ?? 0}
                onStartReview={() => handleStartReviewSession(dueSessionCards)}
              />

              {/* Statistics Card */}
              <Card style={{ gap: spacing.md }}>
                <Text style={{ fontWeight: '700', fontSize: 15, color: palette.text }}>Your Retention Stats</Text>
                
                <View style={styles.statsGrid}>
                  <View style={styles.statsCardCol}>
                    <Text style={[styles.statsValueMain, { color: palette.primary }]}>
                      {userCards.length + builtInCards.length}
                    </Text>
                    <Text style={styles.statsLabel}>Total Cards</Text>
                  </View>
                  <View style={styles.statsCardCol}>
                    <Text style={[styles.statsValueMain, { color: '#10B981' }]}>
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
                    <Text style={[styles.statsValueMain, { color: '#F59E0B' }]}>
                      {longestInterval} d
                    </Text>
                    <Text style={styles.statsLabel}>Max Interval</Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: palette.border }]} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: palette.mutedText }}>
                    XP Level: <Text style={{ color: palette.text, fontWeight: '700' }}>Level {userStats?.level ?? 1}</Text>
                  </Text>
                  <Text style={{ fontSize: 13, color: palette.mutedText }}>
                    Total XP: <Text style={{ color: palette.primary, fontWeight: '700' }}>{userStats?.xp ?? 0} XP</Text>
                  </Text>
                </View>
              </Card>
            </View>
          </ScrollView>
        )}

        {/* TAB 2: BUILT-IN REVISION NOTES */}
        {activeTab === 'builtin' && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ gap: spacing.md, paddingBottom: spacing['2xl'] }}>
              {!selectedBuiltInSubject ? (
                /* 1. Subjects Selection */
                <View style={{ gap: spacing.xs }}>
                  <Text style={{ fontWeight: '700', color: palette.text, marginBottom: spacing.xs }}>Subjects</Text>
                  {builtInSubjects.map((subject) => {
                    const count = builtInCards.filter((c) => c.subject === subject).length;
                    return (
                      <SubjectCard
                        key={subject}
                        subject={subject}
                        cardCount={count}
                        onPress={() => setSelectedBuiltInSubject(subject)}
                      />
                    );
                  })}
                </View>
              ) : !selectedBuiltInTopic ? (
                /* 2. Topics Selection */
                <View style={{ gap: spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: '700', color: palette.text }}>{selectedBuiltInSubject} topics</Text>
                    <Pressable
                      onPress={() => setSelectedBuiltInSubject(null)}
                      style={[styles.smallBtn, { borderColor: palette.border }]}
                    >
                      <Text style={{ color: palette.text, fontSize: 12, fontWeight: '600' }}>Back</Text>
                    </Pressable>
                  </View>

                  <View style={{ gap: spacing.xs }}>
                    {getBuiltInTopics().map((topic) => {
                      const count = builtInCards.filter(
                        (c) => c.subject === selectedBuiltInSubject && c.topic === topic
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
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text style={{ fontWeight: '700', color: palette.text, fontSize: 16 }}>{selectedBuiltInTopic}</Text>
                      <Text style={{ color: palette.mutedText, fontSize: 12, marginTop: 2 }}>
                        {getBuiltInActiveCards().length} flashcards in this topic
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                      <Pressable
                        onPress={() => setSelectedBuiltInTopic(null)}
                        style={[styles.smallBtn, { borderColor: palette.border }]}
                      >
                        <Text style={{ color: palette.text, fontSize: 12, fontWeight: '600' }}>Back</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          handleStartReviewSession(
                            getBuiltInActiveCards().map((card) => ({ type: 'builtin', card }))
                          )
                        }
                        style={styles.reviewTopicBtn}
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>⚡ Review</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={{ gap: spacing.xs }}>
                    {getBuiltInActiveCards().map((card) => (
                      <Card key={card.id}>
                        <View style={{ gap: 4 }}>
                          <Text style={{ fontWeight: '700', color: palette.text, fontSize: 14 }}>
                            Q: {card.front}
                          </Text>
                          <Text style={{ color: palette.primary, fontSize: 13, fontWeight: '600' }}>
                            A: {card.back}
                          </Text>
                        </View>
                      </Card>
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
              <Pressable
                onPress={handleOpenCreateFolder}
                style={[styles.outlineBtn, { borderColor: palette.primary }]}
              >
                <Text style={{ color: palette.primary, fontWeight: '700', fontSize: 13 }}>📁 Create Folder</Text>
              </Pressable>
              <Pressable
                onPress={handleOpenCreateCard}
                style={[
                  styles.solidBtn,
                  { backgroundColor: palette.primary },
                  currentPath.length === 0 && { opacity: 0.5 },
                ]}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>📝 Add Card</Text>
              </Pressable>
            </View>

            {/* Search filter */}
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search cards in this folder..."
              style={[
                styles.searchInput,
                { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface },
              ]}
              placeholderTextColor={palette.mutedText}
            />

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: spacing.md, paddingBottom: spacing['2xl'] }}>
                {/* Render nested Subfolders */}
                {subfolders.length > 0 && (
                  <View style={{ gap: spacing.xs }}>
                    <Text style={{ fontWeight: '800', fontSize: 11, color: palette.mutedText, letterSpacing: 0.5 }}>
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
                  <Text style={{ fontWeight: '800', fontSize: 11, color: palette.mutedText, letterSpacing: 0.5 }}>
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
          <Card style={{ width: '85%', gap: spacing.md }}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: palette.text }}>
              {folderMode === 'create' ? 'Create Folder' : 'Rename Folder'}
            </Text>

            <TextInput
              value={folderInputName}
              onChangeText={setFolderInputName}
              placeholder="Enter folder name..."
              style={[styles.modalInput, { borderColor: palette.border, color: palette.text, backgroundColor: palette.background }]}
              placeholderTextColor={palette.mutedText}
              autoFocus
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' }}>
              <Pressable
                style={[styles.smallBtn, { borderColor: palette.border }]}
                onPress={() => setFolderModalVisible(false)}
              >
                <Text style={{ color: palette.text }}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSaveBtn} onPress={handleSubmitFolder}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </Pressable>
            </View>
          </Card>
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  searchInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    fontSize: 14,
  },
  smallBtn: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtn: {
    borderRadius: radius.md,
    backgroundColor: '#3F3F46',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewTopicBtn: {
    borderRadius: radius.md,
    backgroundColor: '#3F3F46',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtn: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
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
    color: '#71717A',
    textAlign: 'center',
  },
  summaryHeader: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: 26,
    fontWeight: '800',
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
