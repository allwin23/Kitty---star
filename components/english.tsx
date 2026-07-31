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
  useColorScheme,
} from 'react-native';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { colors, radius, spacing } from '@/theme';
import type { Word } from '@/stores/english-store';
import type { WritingEvaluation } from '@/services/writing.service';

// Helper to get color palette based on scheme
const usePalette = () => {
  const scheme = useColorScheme();
  return colors[scheme === 'dark' ? 'dark' : 'light'];
};

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
  const palette = usePalette();

  return (
    <Card style={styles.cardContainer}>
      <Text style={[styles.cardTitle, { color: palette.text }]}>📖 {"Today's Vocabulary"}</Text>
      <Text style={[styles.cardSubtitle, { color: palette.mutedText }]}>
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
                  borderColor: isLearned ? '#10B981' : palette.border,
                  backgroundColor: pressed ? palette.border : palette.surface,
                },
              ]}
              onPress={() => onSelectWord(w)}
            >
              <View style={styles.wordListLeft}>
                <View
                  style={[
                    styles.indexBadge,
                    { backgroundColor: isLearned ? '#D1FAE5' : palette.border },
                  ]}
                >
                  <Text
                    style={{
                      fontWeight: '700',
                      color: isLearned ? '#047857' : palette.mutedText,
                      fontSize: 12,
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.wordText, { color: palette.text }]}>{w.word}</Text>
                  <Text
                    style={[styles.wordPart, { color: palette.mutedText }]}
                    numberOfLines={1}
                  >
                    {w.partOfSpeech} • {w.meaning}
                  </Text>
                </View>
              </View>

              <View style={styles.wordListRight}>
                {isLearned ? (
                  <View style={styles.learnedBadge}>
                    <Text style={styles.learnedText}>✓ Learned</Text>
                  </View>
                ) : (
                  <Pressable
                    disabled={isMarking}
                    onPress={() => onMarkLearned(w.id)}
                    style={({ pressed }) => [
                      styles.learnBtn,
                      {
                        backgroundColor: pressed ? '#4338CA' : palette.primary,
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

export function WordDetail({ word, isLearned, onClose, onMarkLearned, isMarking }: WordDetailProps) {
  const palette = usePalette();
  if (!word) return null;

  return (
    <Modal visible={!!word} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: palette.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
            <View>
              <Text style={[styles.modalWord, { color: palette.text }]}>{word.word}</Text>
              <Text style={[styles.modalPart, { color: palette.mutedText }]}>{word.partOfSpeech}</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={{ fontSize: 20, color: palette.mutedText }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            {/* Meaning */}
            <View style={styles.detailSection}>
              <Text style={[styles.sectionHeading, { color: palette.text }]}>Meaning</Text>
              <Text style={[styles.detailBody, { color: palette.text }]}>{word.meaning}</Text>
            </View>

            {/* Example */}
            <View style={styles.detailSection}>
              <Text style={[styles.sectionHeading, { color: palette.text }]}>Example Sentence</Text>
              <View style={[styles.quoteBox, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[styles.detailBody, { color: palette.text, fontStyle: 'italic' }]}>
                  {"\""}{word.example}{"\""}
                </Text>
              </View>
            </View>

            {/* Synonyms & Antonyms */}
            <View style={styles.rowSection}>
              {word.synonyms && word.synonyms.length > 0 && (
                <View style={[styles.halfSection, { marginRight: spacing.sm }]}>
                  <Text style={[styles.sectionHeading, { color: palette.text }]}>Synonyms</Text>
                  <View style={styles.tagsContainer}>
                    {word.synonyms.map((s) => (
                      <View key={s} style={[styles.tag, { backgroundColor: '#EEF2F6', borderColor: '#D2D6DC' }]}>
                        <Text style={{ fontSize: 13, color: '#374151' }}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {word.antonyms && word.antonyms.length > 0 && (
                <View style={styles.halfSection}>
                  <Text style={[styles.sectionHeading, { color: palette.text }]}>Antonyms</Text>
                  <View style={styles.tagsContainer}>
                    {word.antonyms.map((a) => (
                      <View key={a} style={[styles.tag, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
                        <Text style={{ fontSize: 13, color: '#991B1B' }}>{a}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={[styles.modalFooter, { borderTopColor: palette.border }]}>
            {isLearned ? (
              <View style={[styles.learnedStatusFull, { backgroundColor: '#D1FAE5' }]}>
                <Text style={{ color: '#047857', fontWeight: '700', fontSize: 15 }}>
                  ✓ Marked as Learned
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
                {isMarking ? <ActivityIndicator size="small" color="#FFF" /> : 'Mark as Learned (+XP)'}
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
  selectedOptionIndex: number | null; // 0-indexed locally, answer is 1-indexed (answer - 1)
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
  const palette = usePalette();
  const colorScheme = useColorScheme();

  return (
    <Card style={styles.quizCard}>
      {/* Header Info */}
      <View style={styles.quizHeader}>
        <Text style={[styles.topicBadge, { color: palette.primary, borderColor: palette.primary }]}>
          {question.topic}
        </Text>
        <Text style={[styles.progressText, { color: palette.mutedText }]}>
          {questionNumber} of {totalQuestions}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBarBg, { backgroundColor: palette.border }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              backgroundColor: palette.primary,
              width: `${(questionNumber / totalQuestions) * 100}%`,
            },
          ]}
        />
      </View>

      {/* Question Text */}
      <Text style={[styles.questionText, { color: palette.text }]}>{question.question}</Text>

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
                  borderColor: isSelected ? palette.primary : palette.border,
                  backgroundColor: isSelected
                    ? colorScheme === 'dark'
                      ? '#312E81'
                      : '#EEF2F6'
                    : pressed
                    ? palette.border
                    : palette.surface,
                },
              ]}
              onPress={() => onSelectOption(idx)}
            >
              <View
                style={[
                  styles.optionBullet,
                  {
                    borderColor: isSelected ? palette.primary : palette.mutedText,
                    backgroundColor: isSelected ? palette.primary : 'transparent',
                  },
                ]}
              >
                {isSelected && <View style={styles.optionBulletInner} />}
              </View>
              <Text style={[styles.optionText, { color: palette.text, fontWeight: isSelected ? '700' : '400' }]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.quizNav}>
        <Button style={styles.navBtn} disabled={questionNumber === 1} onPress={onPrev}>
          ◀ Previous
        </Button>
        <Button style={styles.navBtn} onPress={onNext}>
          {questionNumber === totalQuestions ? 'Finish Quiz' : 'Next ▶'}
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
  userAnswers: Record<string, number | null>; // id -> optionIndex (0-indexed)
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
  const palette = usePalette();
  const total = correctCount + wrongCount;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return (
    <ScrollView style={styles.resultContainer} showsVerticalScrollIndicator={false}>
      <Card style={styles.resultSummaryCard}>
        <Text style={[styles.resultEmoji, { textAlign: 'center' }]}>
          {accuracy >= 80 ? '🎉 Great Job!' : accuracy >= 50 ? '👍 Keep it up!' : '📚 Practice makes perfect!'}
        </Text>
        <Text style={[styles.resultTitle, { color: palette.text, textAlign: 'center' }]}>Quiz Completed</Text>
        <Text style={[styles.resultScoreText, { color: palette.primary, textAlign: 'center' }]}>
          Accuracy: {accuracy}%
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{correctCount}</Text>
            <Text style={[styles.statLabel, { color: palette.mutedText }]}>Correct</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{wrongCount}</Text>
            <Text style={[styles.statLabel, { color: palette.mutedText }]}>Wrong</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: palette.primary }]}>{score}</Text>
            <Text style={[styles.statLabel, { color: palette.mutedText }]}>XP Gained</Text>
          </View>
        </View>

        <Button onPress={onClose} style={{ marginTop: spacing.md }}>
          Back to English Home
        </Button>
      </Card>

      <Text style={[styles.reviewTitle, { color: palette.text }]}>Review Answers</Text>

      {questions.map((q, idx) => {
        const selected = userAnswers[q.id];
        const correctIndex = q.answer - 1; // Convert 1-indexed DB schema to 0-indexed locally
        const isUserCorrect = selected === correctIndex;

        return (
          <Card key={q.id} style={[styles.reviewQuestionCard, { borderColor: isUserCorrect ? '#10B981' : '#EF4444' }]}>
            <Text style={[styles.reviewHeader, { color: palette.text }]}>
              Question {idx + 1} ({q.topic})
            </Text>
            <Text style={[styles.reviewQuestionText, { color: palette.text }]}>{q.question}</Text>

            <View style={styles.reviewOptionsList}>
              {q.options.map((option: string, oIdx: number) => {
                const isCorrectOption = oIdx === correctIndex;
                const isUserSelected = oIdx === selected;

                let borderC: string = palette.border;
                let bgC: string = palette.surface;
                if (isCorrectOption) {
                  borderC = '#10B981';
                  bgC = '#D1FAE5';
                } else if (isUserSelected && !isUserCorrect) {
                  borderC = '#EF4444';
                  bgC = '#FEE2E2';
                }

                return (
                  <View key={oIdx} style={[styles.reviewOptionItem, { borderColor: borderC, backgroundColor: bgC }]}>
                    <Text style={[styles.reviewOptionText, { color: '#0F172A' }]}>
                      {option} {isCorrectOption ? '✓' : isUserSelected ? '✗' : ''}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={[styles.explanationBox, { backgroundColor: '#F8FAFC' }]}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: '#475569', marginBottom: 2 }}>
                Explanation:
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', lineHeight: 18 }}>{q.explanation}</Text>
            </View>
          </Card>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// 5. WritingEditor & 6. VocabularyChecklist
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
  const palette = usePalette();

  // Validate which words are used in the text
  const checkWordUsed = (word: string) => {
    if (!paragraph) return false;
    // Simple regex boundary check or case-insensitive search
    const cleanWord = word.trim().toLowerCase();
    const cleanPara = paragraph.toLowerCase();
    return cleanPara.includes(cleanWord);
  };

  const usedCount = words.filter((w) => checkWordUsed(w.word)).length;
  const canSubmit = usedCount === words.length && paragraph.trim().length > 10;

  return (
    <Card style={styles.cardContainer}>
      <Text style={[styles.cardTitle, { color: palette.text }]}>✍️ AI Writing Practice</Text>
      <Text style={[styles.cardSubtitle, { color: palette.mutedText }]}>
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
                  backgroundColor: used ? '#E6F4EA' : palette.surface,
                  borderColor: used ? '#10B981' : palette.border,
                },
              ]}
            >
              <Text style={[styles.checkText, { color: used ? '#137333' : palette.mutedText }]}>
                {used ? '✓' : '•'} {w.word}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Editor Box */}
      <TextInput
        style={[
          styles.textEditor,
          {
            color: palette.text,
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
        ]}
        multiline
        numberOfLines={6}
        placeholder="Once upon a time, an assiduous student used persuasion to..."
        placeholderTextColor={palette.mutedText}
        value={paragraph}
        onChangeText={onChangeParagraph}
        editable={!isLoading}
      />

      <View style={styles.editorInfo}>
        <Text style={{ fontSize: 12, color: palette.mutedText }}>
          Required Words: {usedCount}/{words.length} Used
        </Text>
        <Text style={{ fontSize: 12, color: palette.mutedText }}>
          {paragraph.length} chars
        </Text>
      </View>

      {!canSubmit && paragraph.trim().length > 0 && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ You must include all 5 words in your paragraph before submitting.
          </Text>
        </View>
      )}

      <Button disabled={!canSubmit || isLoading} onPress={onSubmit} style={{ marginTop: spacing.md }}>
        {isLoading ? <ActivityIndicator size="small" color="#FFF" /> : 'Submit for Gemini Review'}
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

export function GeminiFeedbackCard({ evaluation, originalParagraph, onClear }: GeminiFeedbackCardProps) {
  const palette = usePalette();
  if (!evaluation) return null;

  return (
    <ScrollView style={styles.feedbackContainer} showsVerticalScrollIndicator={false}>
      {/* 1. Overall Feedback */}
      <Card style={styles.feedbackSectionCard}>
        <Text style={[styles.feedbackSectionTitle, { color: palette.primary }]}>💡 Gemini Evaluation</Text>
        <Text style={[styles.feedbackBody, { color: palette.text }]}>{evaluation.overallFeedback}</Text>

        <View style={styles.usageGrid}>
          <View style={styles.usageBox}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#047857', marginBottom: spacing.xs }}>
              Words Used Correctly
            </Text>
            {evaluation.wordsUsedCorrectly?.map((w) => (
              <Text key={w} style={styles.usedOkText}>
                ✓ {w}
              </Text>
            ))}
            {(!evaluation.wordsUsedCorrectly || evaluation.wordsUsedCorrectly.length === 0) && (
              <Text style={{ fontSize: 12, color: palette.mutedText }}>None</Text>
            )}
          </View>

          <View style={styles.usageBox}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#B91C1C', marginBottom: spacing.xs }}>
              Words Used Incorrectly
            </Text>
            {evaluation.wordsUsedIncorrectly?.map((w) => (
              <Text key={w} style={styles.usedBadText}>
                ✗ {w}
              </Text>
            ))}
            {(!evaluation.wordsUsedIncorrectly || evaluation.wordsUsedIncorrectly.length === 0) && (
              <Text style={{ fontSize: 12, color: '#10B981', fontStyle: 'italic' }}>None! All 5 correctly used.</Text>
            )}
          </View>
        </View>
      </Card>

      {/* 2. Original vs Improved Paragraphs */}
      <Card style={styles.feedbackSectionCard}>
        <Text style={[styles.feedbackSectionTitle, { color: palette.text }]}>✍️ original Paragraph</Text>
        <Text style={[styles.originalParaText, { color: palette.mutedText }]}>{originalParagraph}</Text>

        <View style={[styles.divider, { backgroundColor: palette.border }]} />

        <Text style={[styles.feedbackSectionTitle, { color: '#047857' }]}>🌟 Improved Paragraph (By Gemini)</Text>
        <Text style={[styles.improvedParaText, { color: palette.text }]}>{evaluation.improvedParagraph}</Text>
      </Card>

      {/* 3. Grammar Mistakes */}
      {evaluation.grammarMistakes && evaluation.grammarMistakes.length > 0 && (
        <Card style={styles.feedbackSectionCard}>
          <Text style={[styles.feedbackSectionTitle, { color: palette.danger }]}>📝 Grammar & Style Corrections</Text>
          {evaluation.grammarMistakes.map((m, index) => (
            <View key={index} style={[styles.mistakeRow, { borderBottomColor: palette.border }]}>
              <View style={styles.mistakeLabelContainer}>
                <Text style={styles.mistakeIndex}>Correction {index + 1}</Text>
              </View>
              <View style={styles.mistakeDiff}>
                <Text style={styles.mistakeOriginal}>- {"\""}{m.original}{"\""}</Text>
                <Text style={styles.mistakeCorrection}>+ {"\""}{m.correction}{"\""}</Text>
              </View>
              <Text style={[styles.mistakeExplanation, { color: palette.text }]}>{m.explanation}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* 4. Vocabulary Suggestions */}
      {evaluation.vocabularySuggestions && evaluation.vocabularySuggestions.length > 0 && (
        <Card style={styles.feedbackSectionCard}>
          <Text style={[styles.feedbackSectionTitle, { color: palette.primary }]}>🎯 Vocabulary Suggestions</Text>
          {evaluation.vocabularySuggestions.map((s, index) => (
            <View key={index} style={[styles.suggestionRow, { borderBottomColor: palette.border }]}>
              <Text style={[styles.suggestionWord, { color: palette.text }]}>{s.word}</Text>
              <Text style={[styles.suggestionText, { color: palette.mutedText }]}>{s.suggestion}</Text>
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

// 9. StatisticsCard & 10. DailyGoalCard
interface StatisticsCardProps {
  vocabStats: { today_words: number; total_words: number; current_streak: number } | null;
  grammarStats: { today_questions: number; today_correct: number; total_questions: number; accuracy: number } | null;
  writingCompleted: boolean;
}

export function StatisticsCard({ vocabStats, grammarStats, writingCompleted }: StatisticsCardProps) {
  const palette = usePalette();

  return (
    <View style={{ gap: spacing.md }}>
      <Card style={styles.statsCard}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>📊 English Progress Statistics</Text>

        <View style={styles.statsSection}>
          <Text style={[styles.statsSectionLabel, { color: palette.mutedText }]}>VOCABULARY</Text>
          <View style={styles.gridStats}>
            <View style={styles.gridStatItem}>
              <Text style={[styles.gridValue, { color: palette.primary }]}>{vocabStats?.today_words ?? 0}</Text>
              <Text style={{ fontSize: 12, color: palette.mutedText }}>Learned Today</Text>
            </View>
            <View style={styles.gridStatItem}>
              <Text style={[styles.gridValue, { color: palette.primary }]}>{vocabStats?.total_words ?? 0}</Text>
              <Text style={{ fontSize: 12, color: palette.mutedText }}>Total Learned</Text>
            </View>
            <View style={styles.gridStatItem}>
              <Text style={[styles.gridValue, { color: palette.primary }]}>{vocabStats?.current_streak ?? 0}d</Text>
              <Text style={{ fontSize: 12, color: palette.mutedText }}>Streak</Text>
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.border }]} />

        <View style={styles.statsSection}>
          <Text style={[styles.statsSectionLabel, { color: palette.mutedText }]}>GRAMMAR</Text>
          <View style={styles.gridStats}>
            <View style={styles.gridStatItem}>
              <Text style={[styles.gridValue, { color: '#047857' }]}>{grammarStats?.today_questions ?? 0}</Text>
              <Text style={{ fontSize: 12, color: palette.mutedText }}>Solved Today</Text>
            </View>
            <View style={styles.gridStatItem}>
              <Text style={[styles.gridValue, { color: '#047857' }]}>{grammarStats?.total_questions ?? 0}</Text>
              <Text style={{ fontSize: 12, color: palette.mutedText }}>Total Solved</Text>
            </View>
            <View style={styles.gridStatItem}>
              <Text style={[styles.gridValue, { color: '#047857' }]}>
                {grammarStats?.accuracy ? Math.round(Number(grammarStats.accuracy)) : 0}%
              </Text>
              <Text style={{ fontSize: 12, color: palette.mutedText }}>Accuracy</Text>
            </View>
          </View>
        </View>
      </Card>

      <Card style={styles.statsCard}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>🎯 {"Today's English Goal"}</Text>
        <View style={styles.goalChecklist}>
          <View style={styles.goalRow}>
            <Text style={{ fontSize: 20 }}>{vocabStats?.today_words && vocabStats.today_words >= 5 ? '✅' : '⏳'}</Text>
            <View>
              <Text style={[styles.goalItemTitle, { color: palette.text }]}>Learn 5 Vocabulary Words</Text>
              <Text style={{ fontSize: 12, color: palette.mutedText }}>
                Completed: {vocabStats?.today_words ?? 0}/5 words learned
              </Text>
            </View>
          </View>

          <View style={styles.goalRow}>
            <Text style={{ fontSize: 20 }}>{grammarStats?.today_questions && grammarStats.today_questions > 0 ? '✅' : '⏳'}</Text>
            <View>
              <Text style={[styles.goalItemTitle, { color: palette.text }]}>Complete a Grammar Quiz</Text>
              <Text style={{ fontSize: 12, color: palette.mutedText }}>
                Completed: {grammarStats?.today_questions ?? 0} questions solved
              </Text>
            </View>
          </View>

          <View style={styles.goalRow}>
            <Text style={{ fontSize: 20 }}>{writingCompleted ? '✅' : '⏳'}</Text>
            <View>
              <Text style={[styles.goalItemTitle, { color: palette.text }]}>AI Paragraph Writing Practice</Text>
              <Text style={{ fontSize: 12, color: palette.mutedText }}>
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
    marginBottom: spacing.sm,
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
    borderWidth: 1,
  },
  wordListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  indexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordText: {
    fontSize: 16,
    fontWeight: '700',
  },
  wordPart: {
    fontSize: 13,
    marginTop: 2,
  },
  wordListRight: {
    marginLeft: spacing.sm,
  },
  learnedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  learnedText: {
    color: '#047857',
    fontWeight: '700',
    fontSize: 12,
  },
  learnBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  learnBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  modalWord: {
    fontSize: 24,
    fontWeight: '700',
  },
  modalPart: {
    fontSize: 14,
    fontStyle: 'italic',
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
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailBody: {
    fontSize: 16,
    lineHeight: 22,
  },
  quoteBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
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
    borderTopWidth: 1,
  },
  learnedStatusFull: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    width: '100%',
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
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    borderRadius: radius.full,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    marginVertical: spacing.sm,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
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
  resultEmoji: {
    fontSize: 48,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  resultScoreText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: spacing.md,
    marginVertical: spacing.xs,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginVertical: spacing.md,
  },
  reviewQuestionCard: {
    borderWidth: 2,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  reviewHeader: {
    fontSize: 14,
    fontWeight: '700',
  },
  reviewQuestionText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  reviewOptionsList: {
    gap: spacing.xs,
  },
  reviewOptionItem: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  reviewOptionText: {
    fontSize: 14,
  },
  explanationBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.xs,
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
    borderWidth: 1,
  },
  checkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textEditor: {
    height: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  editorInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  warningBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  warningText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackContainer: {
    flex: 1,
  },
  feedbackSectionCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  feedbackSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  feedbackBody: {
    fontSize: 15,
    lineHeight: 22,
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
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  usedOkText: {
    color: '#137333',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  usedBadText: {
    color: '#C5221F',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  originalParaText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  improvedParaText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  mistakeRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
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
    fontWeight: '700',
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
    fontWeight: '700',
  },
  mistakeExplanation: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  suggestionRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: 4,
  },
  suggestionWord: {
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionText: {
    fontSize: 13,
    lineHeight: 18,
  },
  statsCard: {
    gap: spacing.md,
  },
  statsSection: {
    gap: spacing.sm,
  },
  statsSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    fontWeight: '700',
  },
  goalChecklist: {
    gap: spacing.md,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  goalItemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
});
