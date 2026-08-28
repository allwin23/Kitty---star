import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  AlertTriangle,
  BarChart2,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  HelpCircle,
  PenTool,
  Play,
  Search,
  Sparkles,
  SquarePen,
  Target,
  Trophy,
  X,
  XCircle,
} from 'lucide-react-native';

import { Card } from './ui/card';
import { Button } from './ui/button';
import { useGrowthAnimStore } from '@/stores/growth-anim-store';
import { palette, radius, spacing } from '@/theme';
import type { Word } from '@/stores/english-store';
import type { WritingEvaluation } from '@/services/writing.service';

// 1. VocabularyCard: List of today's words with quick view and learned state
interface VocabularyCardProps {
  words: Word[];
  learnedWordIds: string[];
  onSelectWord: (word: Word) => void;
  onMarkLearned: (wordId: string) => void;
  isMarking: boolean;
}

export function VocabularyCard({
  words,
  learnedWordIds,
  onSelectWord,
  onMarkLearned,
  isMarking,
}: VocabularyCardProps) {
  return (
    <Card style={styles.cardContainer}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <BookOpen size={18} color={palette.danger} strokeWidth={2.4} />
        <Text style={styles.sectionHeaderTitle}>TODAY'S VOCABULARY</Text>
      </View>
      <Text style={styles.cardSubtitle}>
        {"Learn these 5 words to unlock today's Writing Practice."}
      </Text>
      <View style={styles.listContainer}>
        {words.map((w, index) => {
          const isLearned = learnedWordIds.includes(w.id);
          return (
            <Pressable
              key={w.id}
              style={({ pressed }) => [
                styles.wordListItem,
                {
                  borderColor: isLearned ? '#10B981' : 'rgba(250, 215, 224, 0.85)',
                  backgroundColor: isLearned
                    ? 'rgba(209, 250, 229, 0.4)'
                    : pressed
                      ? 'rgba(250, 215, 224, 0.5)'
                      : 'rgba(255, 243, 245, 0.75)',
                },
              ]}
              onPress={() => onSelectWord(w)}
            >
              <View style={styles.wordListLeft}>
                <View
                  style={[
                    styles.indexBadge,
                    { backgroundColor: isLearned ? '#D1FAE5' : 'rgba(232, 77, 114, 0.12)' },
                  ]}
                >
                  <Text
                    style={{
                      fontWeight: '800',
                      color: isLearned ? '#047857' : palette.danger,
                      fontSize: 12,
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.wordText}>{w.word}</Text>
                  <Text style={styles.wordPart} numberOfLines={1}>
                    {w.partOfSpeech} • {w.meaning}
                  </Text>
                </View>
              </View>

              <View style={styles.wordListRight}>
                {isLearned ? (
                  <View style={styles.learnedBadge}>
                    <CheckCircle2 size={13} color="#047857" strokeWidth={2.4} />
                    <Text style={styles.learnedText}>Learned</Text>
                  </View>
                ) : (
                  <Pressable
                    disabled={isMarking}
                    onPress={() => onMarkLearned(w.id)}
                    style={({ pressed }) => [
                      styles.learnBtn,
                      {
                        backgroundColor: pressed
                          ? 'rgba(232, 77, 114, 0.22)'
                          : 'rgba(232, 77, 114, 0.12)',
                      },
                    ]}
                  >
                    <Text style={styles.learnBtnText}>Learn</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

// 2. WordDetail Modal/Panel
interface WordDetailProps {
  word: Word | null;
  isLearned: boolean;
  onClose: () => void;
  onMarkLearned: (wordId: string) => void;
  isMarking: boolean;
}

export function WordDetail({
  word,
  isLearned,
  onClose,
  onMarkLearned,
  isMarking,
}: WordDetailProps) {
  if (!word) return null;

  return (
    <Modal visible={!!word} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalWord}>{word.word}</Text>
              <Text style={styles.modalPart}>{word.partOfSpeech}</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={palette.textSecondary} strokeWidth={2.4} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            {/* Meaning */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionHeading}>Meaning</Text>
              <Text style={styles.detailBody}>{word.meaning}</Text>
            </View>

            {/* Example */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionHeading}>Example Sentence</Text>
              <View style={styles.quoteBox}>
                <Text
                  style={[styles.detailBody, { fontStyle: 'italic', color: palette.textPrimary }]}
                >
                  {'"'}
                  {word.example}
                  {'"'}
                </Text>
              </View>
            </View>

            {/* Synonyms & Antonyms */}
            <View style={styles.rowSection}>
              {word.synonyms && word.synonyms.length > 0 && (
                <View style={[styles.halfSection, { marginRight: spacing.sm }]}>
                  <Text style={styles.sectionHeading}>Synonyms</Text>
                  <View style={styles.tagsContainer}>
                    {word.synonyms.map((s) => (
                      <View
                        key={s}
                        style={[
                          styles.tag,
                          {
                            backgroundColor: 'rgba(232, 77, 114, 0.08)',
                            borderColor: 'rgba(232, 77, 114, 0.25)',
                          },
                        ]}
                      >
                        <Text
                          style={{ fontSize: 13, color: palette.textPrimary, fontWeight: '600' }}
                        >
                          {s}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {word.antonyms && word.antonyms.length > 0 && (
                <View style={styles.halfSection}>
                  <Text style={styles.sectionHeading}>Antonyms</Text>
                  <View style={styles.tagsContainer}>
                    {word.antonyms.map((a) => (
                      <View
                        key={a}
                        style={[
                          styles.tag,
                          {
                            backgroundColor: 'rgba(217, 76, 97, 0.10)',
                            borderColor: 'rgba(217, 76, 97, 0.30)',
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 13, color: '#B91C1C', fontWeight: '600' }}>
                          {a}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.modalFooter}>
            {isLearned ? (
              <View style={styles.learnedStatusFull}>
                <CheckCircle2 size={18} color="#047857" strokeWidth={2.4} />
                <Text style={{ color: '#047857', fontWeight: '800', fontSize: 15 }}>
                  Marked as Learned
                </Text>
              </View>
            ) : (
              <Button
                disabled={isMarking}
                onPress={() => {
                  onMarkLearned(word.id);
                }}
                style={{ width: '100%' }}
              >
                {isMarking ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  'Mark as Learned (+XP)'
                )}
              </Button>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// 3. GrammarQuestion: Displays single question during quiz
interface GrammarQuestionProps {
  question: {
    id: string;
    topic: string;
    question: string;
    options: string[];
    answer: number;
    explanation: string;
  };
  questionNumber: number;
  totalQuestions: number;
  selectedOptionIndex: number | null;
  onSelectOption: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function GrammarQuestion({
  question,
  questionNumber,
  totalQuestions,
  selectedOptionIndex,
  onSelectOption,
  onNext,
  onPrev,
}: GrammarQuestionProps) {
  return (
    <Card style={styles.quizCard}>
      {/* Header Info */}
      <View style={styles.quizHeader}>
        <Text style={styles.topicBadge}>{question.topic}</Text>
        <Text style={styles.progressText}>
          {questionNumber} of {totalQuestions}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarBg}>
        <View
          style={[styles.progressBarFill, { width: `${(questionNumber / totalQuestions) * 100}%` }]}
        />
      </View>

      {/* Question Text */}
      <Text style={styles.questionText}>{question.question}</Text>

      {/* Options */}
      <View style={styles.optionsList}>
        {question.options.map((option, idx) => {
          const isSelected = selectedOptionIndex === idx;
          return (
            <Pressable
              key={idx}
              style={({ pressed }) => [
                styles.optionItem,
                {
                  borderColor: isSelected ? palette.danger : 'rgba(250, 215, 224, 0.85)',
                  backgroundColor: isSelected
                    ? 'rgba(240, 115, 146, 0.15)'
                    : pressed
                      ? 'rgba(250, 215, 224, 0.5)'
                      : 'rgba(255, 243, 245, 0.75)',
                },
              ]}
              onPress={() => onSelectOption(idx)}
            >
              <View
                style={[
                  styles.optionBullet,
                  {
                    borderColor: isSelected ? palette.danger : palette.textSecondary,
                    backgroundColor: isSelected ? palette.danger : 'transparent',
                  },
                ]}
              >
                {isSelected && <View style={styles.optionBulletInner} />}
              </View>
              <Text style={[styles.optionText, { fontWeight: isSelected ? '800' : '500' }]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.quizNav}>
        <Button
          variant="secondary"
          style={styles.navBtn}
          disabled={questionNumber === 1}
          onPress={onPrev}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ChevronLeft size={16} color={palette.danger} strokeWidth={2.4} />
            <Text style={{ color: palette.danger, fontWeight: '700' }}>Previous</Text>
          </View>
        </Button>
        <Button variant="primary" style={styles.navBtn} onPress={onNext}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
              {questionNumber === totalQuestions ? 'Finish Quiz' : 'Next'}
            </Text>
            {questionNumber !== totalQuestions && (
              <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.4} />
            )}
          </View>
        </Button>
      </View>
    </Card>
  );
}

// 4. QuizResult: Post-quiz screen
interface QuizResultProps {
  correctCount: number;
  wrongCount: number;
  score: number;
  questions: any[];
  userAnswers: Record<string, number | null>;
  onClose: () => void;
}

export function QuizResult({
  correctCount,
  wrongCount,
  score,
  questions,
  userAnswers,
  onClose,
}: QuizResultProps) {
  const total = correctCount + wrongCount;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  React.useEffect(() => {
    useGrowthAnimStore.getState().queueXp(2);
  }, []);

  return (
    <ScrollView style={styles.resultContainer} showsVerticalScrollIndicator={false}>
      <Card style={styles.resultSummaryCard}>
        <View style={{ alignItems: 'center', marginVertical: spacing.xs }}>
          <Trophy size={48} color={palette.danger} strokeWidth={2} />
        </View>
        <Text style={styles.resultTitle}>Quiz Completed</Text>
        <Text style={styles.resultScoreText}>Accuracy: {accuracy}%</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{correctCount}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{wrongCount}</Text>
            <Text style={styles.statLabel}>Wrong</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: palette.danger }]}>{score}</Text>
            <Text style={styles.statLabel}>XP Gained</Text>
          </View>
        </View>

        <Button onPress={onClose} style={{ marginTop: spacing.md }}>
          Back to English Home
        </Button>
      </Card>

      <Text style={styles.reviewTitle}>Review Answers</Text>

      {questions.map((q, idx) => {
        const selected = userAnswers[q.id];
        const correctIndex = q.answer - 1;
        const isUserCorrect = selected === correctIndex;

        return (
          <Card
            key={q.id}
            style={[
              styles.reviewQuestionCard,
              { borderColor: isUserCorrect ? '#10B981' : '#EF4444' },
            ]}
          >
            <Text style={styles.reviewHeader}>
              Question {idx + 1} ({q.topic})
            </Text>
            <Text style={styles.reviewQuestionText}>{q.question}</Text>

            <View style={styles.reviewOptionsList}>
              {q.options.map((option: string, oIdx: number) => {
                const isCorrectOption = oIdx === correctIndex;
                const isUserSelected = oIdx === selected;

                let borderC: string = 'rgba(250, 215, 224, 0.85)';
                let bgC: string = 'rgba(255, 243, 245, 0.75)';
                if (isCorrectOption) {
                  borderC = '#10B981';
                  bgC = '#D1FAE5';
                } else if (isUserSelected && !isUserCorrect) {
                  borderC = '#EF4444';
                  bgC = '#FEE2E2';
                }

                return (
                  <View
                    key={oIdx}
                    style={[
                      styles.reviewOptionItem,
                      { borderColor: borderC, backgroundColor: bgC },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={[styles.reviewOptionText, { flex: 1 }]}>{option}</Text>
                      {isCorrectOption ? (
                        <CheckCircle2 size={16} color="#10B981" strokeWidth={2.4} />
                      ) : isUserSelected ? (
                        <XCircle size={16} color="#EF4444" strokeWidth={2.4} />
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.explanationBox}>
              <Text
                style={{
                  fontWeight: '800',
                  fontSize: 13,
                  color: palette.textPrimary,
                  marginBottom: 2,
                }}
              >
                Explanation:
              </Text>
              <Text style={{ fontSize: 13, color: palette.textSecondary, lineHeight: 18 }}>
                {q.explanation}
              </Text>
            </View>
          </Card>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// 5. WritingEditor
interface WritingEditorProps {
  words: Word[];
  paragraph: string;
  onChangeParagraph: (text: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function WritingEditor({
  words,
  paragraph,
  onChangeParagraph,
  onSubmit,
  isLoading,
}: WritingEditorProps) {
  const checkWordUsed = (word: string) => {
    if (!paragraph) return false;
    const cleanWord = word.trim().toLowerCase();
    const cleanPara = paragraph.toLowerCase();
    return cleanPara.includes(cleanWord);
  };

  const usedCount = words.filter((w) => checkWordUsed(w.word)).length;
  const canSubmit = usedCount === words.length && paragraph.trim().length > 10;

  return (
    <Card style={styles.cardContainer}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SquarePen size={18} color={palette.danger} strokeWidth={2.4} />
        <Text style={styles.sectionHeaderTitle}>AI WRITING PRACTICE</Text>
      </View>
      <Text style={styles.cardSubtitle}>
        Write a paragraph incorporating ALL 5 vocabulary words.
      </Text>

      {/* Checklist */}
      <View style={styles.checklistGrid}>
        {words.map((w) => {
          const used = checkWordUsed(w.word);
          return (
            <View
              key={w.id}
              style={[
                styles.checkItem,
                {
                  backgroundColor: used ? 'rgba(209, 250, 229, 0.6)' : 'rgba(255, 243, 245, 0.85)',
                  borderColor: used ? '#10B981' : 'rgba(250, 215, 224, 0.85)',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {used ? (
                  <Check size={13} color="#047857" strokeWidth={2.4} />
                ) : (
                  <Clock size={13} color={palette.textSecondary} strokeWidth={2} />
                )}
                <Text
                  style={[styles.checkText, { color: used ? '#047857' : palette.textSecondary }]}
                >
                  {w.word}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Editor Box */}
      <TextInput
        style={styles.textEditor}
        multiline
        numberOfLines={6}
        placeholder="Once upon a time, an assiduous student used persuasion to..."
        placeholderTextColor={palette.textSecondary}
        value={paragraph}
        onChangeText={onChangeParagraph}
        editable={!isLoading}
      />

      <View style={styles.editorInfo}>
        <Text style={{ fontSize: 12, color: palette.textSecondary, fontWeight: '600' }}>
          Required Words: {usedCount}/{words.length} Used
        </Text>
        <Text style={{ fontSize: 12, color: palette.textSecondary, fontWeight: '600' }}>
          {paragraph.length} chars
        </Text>
      </View>

      {!canSubmit && paragraph.trim().length > 0 && (
        <View style={styles.warningBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={15} color="#B45309" strokeWidth={2.2} />
            <Text style={styles.warningText}>
              You must include all 5 words in your paragraph before submitting.
            </Text>
          </View>
        </View>
      )}

      <Button
        disabled={!canSubmit || isLoading}
        onPress={onSubmit}
        style={{ marginTop: spacing.md }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Submit for Gemini Review</Text>
          </View>
        )}
      </Button>
    </Card>
  );
}

// 7. GeminiFeedbackCard
interface GeminiFeedbackCardProps {
  evaluation: WritingEvaluation | null;
  originalParagraph: string;
  onClear: () => void;
}

export function GeminiFeedbackCard({
  evaluation,
  originalParagraph,
  onClear,
}: GeminiFeedbackCardProps) {
  if (!evaluation) return null;

  return (
    <ScrollView style={styles.feedbackContainer} showsVerticalScrollIndicator={false}>
      {/* 1. Overall Feedback */}
      <Card style={styles.feedbackSectionCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} color={palette.danger} strokeWidth={2.4} />
          <Text style={styles.sectionHeaderTitle}>GEMINI EVALUATION</Text>
        </View>
        <Text style={styles.feedbackBody}>{evaluation.overallFeedback}</Text>

        <View style={styles.usageGrid}>
          <View style={styles.usageBox}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: '#047857',
                marginBottom: spacing.xs,
              }}
            >
              Words Used Correctly
            </Text>
            {evaluation.wordsUsedCorrectly?.map((w) => (
              <View
                key={w}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}
              >
                <Check size={13} color="#047857" strokeWidth={2.4} />
                <Text style={styles.usedOkText}>{w}</Text>
              </View>
            ))}
            {(!evaluation.wordsUsedCorrectly || evaluation.wordsUsedCorrectly.length === 0) && (
              <Text style={{ fontSize: 12, color: palette.textSecondary }}>None</Text>
            )}
          </View>

          <View style={styles.usageBox}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: '#B91C1C',
                marginBottom: spacing.xs,
              }}
            >
              Words Used Incorrectly
            </Text>
            {evaluation.wordsUsedIncorrectly?.map((w) => (
              <View
                key={w}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}
              >
                <X size={13} color="#B91C1C" strokeWidth={2.4} />
                <Text style={styles.usedBadText}>{w}</Text>
              </View>
            ))}
            {(!evaluation.wordsUsedIncorrectly || evaluation.wordsUsedIncorrectly.length === 0) && (
              <Text
                style={{ fontSize: 12, color: '#10B981', fontStyle: 'italic', fontWeight: '600' }}
              >
                None! All 5 correctly used.
              </Text>
            )}
          </View>
        </View>
      </Card>

      {/* 2. Original vs Improved Paragraphs */}
      <Card style={styles.feedbackSectionCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <FileText size={18} color={palette.textPrimary} strokeWidth={2.4} />
          <Text style={[styles.sectionHeaderTitle, { color: palette.textPrimary }]}>
            ORIGINAL PARAGRAPH
          </Text>
        </View>
        <Text style={styles.originalParaText}>{originalParagraph}</Text>

        <View style={styles.divider} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} color="#047857" strokeWidth={2.4} />
          <Text style={[styles.sectionHeaderTitle, { color: '#047857' }]}>
            IMPROVED PARAGRAPH (BY GEMINI)
          </Text>
        </View>
        <Text style={styles.improvedParaText}>{evaluation.improvedParagraph}</Text>
      </Card>

      {/* 3. Grammar Mistakes */}
      {evaluation.grammarMistakes && evaluation.grammarMistakes.length > 0 && (
        <Card style={styles.feedbackSectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} color={palette.danger} strokeWidth={2.4} />
            <Text style={styles.sectionHeaderTitle}>GRAMMAR & STYLE CORRECTIONS</Text>
          </View>
          {evaluation.grammarMistakes.map((m, index) => (
            <View key={index} style={styles.mistakeRow}>
              <View style={styles.mistakeLabelContainer}>
                <Text style={styles.mistakeIndex}>Correction {index + 1}</Text>
              </View>
              <View style={styles.mistakeDiff}>
                <Text style={styles.mistakeOriginal}>
                  - {'"'}
                  {m.original}
                  {'"'}
                </Text>
                <Text style={styles.mistakeCorrection}>
                  + {'"'}
                  {m.correction}
                  {'"'}
                </Text>
              </View>
              <Text style={styles.mistakeExplanation}>{m.explanation}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* 4. Vocabulary Suggestions */}
      {evaluation.vocabularySuggestions && evaluation.vocabularySuggestions.length > 0 && (
        <Card style={styles.feedbackSectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Target size={18} color={palette.danger} strokeWidth={2.4} />
            <Text style={styles.sectionHeaderTitle}>VOCABULARY SUGGESTIONS</Text>
          </View>
          {evaluation.vocabularySuggestions.map((s, index) => (
            <View key={index} style={styles.suggestionRow}>
              <Text style={styles.suggestionWord}>{s.word}</Text>
              <Text style={styles.suggestionText}>{s.suggestion}</Text>
            </View>
          ))}
        </Card>
      )}

      <Button onPress={onClear} style={{ marginVertical: spacing.md }}>
        Practice Again
      </Button>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// 9. StatisticsCard
interface StatisticsCardProps {
  vocabStats: { today_words: number; total_words: number; current_streak: number } | null;
  grammarStats: {
    today_questions: number;
    today_correct: number;
    total_questions: number;
    accuracy: number;
  } | null;
  writingCompleted: boolean;
}

export function StatisticsCard({
  vocabStats,
  grammarStats,
  writingCompleted,
}: StatisticsCardProps) {
  return (
    <View style={{ gap: spacing.md }}>
      <Card style={styles.statsCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <BarChart2 size={18} color={palette.danger} strokeWidth={2.4} />
          <Text style={styles.sectionHeaderTitle}>ENGLISH PROGRESS STATISTICS</Text>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.statsSectionLabel}>VOCABULARY</Text>
          <View style={styles.gridStats}>
            <View style={styles.gridStatItem}>
              <Text style={[styles.gridValue, { color: palette.danger }]}>
                {vocabStats?.today_words ?? 0}
              </Text>
              <Text style={{ fontSize: 12, color: palette.textSecondary, fontWeight: '500' }}>
                Learned Today
              </Text>
            </View>
            <View style={styles.gridStatItem}>
              <Text style={[styles.gridValue, { color: palette.danger }]}>
                {vocabStats?.total_words ?? 0}
              </Text>
              <Text style={{ fontSize: 12, color: palette.textSecondary, fontWeight: '500' }}>
                Total Learned
              </Text>
            </View>
            <View style={styles.gridStatItem}>
              <Text style={[styles.gridValue, { color: palette.danger }]}>
                {vocabStats?.current_streak ?? 0}d
              </Text>
              <Text style={{ fontSize: 12, color: palette.textSecondary, fontWeight: '500' }}>
                Streak
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statsSection}>
          <Text style={styles.statsSectionLabel}>GRAMMAR</Text>
          <View style={styles.gridStats}>
            <View style={styles.gridStatItem}>
              <Text style={[styles.gridValue, { color: '#047857' }]}>
                {grammarStats?.today_questions ?? 0}
              </Text>
              <Text style={{ fontSize: 12, color: palette.textSecondary, fontWeight: '500' }}>
                Solved Today
              </Text>
            </View>
            <View style={styles.gridStatItem}>
              <Text style={[styles.gridValue, { color: '#047857' }]}>
                {grammarStats?.total_questions ?? 0}
              </Text>
              <Text style={{ fontSize: 12, color: palette.textSecondary, fontWeight: '500' }}>
                Total Solved
              </Text>
            </View>
            <View style={styles.gridStatItem}>
              <Text style={[styles.gridValue, { color: '#047857' }]}>
                {grammarStats?.accuracy ? Math.round(Number(grammarStats.accuracy)) : 0}%
              </Text>
              <Text style={{ fontSize: 12, color: palette.textSecondary, fontWeight: '500' }}>
                Accuracy
              </Text>
            </View>
          </View>
        </View>
      </Card>

      <Card style={styles.statsCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Target size={18} color={palette.danger} strokeWidth={2.4} />
          <Text style={styles.sectionHeaderTitle}>TODAY'S ENGLISH GOAL</Text>
        </View>

        <View style={styles.goalChecklist}>
          <View style={styles.goalRow}>
            {vocabStats?.today_words && vocabStats.today_words >= 5 ? (
              <CheckCircle2 size={22} color="#10B981" strokeWidth={2.4} />
            ) : (
              <Clock size={22} color={palette.textSecondary} strokeWidth={2} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.goalItemTitle}>Learn 5 Vocabulary Words</Text>
              <Text style={{ fontSize: 12, color: palette.textSecondary, marginTop: 2 }}>
                Completed: {vocabStats?.today_words ?? 0}/5 words learned
              </Text>
            </View>
          </View>

          <View style={styles.goalRow}>
            {grammarStats?.today_questions && grammarStats.today_questions > 0 ? (
              <CheckCircle2 size={22} color="#10B981" strokeWidth={2.4} />
            ) : (
              <Clock size={22} color={palette.textSecondary} strokeWidth={2} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.goalItemTitle}>Complete a Grammar Quiz</Text>
              <Text style={{ fontSize: 12, color: palette.textSecondary, marginTop: 2 }}>
                Completed: {grammarStats?.today_questions ?? 0} questions solved
              </Text>
            </View>
          </View>

          <View style={styles.goalRow}>
            {writingCompleted ? (
              <CheckCircle2 size={22} color="#10B981" strokeWidth={2.4} />
            ) : (
              <Clock size={22} color={palette.textSecondary} strokeWidth={2} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.goalItemTitle}>AI Paragraph Writing Practice</Text>
              <Text style={{ fontSize: 12, color: palette.textSecondary, marginTop: 2 }}>
                Status: {writingCompleted ? 'Completed' : 'Not completed today'}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    gap: spacing.sm,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: palette.danger,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardSubtitle: {
    fontSize: 13,
    color: palette.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  listContainer: {
    gap: spacing.sm,
  },
  wordListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  wordListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  indexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordText: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.textPrimary,
  },
  wordPart: {
    fontSize: 12,
    marginTop: 2,
    color: palette.textSecondary,
    fontWeight: '500',
  },
  wordListRight: {
    marginLeft: spacing.sm,
  },
  learnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  learnedText: {
    color: '#047857',
    fontWeight: '800',
    fontSize: 12,
  },
  learnBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  learnBtnText: {
    color: '#2A1D22',
    fontWeight: '800',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    maxHeight: '82%',
    backgroundColor: '#FFF7F8',
    borderColor: 'rgba(250, 215, 224, 0.85)',
    borderWidth: 1.5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(250, 215, 224, 0.85)',
  },
  modalWord: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.textPrimary,
  },
  modalPart: {
    fontSize: 13,
    fontStyle: 'italic',
    color: palette.danger,
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  modalScroll: {
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  detailSection: {
    gap: spacing.xs,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  detailBody: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.textPrimary,
    fontWeight: '500',
  },
  quoteBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(250, 215, 224, 0.85)',
    backgroundColor: 'rgba(255, 243, 245, 0.75)',
  },
  rowSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfSection: {
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  modalFooter: {
    paddingTop: spacing.md,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(250, 215, 224, 0.85)',
  },
  learnedStatusFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: spacing.sm,
    borderRadius: radius.md,
    width: '100%',
    backgroundColor: '#D1FAE5',
  },
  quizCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicBadge: {
    borderWidth: 1.5,
    borderColor: palette.danger,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: '800',
    color: palette.danger,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textSecondary,
  },
  progressBarBg: {
    height: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: 'rgba(250, 215, 224, 0.7)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: palette.danger,
  },
  questionText: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
    color: palette.textPrimary,
    marginVertical: spacing.xs,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  optionBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBulletInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  optionText: {
    fontSize: 15,
    flex: 1,
    color: palette.textPrimary,
  },
  quizNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  navBtn: {
    flex: 1,
  },
  resultContainer: {
    flex: 1,
  },
  resultSummaryCard: {
    alignItems: 'stretch',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.textPrimary,
    textAlign: 'center',
  },
  resultScoreText: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.danger,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(250, 215, 224, 0.85)',
    paddingTop: spacing.md,
    marginVertical: spacing.xs,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.danger,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginVertical: spacing.md,
  },
  reviewQuestionCard: {
    borderWidth: 2,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  reviewHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: palette.textPrimary,
  },
  reviewQuestionText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    color: palette.textPrimary,
  },
  reviewOptionsList: {
    gap: spacing.xs,
  },
  reviewOptionItem: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1.5,
  },
  reviewOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.textPrimary,
  },
  explanationBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.xs,
    backgroundColor: 'rgba(255, 243, 245, 0.75)',
    borderColor: 'rgba(250, 215, 224, 0.85)',
    borderWidth: 1,
  },
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  checkItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1.5,
  },
  checkText: {
    fontSize: 12,
    fontWeight: '800',
  },
  textEditor: {
    height: 140,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(250, 215, 224, 0.85)',
    backgroundColor: 'rgba(255, 247, 248, 0.9)',
    padding: spacing.md,
    fontSize: 15,
    color: palette.textPrimary,
    textAlignVertical: 'top',
    fontWeight: '500',
  },
  editorInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  warningBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1.5,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  warningText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  feedbackContainer: {
    flex: 1,
  },
  feedbackSectionCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  feedbackBody: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.textPrimary,
    fontWeight: '500',
  },
  usageGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  usageBox: {
    flex: 1,
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 243, 245, 0.75)',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(250, 215, 224, 0.85)',
  },
  usedOkText: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '700',
  },
  usedBadText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },
  originalParaText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    color: palette.textSecondary,
  },
  improvedParaText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: palette.textPrimary,
  },
  divider: {
    height: 1.5,
    backgroundColor: 'rgba(250, 215, 224, 0.85)',
    marginVertical: spacing.xs,
  },
  mistakeRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(250, 215, 224, 0.85)',
    gap: 4,
  },
  mistakeLabelContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mistakeIndex: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },
  mistakeDiff: {
    gap: 2,
    marginVertical: 2,
  },
  mistakeOriginal: {
    color: '#B91C1C',
    fontSize: 13,
    fontStyle: 'italic',
    textDecorationLine: 'line-through',
  },
  mistakeCorrection: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '800',
  },
  mistakeExplanation: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
    color: palette.textPrimary,
  },
  suggestionRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(250, 215, 224, 0.85)',
    gap: 4,
  },
  suggestionWord: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.textPrimary,
  },
  suggestionText: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.textSecondary,
  },
  statsCard: {
    gap: spacing.md,
  },
  statsSection: {
    gap: spacing.sm,
  },
  statsSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: palette.danger,
  },
  gridStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  gridValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  goalChecklist: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  goalItemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.textPrimary,
  },
});
