import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import {
  BarChart2,
  Book,
  BookOpen,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  HelpCircle,
  History,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react-native';

import { Button, Card, EmptyState, HeaderTitleCard, Loading, NotificationBadge, Screen } from '@/components/ui';
import { useAuthStore, usePyqStore } from '@/stores';
import { glassCardStyle, palette, radius, spacing, typography } from '@/theme';

import { CompanionBus } from '@/features/companion/event-bus';
import { EventBus } from '@/features/notifications/event-bus';
import {
  finishAttempt,
  getAttempt,
  getAttemptHistory,
  getStats,
  startAttempt,
  type PYQAttemptWithAnswers,
} from '@/services/pyq.service';

// Import local JSON questions dataset
import questionsData from '@/assets/data/questions.json';
import { questionImages } from '@/features/pyq/question-images';

const getNow = () => Date.now();

interface Question {
  id: string;
  year: number;
  subject: string;
  topic: string;
  question: string;
  options: string[];
  answer: number; // 1-indexed option index
  image?: string;
}

type ViewState = 'home' | 'config' | 'test' | 'result' | 'review';

export default function PYQScreen() {
  const user = useAuthStore((s) => s.user);

  // States
  const [viewState, setViewState] = useState<ViewState>('home');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  
  // Config states
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [timerDuration, setTimerDuration] = useState<number>(15); // in minutes
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(false);

  // Active test states
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [testQuestions, setTestQuestions] = useState<(Question & { shuffledOptions: string[]; correctText: string })[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, { selected: string | null; timeSpent: number }>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  
  // Results & review states
  const [finishedAttemptId, setFinishedAttemptId] = useState<string | null>(null);
  const [reviewAttempt, setReviewAttempt] = useState<PYQAttemptWithAnswers | null>(null);
  const [reviewIndex, setReviewIndex] = useState<number>(0);
  const [historyPage, setHistoryPage] = useState<number>(1);

  // Timer reference & question timer reference
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Zustand used questions store
  const { usedQuestionIds, addUsedQuestionIds, clearUsedQuestionIds } = usePyqStore();
  const queryClient = useQueryClient();

  // Load backend stats
  const statsQ = useQuery({
    queryKey: ['pyq-stats'],
    queryFn: getStats,
    enabled: !!user,
  });

  // Load backend attempt history
  const historyQ = useQuery({
    queryKey: ['pyq-history', historyPage],
    queryFn: () => getAttemptHistory({ page: historyPage, pageSize: 5 }),
    enabled: !!user,
  });

  // Refresh data on focus — empty deps array prevents infinite loop
  useFocusEffect(
    useCallback(() => {
      void statsQ.refetch();
      void historyQ.refetch();
    }, [])
  );

  // Derive all unique subjects from the JSON dynamically
  const dynamicSubjects = Array.from(new Set((questionsData as Question[]).map((q) => q.subject)));

  // Setup / start new test attempt
  const startAttemptMutation = useMutation({
    mutationFn: startAttempt,
    onSuccess: (data) => {
      setActiveAttemptId(data.id);
      setViewState('test');
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setSecondsRemaining(timerDuration * 60);
      lastTimeRef.current = getNow();

      // Start countdown
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Auto submit when time runs out
            void triggerSubmit(data.id);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onError: (e: Error) => {
      Alert.alert('Error starting test', e.message);
    },
  });

  // Finish/submit test attempt
  const finishAttemptMutation = useMutation({
    mutationFn: finishAttempt,
    onSuccess: (data) => {
      setFinishedAttemptId(data.id);
      setActiveAttemptId(null);
      setViewState('result');
      void statsQ.refetch();
      void historyQ.refetch();
      void queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['journey'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });

      // Track completed questions for study cycle
      const questionIds = testQuestions.map((q) => q.id);
      addUsedQuestionIds(questionIds);

      // Emit Companion Presentation & Notification Engine events
      const score = Math.round(data.accuracy || data.score || 80);
      const xpEarned = 50;
      CompanionBus.emit({
        eventType: 'XPEarned',
        priority: 'high',
        payload: {
          xpAmount: xpEarned,
          customText: `Scored ${score}% on ${selectedSubject} PYQ Practice! Earned +${xpEarned} XP.`,
        },
      });

      if (user?.id) {
        EventBus.emit({
          type: 'SessionEnded',
          userId: user.id,
          data: {
            taskTitle: `${selectedSubject} PYQ Practice`,
            scorePercent: score,
            xpEarned,
          },
        });
      }
    },
    onError: (e: Error) => {
      Alert.alert('Error submitting test', e.message);
    },
  });

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSelectSubject = (subj: string) => {
    setSelectedSubject(subj);
    
    // Calculate total questions in pool for this subject
    let pool = questionsData as Question[];
    if (subj !== 'All') {
      pool = pool.filter((q) => q.subject.toLowerCase() === subj.toLowerCase());
    }

    setNumQuestions(Math.min(10, pool.length));
    setViewState('config');
  };

  const handleStartTest = async () => {
    // 1. Build test questions using non-repeating cycle logic
    let pool = questionsData as Question[];
    if (selectedSubject !== 'All') {
      pool = pool.filter((q) => q.subject.toLowerCase() === selectedSubject.toLowerCase());
    }

    // Filter unused
    let unused = pool.filter((q) => !usedQuestionIds.includes(q.id));
    let wasReset = false;

    if (unused.length === 0) {
      // Pool is exhausted! Reset used list for this subject
      unused = pool;
      wasReset = true;
      const idsToRemove = pool.map((p) => p.id);
      // Remove these from local store
      const remainingIds = usedQuestionIds.filter((id) => !idsToRemove.includes(id));
      clearUsedQuestionIds();
      addUsedQuestionIds(remainingIds);
    }

    // Shuffle questions
    let selected = [...unused].sort(() => 0.5 - Math.random()).slice(0, Math.min(numQuestions, unused.length));

    // Fill up if limit is greater than unused
    if (selected.length < numQuestions && pool.length > selected.length) {
      const needed = numQuestions - selected.length;
      const remainingPool = pool.filter((q) => !selected.map((s) => s.id).includes(q.id));
      const extra = [...remainingPool].sort(() => 0.5 - Math.random()).slice(0, Math.min(needed, remainingPool.length));
      selected.push(...extra);
      wasReset = true;
    }

    // Map questions with option shuffling
    const testPrep = selected.map((q) => {
      const originalOptions = q.options;
      const correctText = originalOptions[q.answer - 1];
      
      let shuffledOptions = [...originalOptions];
      if (shuffleOptions) {
        shuffledOptions = shuffledOptions.sort(() => 0.5 - Math.random());
      }

      return {
        ...q,
        shuffledOptions,
        correctText,
      };
    });

    // Shuffle questions order if toggled
    const finalQuestions = shuffleQuestions ? [...testPrep].sort(() => 0.5 - Math.random()) : testPrep;

    if (finalQuestions.length === 0) {
      Alert.alert('No questions available', 'Please try another subject.');
      return;
    }

    setTestQuestions(finalQuestions);

    // Call start attempt backend
    await startAttemptMutation.mutateAsync({
      set_name: `PYQ - ${selectedSubject}`,
      subject: selectedSubject,
      year: finalQuestions[0].year,
      mode: 'test',
    });
  };

  const trackTimeForCurrentQuestion = () => {
    if (testQuestions.length === 0) return;
    const now = getNow();
    const elapsedSeconds = Math.round((now - lastTimeRef.current) / 1000);
    lastTimeRef.current = now;

    const qId = testQuestions[currentQuestionIndex].id;
    setUserAnswers((prev) => {
      const existing = prev[qId] ?? { selected: null, timeSpent: 0 };
      return {
        ...prev,
        [qId]: {
          ...existing,
          timeSpent: existing.timeSpent + elapsedSeconds,
        },
      };
    });
  };

  const handleSelectOption = (optionText: string) => {
    trackTimeForCurrentQuestion();
    const qId = testQuestions[currentQuestionIndex].id;
    setUserAnswers((prev) => {
      const existing = prev[qId] ?? { selected: null, timeSpent: 0 };
      return {
        ...prev,
        [qId]: {
          ...existing,
          selected: optionText,
        },
      };
    });
  };

  const triggerSubmit = async (attemptIdOverride?: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    trackTimeForCurrentQuestion();

    const targetAttemptId = attemptIdOverride ?? activeAttemptId;
    if (!targetAttemptId) return;

    // Map answers into payload format
    const answersPayload = testQuestions.map((q) => {
      const ansInfo = userAnswers[q.id];
      const selected = ansInfo?.selected ?? null;
      const isCorrect = selected === q.correctText;
      const timeSpent = ansInfo?.timeSpent ?? 0;

      return {
        question_id: q.id,
        selected_option: selected,
        correct: isCorrect,
        time_taken_seconds: timeSpent,
      };
    });

    await finishAttemptMutation.mutateAsync({
      attempt_id: targetAttemptId,
      answers: answersPayload,
    });
  };

  const handleReviewAttempt = async (attemptId: string) => {
    try {
      const fullAttempt = await getAttempt(attemptId);
      setReviewAttempt(fullAttempt);
      setReviewIndex(0);
      setViewState('review');
    } catch (e: any) {
      Alert.alert('Error loading review', e.message);
    }
  };

  // Format countdown seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ─── RENDERING SUB-SCREENS ──────────────────────────────────────────────────

  if (statsQ.isLoading && viewState === 'home') {
    return (
      <Screen centered>
        <Loading />
      </Screen>
    );
  }

  // SCREEN 1: PYQ HOME
  if (viewState === 'home') {
    const stats = statsQ.data;
    const history = historyQ.data?.data ?? [];

    return (
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ gap: spacing[24], paddingBottom: 120 }}>
            {/* Header Row with Oval Title Card */}
            <HeaderTitleCard
              title="PYQ Practice"
              showWavingHand={false}
            />

            {/* Aggregated stats */}
            {stats && (
              <View style={[glassCardStyle, styles.pinkGlassCard]}>
                <View style={{ gap: spacing.sm }}>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: '#2A1D22' }}>Your PYQ Stats</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' }}>
                    {[
                      { label: 'Total Tests', value: stats.total_tests, color: palette.danger },
                      { label: 'Questions', value: stats.total_questions, color: '#2A1D22' },
                      { label: 'Correct', value: stats.correct_answers, color: '#16a34a' },
                      { label: 'Accuracy', value: `${stats.accuracy}%`, color: '#EC4899' },
                      { label: 'Best Score', value: `${stats.best_score}%`, color: '#FF9F1C' },
                    ].map((s) => (
                      <View key={s.label} style={{ alignItems: 'center', minWidth: 60 }}>
                        <Text style={{ fontWeight: '800', fontSize: 18, color: s.color }}>
                          {s.value}
                        </Text>
                        <Text style={{ color: '#2A1D22', fontSize: 11, fontWeight: '700' }}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Dynamic Subjects List — Compact Horizontal Cards */}
            <View style={{ gap: spacing.xs }}>
              <Text style={{ fontWeight: '800', fontSize: 16, color: '#2A1D22' }}>Select Subject</Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {/* All Subjects Card */}
                <Pressable
                  onPress={() => handleSelectSubject('All')}
                  style={[styles.subjectCard, { backgroundColor: palette.cherryBloom, borderColor: palette.cherryBloom }]}
                >
                  <BookOpen size={18} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={{ fontWeight: '800', color: '#FFFFFF', fontSize: 13, flex: 1 }} numberOfLines={1}>
                    All Subjects
                  </Text>
                </Pressable>

                {dynamicSubjects.map((subj) => (
                  <Pressable
                    key={subj}
                    onPress={() => handleSelectSubject(subj)}
                    style={[styles.subjectCard, { backgroundColor: 'rgba(255, 243, 245, 0.85)', borderColor: 'rgba(250, 215, 224, 0.90)' }]}
                  >
                    <Book size={17} color="#D94C61" strokeWidth={2.2} />
                    <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 13, flex: 1 }} numberOfLines={1}>
                      {subj}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Reset study cycle pool helper */}
            {usedQuestionIds.length > 0 && (
              <Pressable
                onPress={() => {
                  clearUsedQuestionIds();
                  Alert.alert('Pool reset', 'All question repeat history has been cleared for the next tests.');
                }}
                style={styles.resetButton}
              >
                <RotateCcw size={16} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                  Reset Question Repetitions ({usedQuestionIds.length} used)
                </Text>
              </Pressable>
            )}

            {/* History Feed */}
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontWeight: '800', fontSize: 16, color: '#2A1D22' }}>Attempt History</Text>
              {history.length === 0 ? (
                <EmptyState title="No attempts yet" description="Your completed tests will show up here." />
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {history.map((h) => (
                    <View key={h.id} style={[glassCardStyle, styles.pinkGlassCard]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ gap: 2, flex: 1 }}>
                          <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 15 }}>
                            {h.set_name}
                          </Text>
                          <Text style={{ color: '#66545B', fontSize: 12, fontWeight: '600' }}>
                            {new Date(h.submitted_at!).toLocaleDateString()} • {h.correct} / {h.correct + h.wrong + h.unanswered} Correct
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => void handleReviewAttempt(h.id)}
                          style={{
                            backgroundColor: palette.cherryBloom,
                            borderRadius: radius.md,
                            paddingHorizontal: spacing.md,
                            paddingVertical: 8,
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Review</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}

                  {/* Pagination */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xs }}>
                    <Pressable
                      disabled={historyPage <= 1}
                      onPress={() => setHistoryPage((p) => p - 1)}
                      style={[styles.outlineBtn, { opacity: historyPage <= 1 ? 0.5 : 1 }]}
                    >
                      <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 13 }}>Previous</Text>
                    </Pressable>
                    <Pressable
                      disabled={history.length < 5}
                      onPress={() => setHistoryPage((p) => p + 1)}
                      style={[styles.outlineBtn, { opacity: history.length < 5 ? 0.5 : 1 }]}
                    >
                      <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 13 }}>Next Page</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // SCREEN 2: CONFIGURATION
  if (viewState === 'config') {
    // Total questions in selected subject pool
    let pool = questionsData as Question[];
    if (selectedSubject !== 'All') {
      pool = pool.filter((q) => q.subject.toLowerCase() === selectedSubject.toLowerCase());
    }

    const unusedCount = pool.filter((q) => !usedQuestionIds.includes(q.id)).length;

    return (
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ gap: spacing.lg, paddingBottom: 120 }}>
            {/* Regular Black Title Card */}
            <HeaderTitleCard title="Configure Test" showWavingHand={false} />

            <View style={[glassCardStyle, styles.pinkGlassCard]}>
              <View style={{ gap: 4 }}>
                <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 16 }}>
                  Subject: {selectedSubject}
                </Text>
                <Text style={{ color: '#66545B', fontSize: 13, fontWeight: '600' }}>
                  {pool.length} available, {unusedCount} unused in current cycle
                </Text>
              </View>
            </View>

            <View style={[glassCardStyle, styles.pinkGlassCard]}>
              <View style={{ gap: spacing.md }}>
                {/* Number of questions selector */}
                <View style={{ gap: spacing.xs }}>
                  <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 14 }}>Number of Questions: {numQuestions}</Text>
                  <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
                    {[5, 10, 15, 20, 25].map((num) => {
                      if (num > pool.length && num > 5) return null;
                      const isSel = numQuestions === num;
                      return (
                        <Pressable
                          key={num}
                          onPress={() => setNumQuestions(num)}
                          style={[
                            styles.chip,
                            {
                              borderColor: isSel ? palette.cherryBloom : 'rgba(250, 215, 224, 0.90)',
                              backgroundColor: isSel ? palette.cherryBloom : 'rgba(255, 255, 255, 0.85)',
                            },
                          ]}
                        >
                          <Text style={{ fontWeight: '800', color: isSel ? '#FFFFFF' : '#2A1D22' }}>{num}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Timer Duration selector */}
                <View style={{ gap: spacing.xs }}>
                  <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 14 }}>Timer Duration: {timerDuration} Minutes</Text>
                  <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
                    {[1, 5, 10, 15, 20, 30].map((mins) => {
                      const isSel = timerDuration === mins;
                      return (
                        <Pressable
                          key={mins}
                          onPress={() => setTimerDuration(mins)}
                          style={[
                            styles.chip,
                            {
                              borderColor: isSel ? palette.cherryBloom : 'rgba(250, 215, 224, 0.90)',
                              backgroundColor: isSel ? palette.cherryBloom : 'rgba(255, 255, 255, 0.85)',
                            },
                          ]}
                        >
                          <Text style={{ fontWeight: '800', color: isSel ? '#FFFFFF' : '#2A1D22' }}>
                            {mins}m {mins === 1 && '(Test)'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Shuffle options */}
                <View style={[styles.switchRow, { borderBottomColor: 'rgba(250, 215, 224, 0.60)' }]}>
                  <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 14 }}>Shuffle Questions</Text>
                  <Switch value={shuffleQuestions} onValueChange={setShuffleQuestions} trackColor={{ false: '#E5D8DC', true: palette.cherryBloom }} />
                </View>

                <View style={[styles.switchRow, { borderBottomColor: 'rgba(250, 215, 224, 0.60)' }]}>
                  <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 14 }}>Shuffle Options</Text>
                  <Switch value={shuffleOptions} onValueChange={setShuffleOptions} trackColor={{ false: '#E5D8DC', true: palette.cherryBloom }} />
                </View>

                {/* Action Buttons: High contrast */}
                <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                  <Pressable
                    disabled={startAttemptMutation.isPending}
                    onPress={handleStartTest}
                    style={styles.primaryBtn}
                  >
                    <Play size={16} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                      {startAttemptMutation.isPending ? 'Starting\u2026' : 'Start Test'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setViewState('home')}
                    style={styles.outlineBtn}
                  >
                    <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 14 }}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // SCREEN 3: TEST ATTEMPT SCREEN
  if (viewState === 'test') {
    const q = testQuestions[currentQuestionIndex];
    if (!q) return null;

    const selectedOption = userAnswers[q.id]?.selected ?? null;
    const progressPct = Math.round(((currentQuestionIndex + 1) / testQuestions.length) * 100);

    const handleNext = () => {
      trackTimeForCurrentQuestion();
      if (currentQuestionIndex < testQuestions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      }
    };

    const handlePrev = () => {
      trackTimeForCurrentQuestion();
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex((prev) => prev - 1);
      }
    };

    return (
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ gap: spacing.md, paddingBottom: 120 }}>
            {/* Header / Timer */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 14 }}>
                Question {currentQuestionIndex + 1} of {testQuestions.length}
              </Text>
              <View style={[styles.timerBadge, { backgroundColor: 'rgba(255, 243, 245, 0.90)', borderColor: 'rgba(250, 215, 224, 0.90)' }]}>
                <Clock size={15} color={secondsRemaining < 60 ? palette.danger : '#2A1D22'} strokeWidth={2.4} />
                <Text style={{ color: secondsRemaining < 60 ? palette.danger : '#2A1D22', fontWeight: '800', fontSize: 14 }}>
                  {formatTime(secondsRemaining)}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={{ height: 8, backgroundColor: 'rgba(250, 215, 224, 0.60)', borderRadius: radius.full, overflow: 'hidden' }}>
              <View style={{ width: `${progressPct}%`, height: '100%', backgroundColor: palette.cherryBloom, borderRadius: radius.full }} />
            </View>

            {/* Question Card */}
            <View style={[glassCardStyle, styles.pinkGlassCard]}>
              <View style={{ gap: spacing.md }}>
                <Text style={{ fontSize: 13, color: palette.danger, fontWeight: '800' }}>
                  {q.subject} • {q.topic}
                </Text>

                <Text style={{ fontSize: 16, fontWeight: '700', color: '#2A1D22', lineHeight: 24 }}>
                  {q.question}
                </Text>

                {/* Render Local Question Image if present */}
                {q.image && questionImages[q.image] ? (
                  <View style={{ alignItems: 'center', marginVertical: spacing.sm }}>
                    <Image
                      source={questionImages[q.image]}
                      style={{
                        width: '100%',
                        height: 250,
                        borderRadius: radius.md,
                        resizeMode: 'contain',
                      }}
                    />
                  </View>
                ) : null}

                {/* Options */}
                <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
                  {q.shuffledOptions.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => handleSelectOption(option)}
                        style={[
                          styles.optionButton,
                          {
                            borderColor: isSelected ? palette.cherryBloom : 'rgba(250, 215, 224, 0.90)',
                            backgroundColor: isSelected ? 'rgba(232, 77, 114, 0.14)' : 'rgba(255, 255, 255, 0.85)',
                          },
                        ]}
                      >
                        <View style={[styles.optionDot, { borderColor: isSelected ? palette.cherryBloom : '#2A1D22', backgroundColor: isSelected ? palette.cherryBloom : 'transparent' }]} />
                        <Text style={{ color: '#2A1D22', flex: 1, fontSize: 14, fontWeight: isSelected ? '800' : '600' }}>{option}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Bottom Navigation Buttons: High Contrast */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.sm }}>
              <Pressable
                disabled={currentQuestionIndex === 0}
                onPress={handlePrev}
                style={[styles.outlineBtn, { flex: 1, opacity: currentQuestionIndex === 0 ? 0.4 : 1 }]}
              >
                <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 14 }}>Previous</Text>
              </Pressable>

              {currentQuestionIndex === testQuestions.length - 1 ? (
                <Pressable
                  disabled={finishAttemptMutation.isPending}
                  onPress={() => void triggerSubmit()}
                  style={[styles.primaryBtn, { flex: 1.5, backgroundColor: '#16a34a' }]}
                >
                  <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                    {finishAttemptMutation.isPending ? 'Submitting\u2026' : 'Submit Test'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable onPress={handleNext} style={[styles.primaryBtn, { flex: 1.5 }]}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Next</Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // SCREEN 4: RESULT SCREEN
  if (viewState === 'result') {
    const attempt = historyQ.data?.data.find((h) => h.id === finishedAttemptId);

    if (!attempt) {
      return (
        <Screen centered>
          <Loading />
        </Screen>
      );
    }

    const totalQuestions = attempt.correct + attempt.wrong + attempt.unanswered;

    return (
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ gap: spacing.lg, paddingBottom: 120 }}>
            {/* Title Card Nature for Test Complete */}
            <HeaderTitleCard title="Test Complete" showWavingHand={false} />

            <View style={[glassCardStyle, styles.pinkGlassCard]}>
              <View style={{ gap: 4, alignItems: 'center' }}>
                <CheckCircle2 size={32} color="#16a34a" strokeWidth={2.4} />
                <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 16, textAlign: 'center' }}>
                  Evaluation Finalized
                </Text>
                <Text style={{ color: '#66545B', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                  Your attempt has been successfully evaluated.
                </Text>
              </View>
            </View>

            {/* Summary score card */}
            <View style={[glassCardStyle, styles.pinkGlassCard]}>
              <View style={{ gap: spacing.md, alignItems: 'center' }}>
                <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 13 }}>OVERALL ACCURACY</Text>
                <Text style={{ fontSize: 54, fontWeight: '800', color: palette.danger }}>
                  {attempt.accuracy}%
                </Text>

                <View style={{ height: 1, backgroundColor: 'rgba(250, 215, 224, 0.70)', width: '100%' }} />

                <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: spacing.sm }}>
                  {[
                    { label: 'Correct', value: attempt.correct, color: '#16a34a' },
                    { label: 'Wrong', value: attempt.wrong, color: palette.danger },
                    { label: 'Skipped', value: attempt.unanswered, color: '#66545B' },
                  ].map((s) => (
                    <View key={s.label} style={{ alignItems: 'center' }}>
                      <Text style={{ fontWeight: '800', fontSize: 20, color: s.color }}>
                        {s.value}
                      </Text>
                      <Text style={{ color: '#2A1D22', fontSize: 11, fontWeight: '700' }}>{s.label}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ height: 1, backgroundColor: 'rgba(250, 215, 224, 0.70)', width: '100%' }} />

                <View style={{ width: '100%', gap: spacing.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} color="#2A1D22" strokeWidth={2.2} />
                    <Text style={{ color: '#2A1D22', fontSize: 13, fontWeight: '700' }}>
                      Time Taken: {Math.floor(attempt.time_taken_seconds / 60)}m {attempt.time_taken_seconds % 60}s
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} color="#2A1D22" strokeWidth={2.2} />
                    <Text style={{ color: '#2A1D22', fontSize: 13, fontWeight: '700' }}>
                      Total Questions: {totalQuestions}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* High-Contrast Action Buttons */}
            <View style={{ gap: spacing.sm }}>
              <Pressable
                onPress={() => void handleReviewAttempt(attempt.id)}
                style={styles.primaryBtn}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                  Review Detailed Answers
                </Text>
              </Pressable>
              
              <Pressable
                onPress={() => setViewState('home')}
                style={styles.outlineBtn}
              >
                <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 14 }}>
                  Return to PYQ Home
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // SCREEN 5: REVIEW SCREEN
  if (viewState === 'review') {
    if (!reviewAttempt) return null;

    const answers = reviewAttempt.pyq_attempt_answers;
    const currentReviewAnswer = answers[reviewIndex];
    if (!currentReviewAnswer) return null;

    // Load original question details from local dataset
    const originalQ = (questionsData as Question[]).find((q) => q.id === currentReviewAnswer.question_id);
    if (!originalQ) return null;

    const isSkipped = currentReviewAnswer.selected_option === null;
    const isCorrect = currentReviewAnswer.correct;

    const handleNextReview = () => {
      if (reviewIndex < answers.length - 1) {
        setReviewIndex((prev) => prev + 1);
      }
    };

    const handlePrevReview = () => {
      if (reviewIndex > 0) {
        setReviewIndex((prev) => prev - 1);
      }
    };

    return (
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ gap: spacing.md, paddingBottom: 120 }}>
            {/* Header navigation */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 13 }}>
                Question Review {reviewIndex + 1} of {answers.length}
              </Text>
              <View
                style={[
                  styles.timerBadge,
                  {
                    backgroundColor: isCorrect ? '#f0fdf4' : isSkipped ? 'rgba(255, 243, 245, 0.85)' : '#fef2f2',
                    borderColor: isCorrect ? '#bbf7d0' : isSkipped ? 'rgba(250, 215, 224, 0.90)' : '#fecaca',
                  },
                ]}
              >
                <Text style={{ color: isCorrect ? '#16a34a' : isSkipped ? '#66545B' : palette.danger, fontWeight: '800', fontSize: 13 }}>
                  {isCorrect ? 'Correct' : isSkipped ? 'Skipped' : 'Incorrect'}
                </Text>
              </View>
            </View>

            {/* Question Details card */}
            <View style={[glassCardStyle, styles.pinkGlassCard]}>
              <View style={{ gap: spacing.md }}>
                <Text style={{ fontSize: 13, color: palette.danger, fontWeight: '800' }}>
                  {originalQ.subject} • {originalQ.topic}
                </Text>

                <Text style={{ fontSize: 16, fontWeight: '700', color: '#2A1D22', lineHeight: 24 }}>
                  {originalQ.question}
                </Text>

                {/* Render Local Question Image if present */}
                {originalQ.image && questionImages[originalQ.image] ? (
                  <View style={{ alignItems: 'center', marginVertical: spacing.sm }}>
                    <Image
                      source={questionImages[originalQ.image]}
                      style={{
                        width: '100%',
                        height: 250,
                        borderRadius: radius.md,
                        resizeMode: 'contain',
                      }}
                    />
                  </View>
                ) : null}

                {/* Options with correctness highlights */}
                <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
                  {originalQ.options.map((option, idx) => {
                    const correctText = originalQ.options[originalQ.answer - 1];
                    const isCorrectOption = option === correctText;
                    const isUserSelection = option === currentReviewAnswer.selected_option;

                    let optionBorderColor: string = 'rgba(250, 215, 224, 0.90)';
                    let optionBgColor: string = 'rgba(255, 255, 255, 0.85)';

                    if (isCorrectOption) {
                      optionBorderColor = '#16a34a';
                      optionBgColor = '#f0fdf4';
                    } else if (isUserSelection && !isCorrect) {
                      optionBorderColor = palette.danger;
                      optionBgColor = '#fef2f2';
                    }

                    return (
                      <View
                        key={idx}
                        style={[
                          styles.optionButton,
                          {
                            borderColor: optionBorderColor,
                            backgroundColor: optionBgColor,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.optionDot,
                            {
                              borderColor: isCorrectOption ? '#16a34a' : isUserSelection ? palette.danger : '#2A1D22',
                              backgroundColor: isCorrectOption ? '#16a34a' : isUserSelection ? palette.danger : 'transparent',
                            },
                          ]}
                        />
                        <Text style={{ color: '#2A1D22', flex: 1, fontSize: 14, fontWeight: isCorrectOption || isUserSelection ? '800' : '600' }}>
                          {option} {isCorrectOption && ' (Correct Option)'} {isUserSelection && !isCorrect && ' (Your Selection)'}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Explanation text */}
                <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', padding: spacing.md, borderRadius: radius.md, marginTop: spacing.xs, borderWidth: 1, borderColor: 'rgba(250, 215, 224, 0.90)' }}>
                  <Text style={{ fontWeight: '800', color: '#2A1D22', fontSize: 14, marginBottom: 4 }}>
                    Explanation
                  </Text>
                  <Text style={{ color: '#2A1D22', fontSize: 13, lineHeight: 18, fontWeight: '600' }}>
                    The correct answer is Option {originalQ.answer} (&quot;{originalQ.options[originalQ.answer - 1]}&quot;). {originalQ.topic} explains this choice.
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottom Actions: High Contrast */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.sm }}>
              <Pressable
                disabled={reviewIndex === 0}
                onPress={handlePrevReview}
                style={[styles.outlineBtn, { flex: 1, opacity: reviewIndex === 0 ? 0.4 : 1 }]}
              >
                <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 14 }}>Previous</Text>
              </Pressable>

              <Pressable onPress={() => setViewState('home')} style={[styles.primaryBtn, { flex: 1.5 }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Return Home</Text>
              </Pressable>

              <Pressable
                disabled={reviewIndex === answers.length - 1}
                onPress={handleNextReview}
                style={[styles.outlineBtn, { flex: 1, opacity: reviewIndex === answers.length - 1 ? 0.4 : 1 }]}
              >
                <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 14 }}>Next</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  pinkGlassCard: {
    backgroundColor: 'rgba(255, 243, 245, 0.85)',
    borderColor: 'rgba(250, 215, 224, 0.90)',
    borderRadius: 24,
    padding: spacing.md,
  },
  subjectCard: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '48%',
    minHeight: 48,
  },
  chip: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  timerBadge: {
    borderRadius: radius.full,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: spacing.md,
    gap: spacing.sm,
  },
  optionDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  primaryBtn: {
    backgroundColor: palette.cherryBloom,
    paddingVertical: 12,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    backgroundColor: '#2A1D22',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
