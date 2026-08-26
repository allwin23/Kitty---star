import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import {
  BookOpen,
  ChevronLeft,
  FileText,
  Flame,
  HelpCircle,
  History,
  Lock,
  Play,
  RotateCcw,
  Search,
  SquarePen,
  Target,
} from 'lucide-react-native';

// UI components
import { Button, Card, HeaderTitleCard, Loading, Screen } from '@/components/ui';

// Theme tokens
import { colors, palette, radius, spacing } from '@/theme';

import { CompanionBus } from '@/features/companion/event-bus';
import { todayIso } from '@/lib/supabase-helpers';

// Store
import { useEnglishStore, type Word } from '@/stores/english-store';

// Services
import { vocabularyService, grammarService, writingService } from '@/services';
import { useAuthStore } from '@/stores';

// Local JSON datasets
import vocabularyData from '@/assets/data/vocabulary.json';
import grammarData from '@/assets/data/grammar.json';

// Shared modular components
import {
  VocabularyCard,
  WordDetail,
  GrammarQuestion,
  QuizResult,
  WritingEditor,
  GeminiFeedbackCard,
  StatisticsCard,
} from '@/components/english';

type TabType = 'home' | 'vocab' | 'grammar' | 'writing';
type QuizState = 'idle' | 'quiz' | 'result';

export default function EnglishScreen() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // Zustand Store values
  const {
    currentWords,
    initializeDailyWords,
    writingParagraph,
    setWritingParagraph,
    evaluation,
    setEvaluation,
    resetDailyWords,
    _hasHydrated,
  } = useEnglishStore();

  // Screen Tabs & View states
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedWordDetail, setSelectedWordDetail] = useState<Word | null>(null);

  // Vocabulary search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Grammar Quiz states
  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number | null>>({});
  const [activeQuizResult, setActiveQuizResult] = useState<{
    correct: number;
    wrong: number;
    score: number;
  } | null>(null);

  // Fetch words that are already learned today — only after store has rehydrated
  const todayWordIds = _hasHydrated ? currentWords.map((w) => w.id) : [];
  const learnedTodayQ = useQuery({
    queryKey: ['vocabulary-learned-today', todayWordIds],
    queryFn: () => vocabularyService.filterLearned(todayWordIds),
    enabled: _hasHydrated && todayWordIds.length > 0 && !!user,
  });

  const learnedWordIds = learnedTodayQ.data ?? [];
  const allWordsLearnedToday =
    _hasHydrated && currentWords.length > 0 && currentWords.every((w) => learnedWordIds.includes(w.id));

  // Initialize today's words once the store has hydrated
  useEffect(() => {
    if (_hasHydrated) {
      initializeDailyWords();
    }
  }, [_hasHydrated, initializeDailyWords]);

  // Re-fetch learned status whenever currentWords change (e.g. after rotation)
  useEffect(() => {
    if (_hasHydrated && todayWordIds.length > 0) {
      void learnedTodayQ.refetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated, todayWordIds.join(',')]);

  // Queries
  const vocabStatsQ = useQuery({
    queryKey: ['vocabulary-stats'],
    queryFn: () => vocabularyService.getStats(),
    enabled: !!user,
  });

  const grammarStatsQ = useQuery({
    queryKey: ['grammar-stats'],
    queryFn: () => grammarService.getStats(),
    enabled: !!user,
  });

  const grammarHistoryQ = useQuery({
    queryKey: ['grammar-history'],
    queryFn: () => grammarService.getHistory({ page: 1, pageSize: 10 }),
    enabled: !!user,
  });

  const [today, setToday] = useState(todayIso());

  // Midnight Auto-Refresh: Check for date rollover every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const currentToday = todayIso();
      if (currentToday !== today) {
        setToday(currentToday);
        initializeDailyWords();
        void vocabStatsQ.refetch();
        void grammarStatsQ.refetch();
        void grammarHistoryQ.refetch();
        void learnedTodayQ.refetch();
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [today, initializeDailyWords, vocabStatsQ, grammarStatsQ, grammarHistoryQ, learnedTodayQ]);

  // Refetch stats when the screen is focused
  useFocusEffect(
    useCallback(() => {
      initializeDailyWords();
      void vocabStatsQ.refetch();
      void grammarStatsQ.refetch();
      void grammarHistoryQ.refetch();
      void learnedTodayQ.refetch();
    }, [initializeDailyWords, vocabStatsQ, grammarStatsQ, grammarHistoryQ, learnedTodayQ])
  );

  // Mutations
  const markLearnedMutation = useMutation({
    mutationFn: (wordId: string) => vocabularyService.markLearned({ word_id: wordId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vocabulary-learned-today'] });
      void queryClient.invalidateQueries({ queryKey: ['vocabulary-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['journey'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
      void queryClient.invalidateQueries({ queryKey: ['mascot-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['mascot-unread'] });

      CompanionBus.emit({
        eventType: 'XPEarned',
        priority: 'normal',
        payload: { xpAmount: 10, customText: 'Learned a new English vocabulary word! +10 XP.' },
      });
    },
    onError: (err: any) => {
      Alert.alert('Action Failed', err?.message || 'Could not mark word as learned.');
    },
  });

  const finishGrammarQuizMutation = useMutation({
    mutationFn: (input: { topic: string; correct: number; wrong: number; score: number; set_name: string }) =>
      grammarService.finishGrammarQuiz(input),
    onSuccess: (_, input) => {
      void queryClient.invalidateQueries({ queryKey: ['grammar-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['grammar-history'] });
      void queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['journey'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
      void queryClient.invalidateQueries({ queryKey: ['mascot-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['mascot-unread'] });

      CompanionBus.emit({
        eventType: 'XPEarned',
        priority: 'high',
        payload: { xpAmount: 30, customText: `Completed ${input.topic} Grammar Quiz! Scored ${Math.round(input.score)}%. +30 XP.` },
      });
    },
    onError: (err: any) => {
      Alert.alert('Quiz Submission Failed', err?.message || 'Could not submit quiz results.');
    },
  });

  const evaluateWritingMutation = useMutation({
    mutationFn: (input: { words: string[]; paragraph: string }) =>
      writingService.evaluateWriting(input.words, input.paragraph),
    onSuccess: (data) => {
      setEvaluation(data);

      CompanionBus.emit({
        eventType: 'XPEarned',
        priority: 'high',
        payload: { xpAmount: 50, customText: `Daily English writing evaluated! Earned +50 XP.` },
      });
      void queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
    onError: (err: any) => {
      Alert.alert('AI Review Failed', err?.message || 'An error occurred while evaluating your paragraph.');
    },
  });

  // Handlers
  const handleMarkWordLearned = (wordId: string) => {
    markLearnedMutation.mutate(wordId);
  };

  const handleStartQuiz = () => {
    let pool = grammarData;
    if (selectedTopic !== 'All') {
      pool = grammarData.filter((q) => q.topic === selectedTopic);
    }

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);

    if (selected.length === 0) {
      Alert.alert('No Questions', 'There are no grammar questions available for the selected topic.');
      return;
    }

    setQuizQuestions(selected);
    setCurrentQuestionIndex(0);
    setQuizAnswers({});
    setActiveQuizResult(null);
    setQuizState('quiz');
  };

  const handleSelectOption = (optionIndex: number) => {
    const activeQuestion = quizQuestions[currentQuestionIndex];
    setQuizAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: optionIndex,
    }));
  };

  const handleNextQuestion = () => {
    const activeQuestion = quizQuestions[currentQuestionIndex];
    if (quizAnswers[activeQuestion.id] === undefined || quizAnswers[activeQuestion.id] === null) {
      Alert.alert('Selection Required', 'Please select an option before moving forward.');
      return;
    }

    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      let correct = 0;
      let wrong = 0;

      quizQuestions.forEach((q) => {
        const userAnswer = quizAnswers[q.id];
        const correctIndex = q.answer - 1;
        if (userAnswer === correctIndex) {
          correct++;
        } else {
          wrong++;
        }
      });

      const score = correct * 10;
      const topicLabel = selectedTopic === 'All' ? 'Mixed Grammar' : selectedTopic;

      finishGrammarQuizMutation.mutate({
        topic: topicLabel,
        correct,
        wrong,
        score,
        set_name: 'default',
      });

      setActiveQuizResult({ correct, wrong, score });
      setQuizState('result');
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmitWriting = () => {
    if (writingParagraph.trim().length < 15) {
      Alert.alert('Writing too short', 'Please write a paragraph of at least 15 characters.');
      return;
    }
    const wordsList = currentWords.map((w) => w.word);
    evaluateWritingMutation.mutate({
      words: wordsList,
      paragraph: writingParagraph,
    });
  };

  const filteredWords = vocabularyData.filter((w) => {
    const matchesSearch =
      w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.meaning.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || w.partOfSpeech === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = ['All', 'Noun', 'Verb', 'Adjective', 'Adverb'];
  const grammarTopics = ['All', ...Array.from(new Set(grammarData.map((q) => q.topic)))];

  const isLoading =
    vocabStatsQ.isLoading ||
    grammarStatsQ.isLoading ||
    learnedTodayQ.isLoading;

  if (isLoading) {
    return (
      <Screen centered>
        <Loading />
      </Screen>
    );
  }

  const vocabStats = vocabStatsQ.data ?? null;
  const grammarStats = grammarStatsQ.data ?? null;
  const historyList = grammarHistoryQ.data?.data ?? [];

  const writingCompleted = evaluation !== null;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header Title Card with Pale Pink Glass */}
          <HeaderTitleCard
            title="Daily English"
            subtitle="Complete the daily pillars to master vocabulary and communication"
          />

          {activeTab !== 'home' && (
            <Pressable
              onPress={() => {
                setActiveTab('home');
                setQuizState('idle');
              }}
              style={styles.backButtonContainer}
            >
              <ChevronLeft size={18} color={palette.danger} strokeWidth={2.4} />
              <Text style={styles.backButtonText}>Back to Home</Text>
            </Pressable>
          )}

          {/* HOME VIEW */}
          {activeTab === 'home' && (
            <View style={{ gap: spacing.md }}>
              {/* Daily Practice Goals */}
              <DailyGoalCard
                vocabStats={vocabStats}
                grammarStats={grammarStats}
                writingCompleted={writingCompleted}
              />

              {/* Learning Pillars Section */}
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.sectionHeaderTitle}>LEARNING PILLARS</Text>

                {/* 1. Vocabulary Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.pillarCard,
                    { opacity: pressed ? 0.92 : 1 },
                  ]}
                  onPress={() => setActiveTab('vocab')}
                >
                  <View style={styles.pillarLeft}>
                    <View style={[styles.pillarIconBox, { backgroundColor: '#FFE4EB', borderColor: 'rgba(232, 77, 114, 0.40)' }]}>
                      <BookOpen size={20} color="#C73A57" strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pillarTitle}>Vocabulary Builder</Text>
                      <Text style={styles.pillarDesc}>
                        Learn 5 new daily words. Rotating dataset.
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.pillarStatusPill, { backgroundColor: '#FFE4EB' }]}>
                    <Text style={[styles.pillarStatusCount, { color: '#C73A57' }]}>
                      {vocabStats?.today_words ?? 0}/5 Words
                    </Text>
                  </View>
                </Pressable>

                {/* 2. Grammar Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.pillarCard,
                    { opacity: pressed ? 0.92 : 1 },
                  ]}
                  onPress={() => {
                    setActiveTab('grammar');
                    setQuizState('idle');
                  }}
                >
                  <View style={styles.pillarLeft}>
                    <View style={[styles.pillarIconBox, { backgroundColor: '#D1FAE5', borderColor: 'rgba(16, 185, 129, 0.40)' }]}>
                      <FileText size={20} color="#047857" strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pillarTitle}>Grammar Quizzes</Text>
                      <Text style={styles.pillarDesc}>
                        Reinforce grammar with interactive topic quizzes.
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.pillarStatusPill, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[styles.pillarStatusCount, { color: '#047857' }]}>
                      {grammarStats?.today_questions ?? 0} Solved
                    </Text>
                  </View>
                </Pressable>

                {/* 3. Writing Practice Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.pillarCard,
                    { opacity: !allWordsLearnedToday ? 0.85 : pressed ? 0.92 : 1 },
                  ]}
                  disabled={!allWordsLearnedToday}
                  onPress={() => setActiveTab('writing')}
                >
                  <View style={styles.pillarLeft}>
                    <View style={[styles.pillarIconBox, { backgroundColor: '#FEF3C7', borderColor: 'rgba(245, 158, 11, 0.40)' }]}>
                      <SquarePen size={20} color="#D97706" strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.pillarTitle}>
                          AI Writing Practice
                        </Text>
                        {!allWordsLearnedToday && (
                          <View style={styles.lockBadge}>
                            <Lock size={10} color="#DC2626" strokeWidth={2.2} />
                            <Text style={styles.lockText}>Locked</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.pillarDesc}>
                        {"Write a paragraph using today's words. Reviewed by Gemini."}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.pillarStatusPill,
                      {
                        backgroundColor: writingCompleted
                          ? '#D1FAE5'
                          : !allWordsLearnedToday
                          ? '#FEE2E2'
                          : '#FEF3C7',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillarStatusCount,
                        {
                          color: writingCompleted
                            ? '#047857'
                            : !allWordsLearnedToday
                            ? '#DC2626'
                            : '#D97706',
                        },
                      ]}
                    >
                      {writingCompleted ? 'Done' : !allWordsLearnedToday ? 'Learn Words First' : 'Pending'}
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* Overall Statistics */}
              <StatisticsCard
                vocabStats={vocabStats}
                grammarStats={grammarStats}
                writingCompleted={writingCompleted}
              />

              {/* Reset Tool for Testing Daily Rotation */}
              <Card>
                <Text style={styles.sectionHeaderTitle}>
                  DEVELOPER ROTATION CONTROL
                </Text>
                <Text style={{ fontSize: 13, color: palette.textSecondary, marginTop: 4, marginBottom: spacing.sm, lineHeight: 18 }}>
                  Exhausted words? Force-reset the daily rotation cycle to select 5 new random words.
                </Text>
                <Button onPress={resetDailyWords}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <RotateCcw size={16} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Force Rotate Words</Text>
                  </View>
                </Button>
              </Card>
            </View>
          )}

          {/* VOCABULARY TAB */}
          {activeTab === 'vocab' && (
            <View style={{ gap: spacing.md }}>
              <VocabularyCard
                words={currentWords}
                learnedWordIds={learnedWordIds}
                onSelectWord={setSelectedWordDetail}
                onMarkLearned={handleMarkWordLearned}
                isMarking={markLearnedMutation.isPending}
              />

              {/* Complete Dictionary Search */}
              <Card style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Search size={18} color={palette.danger} strokeWidth={2.4} />
                  <Text style={styles.sectionHeaderTitle}>Vocabulary Dictionary</Text>
                </View>
                <Text style={{ color: palette.textSecondary, fontSize: 13, lineHeight: 18 }}>
                  Search and study all words from our vocabulary dataset.
                </Text>

                <TextInput
                  style={styles.searchInput}
                  placeholder="Search word or meaning..."
                  placeholderTextColor={palette.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />

                {/* Categories filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {categories.map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setSelectedCategory(cat)}
                      style={[
                        styles.catBadge,
                        {
                          backgroundColor: selectedCategory === cat ? palette.danger : 'rgba(255, 243, 245, 0.85)',
                          borderColor: selectedCategory === cat ? palette.danger : 'rgba(250, 215, 224, 0.85)',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: selectedCategory === cat ? '#FFFFFF' : palette.textPrimary,
                          fontWeight: selectedCategory === cat ? '800' : '600',
                          fontSize: 13,
                        }}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Filtered Words List */}
                <View style={styles.dictList}>
                  {filteredWords.map((w) => (
                    <Pressable
                      key={w.id}
                      style={({ pressed }) => [
                        styles.dictItem,
                        {
                          backgroundColor: pressed ? 'rgba(250, 215, 224, 0.5)' : 'rgba(255, 243, 245, 0.75)',
                          borderColor: 'rgba(250, 215, 224, 0.85)',
                        },
                      ]}
                      onPress={() => setSelectedWordDetail(w)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dictWord}>{w.word}</Text>
                        <Text style={{ fontSize: 12, color: palette.danger, fontWeight: '600', marginTop: 2 }}>
                          {w.partOfSpeech}
                        </Text>
                      </View>
                      <Text style={styles.dictMeaning} numberOfLines={1}>
                        {w.meaning}
                      </Text>
                    </Pressable>
                  ))}
                  {filteredWords.length === 0 && (
                    <Text style={{ color: palette.textSecondary, fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 }}>
                      No matching words found.
                    </Text>
                  )}
                </View>
              </Card>
            </View>
          )}

          {/* GRAMMAR TAB */}
          {activeTab === 'grammar' && (
            <View style={{ gap: spacing.md }}>
              {quizState === 'idle' && (
                <>
                  <Card style={{ gap: spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <HelpCircle size={18} color={palette.danger} strokeWidth={2.4} />
                      <Text style={styles.sectionHeaderTitle}>Grammar Quiz Setup</Text>
                    </View>
                    <Text style={{ color: palette.textSecondary, fontSize: 13, lineHeight: 18 }}>
                      {"Pick a grammar focus area or select 'All' for a mixed quiz."}
                    </Text>

                    {/* Topic selector */}
                    <View style={styles.topicSelectContainer}>
                      {grammarTopics.map((topic) => (
                        <Pressable
                          key={topic}
                          style={({ pressed }) => [
                            styles.topicOptionBtn,
                            {
                              backgroundColor: selectedTopic === topic ? palette.danger : 'rgba(255, 243, 245, 0.85)',
                              borderColor: selectedTopic === topic ? palette.danger : 'rgba(250, 215, 224, 0.85)',
                              opacity: pressed ? 0.9 : 1,
                            },
                          ]}
                          onPress={() => setSelectedTopic(topic)}
                        >
                          <Text
                            style={{
                              color: selectedTopic === topic ? '#FFFFFF' : palette.textPrimary,
                              fontWeight: '700',
                              fontSize: 13,
                            }}
                          >
                            {topic === 'All' ? 'All Topics Mixed' : topic}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Button onPress={handleStartQuiz} style={{ marginTop: spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Play size={16} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2.2} />
                        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Start 5-Question Quiz</Text>
                      </View>
                    </Button>
                  </Card>

                  {/* History Section */}
                  <Card style={{ gap: spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <History size={18} color={palette.danger} strokeWidth={2.4} />
                      <Text style={styles.sectionHeaderTitle}>Quiz History</Text>
                    </View>

                    {grammarHistoryQ.isLoading ? (
                      <ActivityIndicator size="small" color={palette.danger} />
                    ) : historyList.length > 0 ? (
                      <View style={{ gap: spacing.sm }}>
                        {historyList.map((h: any) => {
                          const date = new Date(h.completed_at).toLocaleDateString();
                          const accuracy =
                            h.correct + h.wrong > 0
                              ? Math.round((h.correct / (h.correct + h.wrong)) * 100)
                              : 0;
                          return (
                            <View key={h.id} style={styles.historyRow}>
                              <View>
                                <Text style={{ fontWeight: '800', color: palette.textPrimary, fontSize: 14 }}>{h.topic}</Text>
                                <Text style={{ fontSize: 12, color: palette.textSecondary, marginTop: 2 }}>{date}</Text>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text
                                  style={{
                                    fontWeight: '800',
                                    fontSize: 14,
                                    color: accuracy >= 80 ? '#10B981' : '#F59E0B',
                                  }}
                                >
                                  {h.correct}/{h.correct + h.wrong} Correct
                                </Text>
                                <Text style={{ fontSize: 12, color: palette.danger, fontWeight: '700', marginTop: 2 }}>+{h.score} XP</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={{ fontStyle: 'italic', color: palette.textSecondary, paddingVertical: 8 }}>
                        No quizzes completed yet.
                      </Text>
                    )}
                  </Card>
                </>
              )}

              {quizState === 'quiz' && quizQuestions.length > 0 && (
                <GrammarQuestion
                  question={quizQuestions[currentQuestionIndex]}
                  questionNumber={currentQuestionIndex + 1}
                  totalQuestions={quizQuestions.length}
                  selectedOptionIndex={quizAnswers[quizQuestions[currentQuestionIndex].id] ?? null}
                  onSelectOption={handleSelectOption}
                  onNext={handleNextQuestion}
                  onPrev={handlePrevQuestion}
                />
              )}

              {quizState === 'result' && activeQuizResult && (
                <QuizResult
                  correctCount={activeQuizResult.correct}
                  wrongCount={activeQuizResult.wrong}
                  score={activeQuizResult.score}
                  questions={quizQuestions}
                  userAnswers={quizAnswers}
                  onClose={() => {
                    setQuizState('idle');
                    setActiveTab('home');
                  }}
                />
              )}
            </View>
          )}

          {/* WRITING PRACTICE TAB */}
          {activeTab === 'writing' && (
            <View style={{ gap: spacing.md }}>
              {!writingCompleted ? (
                <WritingEditor
                  words={currentWords}
                  paragraph={writingParagraph}
                  onChangeParagraph={setWritingParagraph}
                  onSubmit={handleSubmitWriting}
                  isLoading={evaluateWritingMutation.isPending}
                />
              ) : (
                <GeminiFeedbackCard
                  evaluation={evaluation}
                  originalParagraph={writingParagraph}
                  onClear={() => {
                    setEvaluation(null);
                    setWritingParagraph('');
                  }}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal for Word Detail */}
      <WordDetail
        word={selectedWordDetail}
        isLearned={selectedWordDetail ? learnedWordIds.includes(selectedWordDetail.id) : false}
        onClose={() => setSelectedWordDetail(null)}
        onMarkLearned={handleMarkWordLearned}
        isMarking={markLearnedMutation.isPending}
      />
    </Screen>
  );
}

// DailyGoalCard implementation
interface DailyGoalCardProps {
  vocabStats: any;
  grammarStats: any;
  writingCompleted: boolean;
}

function DailyGoalCard({ vocabStats, grammarStats, writingCompleted }: DailyGoalCardProps) {
  const vocabDone = vocabStats?.today_words && vocabStats.today_words >= 5;
  const grammarDone = grammarStats?.today_questions && grammarStats.today_questions > 0;

  const totalTasks = 3;
  let doneTasks = 0;
  if (vocabDone) doneTasks++;
  if (grammarDone) doneTasks++;
  if (writingCompleted) doneTasks++;

  const progressPct = Math.round((doneTasks / totalTasks) * 100);

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Target size={18} color={palette.danger} strokeWidth={2.4} />
        <Text style={styles.sectionHeaderTitle}>DAILY PRACTICE GOALS</Text>
      </View>
      <View style={styles.goalRowContainer}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 13, color: palette.textSecondary, lineHeight: 18 }}>
            Complete all daily tasks to keep your streak alive!
          </Text>
          <View style={styles.goalBarBg}>
            <View
              style={[
                styles.goalBarFill,
                { backgroundColor: palette.danger, width: `${progressPct}%` },
              ]}
            />
          </View>
          <Text style={{ fontSize: 12, color: palette.danger, fontWeight: '800' }}>
            {progressPct}% Completed ({doneTasks}/{totalTasks})
          </Text>
        </View>
        <View style={styles.goalStreakContainer}>
          <Flame size={24} color="#FF9F1C" fill="#FF9F1C" strokeWidth={2.2} />
          <Text style={styles.goalStreakVal}>
            {vocabStats?.current_streak ?? 0}
          </Text>
          <Text style={{ fontSize: 11, color: palette.textSecondary, fontWeight: '600' }}>Streak</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
    paddingBottom: 120,
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 243, 245, 0.85)',
    borderColor: 'rgba(250, 215, 224, 0.85)',
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  backButtonText: {
    color: palette.danger,
    fontWeight: '800',
    fontSize: 13,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: palette.danger,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pillarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(232, 77, 114, 0.30)',
    borderWidth: 1.5,
    shadowColor: '#8A1535',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  pillarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  pillarIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(232, 77, 114, 0.14)',
    borderColor: 'rgba(232, 77, 114, 0.30)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.textPrimary,
    letterSpacing: -0.2,
  },
  pillarDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
    color: palette.textSecondary,
    fontWeight: '500',
  },
  pillarStatusPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  pillarStatusCount: {
    fontSize: 12,
    fontWeight: '800',
  },
  pillarStatusSubtext: {
    fontSize: 11,
    color: palette.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(240, 115, 146, 0.15)',
    borderColor: 'rgba(240, 115, 146, 0.35)',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lockText: {
    color: palette.danger,
    fontSize: 10,
    fontWeight: '800',
  },
  searchInput: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(250, 215, 224, 0.85)',
    backgroundColor: 'rgba(255, 247, 248, 0.9)',
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: palette.textPrimary,
    fontWeight: '500',
  },
  categoryScroll: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  catBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
    marginRight: spacing.xs,
  },
  dictList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  dictItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  dictWord: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.textPrimary,
  },
  dictMeaning: {
    fontSize: 13,
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '50%',
    color: palette.textSecondary,
    fontWeight: '500',
  },
  topicSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  topicOptionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(250, 215, 224, 0.85)',
    backgroundColor: 'rgba(255, 243, 245, 0.75)',
  },
  goalRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 4,
  },
  goalBarBg: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: 'rgba(250, 215, 224, 0.7)',
    marginVertical: 6,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  goalStreakContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  goalStreakVal: {
    fontSize: 17,
    fontWeight: '800',
    color: palette.textPrimary,
    marginTop: 2,
  },
});
