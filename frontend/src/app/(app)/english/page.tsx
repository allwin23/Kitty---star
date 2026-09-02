'use client';
import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { HeaderTitleCard } from '@/components/ui/HeaderTitleCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useEnglishStore, type Word } from '@/stores/english-store';
import { evaluateWriting, type WritingEvaluation } from '@/services/writing.service';
import grammarData from '@/data/grammar.json';
import { BookOpen, Sparkles, CheckCircle2, XCircle, RotateCcw, PenTool } from 'lucide-react';
import clsx from 'clsx';

export default function EnglishLearningPage() {
  const {
    currentWords,
    initializeDailyWords,
    writingParagraph,
    setWritingParagraph,
    resetDailyWords,
  } = useEnglishStore();

  const [activeTab, setActiveTab] = useState<'vocab' | 'writing' | 'grammar'>('vocab');
  const [evaluation, setEvaluation] = useState<WritingEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  // Grammar Quiz States
  const [grammarIndex, setGrammarIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const grammarQuestions = grammarData as any[];
  const currentQuestion = grammarQuestions[grammarIndex] || grammarQuestions[0];

  useEffect(() => {
    initializeDailyWords();
  }, [initializeDailyWords]);

  const handleEvaluate = async () => {
    if (!writingParagraph.trim()) return;
    setEvaluating(true);
    const wordList = currentWords.map((w) => w.word);
    const result = await evaluateWriting(wordList, writingParagraph);
    setEvaluation(result);
    setEvaluating(false);
  };

  const handleSelectQuizOption = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    setShowExplanation(true);
    if (idx === currentQuestion.correctOptionIndex) {
      setQuizScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setShowExplanation(false);
    if (grammarIndex + 1 < grammarQuestions.length) {
      setGrammarIndex(grammarIndex + 1);
    } else {
      setGrammarIndex(0);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <HeaderTitleCard
          title="English & AI Writing Suite"
          subtitle="Curated vocabulary, grammar mastery, and Gemini AI essay rubric"
        />

        {/* Tab switchers */}
        <div className="flex rounded-[20px] bg-white/90 p-1 border border-[#FAD7E0] max-w-sm mx-auto">
          {(['vocab', 'writing', 'grammar'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'flex-1 py-1.5 text-xs font-black rounded-[16px] capitalize transition-all',
                activeTab === tab
                  ? 'bg-[#C73A57] text-white shadow-2xs'
                  : 'text-[#66545B] hover:text-[#C73A57]'
              )}
            >
              {tab === 'vocab' ? 'Daily Words' : tab === 'writing' ? 'AI Writing' : 'Grammar Quiz'}
            </button>
          ))}
        </div>

        {/* TAB 1: Vocabulary */}
        {activeTab === 'vocab' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black uppercase tracking-wider text-white drop-shadow-xs">
                Today&apos;s 3 Target Words
              </span>
              <button
                onClick={resetDailyWords}
                className="text-xs font-bold text-white/90 hover:text-white underline drop-shadow-xs"
              >
                Shuffle New Words
              </button>
            </div>

            {currentWords.map((w, idx) => (
              <Card key={w.id || idx} className="p-6 space-y-3 bg-white/95">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-extrabold text-[#2A1D22] font-heading italic">
                      {w.word}
                    </h3>
                    <span className="text-xs font-semibold text-[#E84D72] italic">
                      {w.partOfSpeech}
                    </span>
                  </div>
                  <span className="text-2xl">📖</span>
                </div>

                <p className="text-sm font-medium text-[#2A1D22]">
                  <strong>Meaning:</strong> {w.meaning}
                </p>

                <p className="text-xs text-[#66545B] bg-[#FFF3F5] p-3 rounded-[14px] border border-[#FFE4EB] italic">
                  &quot;{w.example}&quot;
                </p>

                {w.synonyms && w.synonyms.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-[#66545B]">Synonyms:</span>
                    {w.synonyms.map((syn) => (
                      <span
                        key={syn}
                        className="text-[11px] font-bold text-[#C73A57] bg-[#FFE4EB] px-2 py-0.5 rounded-full"
                      >
                        {syn}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* TAB 2: AI Writing Evaluator */}
        {activeTab === 'writing' && (
          <div className="space-y-4">
            <Card className="p-6 space-y-4 bg-white/95">
              <div>
                <h3 className="text-base font-extrabold text-[#2A1D22]">
                  AI Writing Practice
                </h3>
                <p className="text-xs text-[#66545B]">
                  Write a paragraph integrating today&apos;s words:{' '}
                  <strong className="text-[#C73A57]">
                    {currentWords.map((w) => w.word).join(', ')}
                  </strong>
                </p>
              </div>

              <textarea
                rows={5}
                placeholder="Write your paragraph here…"
                value={writingParagraph}
                onChange={(e) => setWritingParagraph(e.target.value)}
                className="w-full bg-[#FFF3F5] rounded-[18px] p-4 text-sm font-medium border border-[#FAD7E0] outline-none focus:bg-white focus:border-[#E84D72] text-[#2A1D22]"
              />

              <Button
                size="lg"
                className="w-full"
                loading={evaluating}
                onClick={handleEvaluate}
                icon={<Sparkles className="w-4 h-4" />}
              >
                Evaluate with AI
              </Button>
            </Card>

            {evaluation && (
              <Card className="p-6 space-y-4 bg-white/95 animate-in fade-in duration-200">
                <h4 className="text-sm font-extrabold text-[#2A1D22] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Evaluation Feedback</span>
                </h4>

                <div className="p-4 rounded-[16px] bg-[#FFF3F5] border border-[#FFE4EB] text-xs font-semibold text-[#2A1D22] leading-relaxed">
                  {evaluation.overallFeedback}
                </div>

                {evaluation.improvedParagraph && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[#66545B]">Suggested Polish:</span>
                    <p className="text-xs italic text-[#2A1D22] bg-emerald-50 p-3 rounded-[14px] border border-emerald-200">
                      &quot;{evaluation.improvedParagraph}&quot;
                    </p>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* TAB 3: Grammar Quiz */}
        {activeTab === 'grammar' && (
          <Card className="p-6 space-y-5 bg-white/95">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#C73A57]">
                Question {grammarIndex + 1} of {grammarQuestions.length}
              </span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Score: {quizScore}
              </span>
            </div>

            <h3 className="text-lg font-extrabold text-[#2A1D22] font-heading italic leading-relaxed">
              {currentQuestion?.question}
            </h3>

            {/* Options */}
            <div className="space-y-2">
              {(currentQuestion?.options ?? []).map((opt: string, idx: number) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQuestion.correctOptionIndex;
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelectQuizOption(idx)}
                    className={clsx(
                      'w-full text-left p-3.5 rounded-[16px] text-xs font-bold border transition-all flex items-center justify-between',
                      selectedOption === null
                        ? 'bg-[#FFF7F8] border-[#FAD7E0] hover:bg-white text-[#2A1D22]'
                        : isCorrect
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                        : isSelected
                        ? 'bg-rose-100 border-rose-400 text-rose-900'
                        : 'bg-white opacity-50 border-gray-200 text-gray-400'
                    )}
                  >
                    <span>{opt}</span>
                    {selectedOption !== null && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    {selectedOption !== null && isSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 text-[#D94C61]" />
                    )}
                  </button>
                );
              })}
            </div>

            {showExplanation && (
              <div className="p-4 rounded-[16px] bg-[#FFF3F5] border border-[#FFE4EB] text-xs text-[#66545B] space-y-1">
                <span className="font-bold text-[#C73A57]">Explanation:</span>
                <p>{currentQuestion?.explanation}</p>
                <div className="pt-2">
                  <Button size="sm" onClick={handleNextQuestion}>
                    Next Question →
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
