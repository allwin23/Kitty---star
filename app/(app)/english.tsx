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

// UI components
import { Screen, Card, Button, Loading } from '@/components/ui';

// Theme tokens
import { colors, radius, spacing, typography } from '@/theme';

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
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
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
  // Without this guard, currentWords is [] on first render and the query never fires
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

  // Refetch stats when the screen is focused — empty deps prevents infinite loop
  useFocusEffect(
    useCallback(() => {
      void vocabStatsQ.refetch();
      void grammarStatsQ.refetch();
      void grammarHistoryQ.refetch();
      void learnedTodayQ.refetch();
    }, [])
  );

  // Mutations
  const markLearnedMutation = useMutation({
    mutationFn: (wordId: string) => vocabularyService.markLearned({ word_id: wordId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vocabulary-learned-today'] });
      void queryClient.invalidateQueries({ queryKey: ['vocabulary-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['mascot-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['mascot-unread'] });
    },
    onError: (err: any) => {
      Alert.alert('Action Failed', err?.message || 'Could not mark word as learned.');
    },
  });

  const finishGrammarQuizMutation = useMutation({
    mutationFn: (input: { topic: string; correct: number; wrong: number; score: number; set_name: string }) =>
      grammarService.finishGrammarQuiz(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['grammar-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['grammar-history'] });
      void queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['mascot-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['mascot-unread'] });
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
      // Invalidate user activity feed to refresh user-stats, mascot-feed, etc.
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
    // Filter questions by topic
    let pool = grammarData;
    if (selectedTopic !== 'All') {
      pool = grammarData.filter((q) => q.topic === selectedTopic);
    }

    // Pick 5 random questions (or fewer if pool is smaller)
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
      // Quiz finished, calculate score
      let correct = 0;
      let wrong = 0;

      quizQuestions.forEach((q) => {
        const userAnswer = quizAnswers[q.id];
        const correctIndex = q.answer - 1; // 1-indexed in JSON
        if (userAnswer === correctIndex) {
          correct++;
        } else {
          wrong++;
        }
      });

      const score = correct * 10; // 10 XP per correct question
      const topicLabel = selectedTopic === 'All' ? 'Mixed Grammar' : selectedTopic;

      // Submit quiz results to backend
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

  // Filter dictionary words based on search query and category
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

  // Determine if Writing Practice has been completed today
  // Since the DB doesn't have a table for writing, we track it in Zustand
  const writingCompleted = evaluation !== null;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[typography.heading, { color: palette.text, fontSize: 24 }]}>
                Daily English Practice
              </Text>
              <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                Complete the daily pillars to master vocabulary and communication.
              </Text>
            </View>
            {activeTab !== 'home' && (
              <Button
                onPress={() => {
                  setActiveTab('home');
                  setQuizState('idle');
                }}
                style={styles.backButton}
              >
                ◀ Home
              </Button>
            )}
          </View>

          {/* HOME VIEW */}
          {activeTab === 'home' && (
            <View style={{ gap: spacing.md }}>
              {/* Daily Goals Summary */}
              <DailyGoalCard
                vocabStats={vocabStats}
                grammarStats={grammarStats}
                writingCompleted={writingCompleted}
              />

              {/* Pillars Navigation Cards */}
              <View style={{ gap: spacing.sm }}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Learning Pillars</Text>

                {/* 1. Vocabulary Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.pillarCard,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                  onPress={() => setActiveTab('vocab')}
                >
                  <View style={styles.pillarLeft}>
                    <Text style={styles.pillarEmoji}>📖</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pillarTitle, { color: palette.text }]}>Vocabulary Builder</Text>
                      <Text style={[styles.pillarDesc, { color: palette.mutedText }]}>
                        Learn 5 new daily words. Rotating dataset.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.pillarStatus}>
                    <Text style={{ color: palette.primary, fontWeight: '700' }}>
                      {vocabStats?.today_words ?? 0}/5
                    </Text>
                    <Text style={{ fontSize: 10, color: palette.mutedText }}>Words</Text>
                  </View>
                </Pressable>

                {/* 2. Grammar Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.pillarCard,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                  onPress={() => {
                    setActiveTab('grammar');
                    setQuizState('idle');
                  }}
                >
                  <View style={styles.pillarLeft}>
                    <Text style={styles.pillarEmoji}>📝</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pillarTitle, { color: palette.text }]}>Grammar Quizzes</Text>
                      <Text style={[styles.pillarDesc, { color: palette.mutedText }]}>
                        reinforce grammar with interactive topic quizzes.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.pillarStatus}>
                    <Text style={{ color: '#047857', fontWeight: '700' }}>
                      {grammarStats?.today_questions ?? 0}
                    </Text>
                    <Text style={{ fontSize: 10, color: palette.mutedText }}>Solved</Text>
                  </View>
                </Pressable>

                {/* 3. Writing Practice Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.pillarCard,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      opacity: !allWordsLearnedToday ? 0.6 : pressed ? 0.9 : 1,
                    },
                  ]}
                  disabled={!allWordsLearnedToday}
                  onPress={() => setActiveTab('writing')}
                >
                  <View style={styles.pillarLeft}>
                    <Text style={styles.pillarEmoji}>✍️</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.pillarTitle, { color: palette.text }]}>
                          AI Writing Practice
                        </Text>
                        {!allWordsLearnedToday && (
                          <View style={styles.lockBadge}>
                            <Text style={styles.lockText}>🔒 Locked</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.pillarDesc, { color: palette.mutedText }]}>
                        {"Write a paragraph using today's words. Reviewed by Gemini."}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.pillarStatus}>
                    <Text
                      style={{
                        color: writingCompleted ? '#10B981' : palette.mutedText,
                        fontWeight: '700',
                      }}
                    >
                      {writingCompleted ? 'Done' : 'Pending'}
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
              <Card style={{ borderColor: palette.border }}>
                <Text style={{ fontWeight: '700', color: palette.text, marginBottom: spacing.xs }}>
                  Developer Rotation Control
                </Text>
                <Text style={{ fontSize: 12, color: palette.mutedText, marginBottom: spacing.sm }}>
                  Exhausted words? Force-reset the daily rotation cycle to select 5 new random words.
                </Text>
                <Button onPress={resetDailyWords}>Force Rotate Words</Button>
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
                <Text style={[styles.sectionTitle, { color: palette.text }]}>🔎 Vocabulary Dictionary</Text>
                <Text style={{ color: palette.mutedText, fontSize: 12 }}>
                  Search and study all words from our vocabulary dataset.
                </Text>

                <TextInput
                  style={[
                    styles.searchInput,
                    {
                      color: palette.text,
                      borderColor: palette.border,
                      backgroundColor: palette.surface,
                    },
                  ]}
                  placeholder="Search word or meaning..."
                  placeholderTextColor={palette.mutedText}
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
                          backgroundColor: selectedCategory === cat ? palette.primary : palette.surface,
                          borderColor: selectedCategory === cat ? palette.primary : palette.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: selectedCategory === cat ? '#FFFFFF' : palette.text,
                          fontWeight: selectedCategory === cat ? '700' : '400',
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
                          backgroundColor: pressed ? palette.border : palette.surface,
                          borderColor: palette.border,
                        },
                      ]}
                      onPress={() => setSelectedWordDetail(w)}
                    >
                      <View>
                        <Text style={[styles.dictWord, { color: palette.text }]}>{w.word}</Text>
                        <Text style={{ fontSize: 11, color: palette.primary, fontStyle: 'italic' }}>
                          {w.partOfSpeech}
                        </Text>
                      </View>
                      <Text style={[styles.dictMeaning, { color: palette.mutedText }]} numberOfLines={1}>
                        {w.meaning}
                      </Text>
                    </Pressable>
                  ))}
                  {filteredWords.length === 0 && (
                    <Text style={{ color: palette.mutedText, fontStyle: 'italic', textAlign: 'center' }}>
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
                    <Text style={[styles.sectionTitle, { color: palette.text }]}>📝 Grammar Quiz Setup</Text>
                    <Text style={{ color: palette.mutedText, fontSize: 13 }}>
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
                              backgroundColor: selectedTopic === topic ? palette.primary : palette.surface,
                              borderColor: selectedTopic === topic ? palette.primary : palette.border,
                              opacity: pressed ? 0.9 : 1,
                            },
                          ]}
                          onPress={() => setSelectedTopic(topic)}
                        >
                          <Text
                            style={{
                              color: selectedTopic === topic ? '#FFFFFF' : palette.text,
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
                      🚀 Start 5-Question Quiz
                    </Button>
                  </Card>

                  {/* History Section */}
                  <Card style={{ gap: spacing.sm }}>
                    <Text style={[styles.sectionTitle, { color: palette.text }]}>📊 Quiz History</Text>
                    {grammarHistoryQ.isLoading ? (
                      <ActivityIndicator size="small" color={palette.primary} />
                    ) : historyList.length > 0 ? (
                      <View style={{ gap: spacing.sm }}>
                        {historyList.map((h: any) => {
                          const date = new Date(h.completed_at).toLocaleDateString();
                          const accuracy =
                            h.correct + h.wrong > 0
                              ? Math.round((h.correct / (h.correct + h.wrong)) * 100)
                              : 0;
                          return (
                            <View
                              key={h.id}
                              style={[
                                styles.historyRow,
                                { borderColor: palette.border, backgroundColor: palette.surface },
                              ]}
                            >
                              <View>
                                <Text style={{ fontWeight: '700', color: palette.text }}>{h.topic}</Text>
                                <Text style={{ fontSize: 11, color: palette.mutedText }}>{date}</Text>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text
                                  style={{
                                    fontWeight: '700',
                                    color: accuracy >= 80 ? '#10B981' : '#F59E0B',
                                  }}
                                >
                                  {h.correct}/{h.correct + h.wrong} Correct
                                </Text>
                                <Text style={{ fontSize: 11, color: palette.primary }}>+{h.score} XP</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={{ fontStyle: 'italic', color: palette.mutedText }}>
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
                    // Clear the evaluation state to write another paragraph
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

// 10. DailyGoalCard implementation
interface DailyGoalCardProps {
  vocabStats: any;
  grammarStats: any;
  writingCompleted: boolean;
}

function DailyGoalCard({ vocabStats, grammarStats, writingCompleted }: DailyGoalCardProps) {
  const scheme = useColorScheme();
  const palette = colors[scheme === 'dark' ? 'dark' : 'light'];

  const vocabDone = vocabStats?.today_words && vocabStats.today_words >= 5;
  const grammarDone = grammarStats?.today_questions && grammarStats.today_questions > 0;

  const totalTasks = 3;
  let doneTasks = 0;
  if (vocabDone) doneTasks++;
  if (grammarDone) doneTasks++;
  if (writingCompleted) doneTasks++;

  const progressPct = Math.round((doneTasks / totalTasks) * 100);

  return (
    <Card style={[styles.goalHeaderCard, { borderColor: palette.primary }]}>
      <Text style={[styles.goalHeaderTitle, { color: palette.text }]}>🎯 Daily practice goals</Text>
      <View style={styles.goalRowContainer}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 13, color: palette.mutedText }}>
            Complete all daily tasks to keep your streak alive!
          </Text>
          <View style={[styles.goalBarBg, { backgroundColor: palette.border }]}>
            <View
              style={[
                styles.goalBarFill,
                { backgroundColor: palette.primary, width: `${progressPct}%` },
              ]}
            />
          </View>
          <Text style={{ fontSize: 11, color: palette.primary, fontWeight: '700' }}>
            {progressPct}% Completed ({doneTasks}/{totalTasks})
          </Text>
        </View>
        <View style={styles.goalStreakContainer}>
          <Text style={styles.goalStreakEmoji}>🔥</Text>
          <Text style={[styles.goalStreakVal, { color: palette.text }]}>
            {vocabStats?.current_streak ?? 0}
          </Text>
          <Text style={{ fontSize: 10, color: palette.mutedText }}>Streak</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  backButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  pillarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  pillarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  pillarEmoji: {
    fontSize: 30,
  },
  pillarTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  pillarDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  pillarStatus: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  lockBadge: {
    backgroundColor: '#FFEFEF',
    borderColor: '#FFD1D1',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  lockText: {
    color: '#D32F2F',
    fontSize: 10,
    fontWeight: '700',
  },
  searchInput: {
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  catBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
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
    borderWidth: 1,
  },
  dictWord: {
    fontSize: 15,
    fontWeight: '700',
  },
  dictMeaning: {
    fontSize: 13,
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '50%',
  },
  topicSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  topicOptionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  goalHeaderCard: {
    borderWidth: 2,
    gap: spacing.xs,
    padding: spacing.md,
  },
  goalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  goalRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  goalBarBg: {
    height: 8,
    borderRadius: radius.full,
    marginVertical: 4,
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
  goalStreakEmoji: {
    fontSize: 22,
  },
  goalStreakVal: {
    fontSize: 16,
    fontWeight: '700',
  },
});
