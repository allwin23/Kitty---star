'use client';
import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { HeaderTitleCard } from '@/components/ui/HeaderTitleCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import questionsData from '@/data/questions.json';
import { BookOpen, Clock, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import clsx from 'clsx';

export default function PYQPracticePage() {
  const allQuestions = questionsData as any[];
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [timerSeconds, setTimerSeconds] = useState(15 * 60);
  const [isTestActive, setIsTestActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const subjects = ['All', ...Array.from(new Set(allQuestions.map((q) => q.subject).filter(Boolean)))];

  const filteredQuestions = allQuestions.filter(
    (q) => selectedSubject === 'All' || q.subject === selectedSubject
  );

  const currentQ = filteredQuestions[currentIndex] || filteredQuestions[0];

  // Test Timer
  useEffect(() => {
    let interval: any = null;
    if (isTestActive && timerSeconds > 0 && !isFinished) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTestActive, timerSeconds, isFinished]);

  const handleStart = () => {
    setIsTestActive(true);
    setIsFinished(false);
    setUserAnswers({});
    setCurrentIndex(0);
    setTimerSeconds(15 * 60);
  };

  const handleSelectOption = (optIdx: number) => {
    if (isFinished) return;
    setUserAnswers({ ...userAnswers, [currentQ.id]: optIdx });
  };

  const handleFinish = () => {
    setIsFinished(true);
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}
  };

  // Score calculation
  let correctCount = 0;
  filteredQuestions.forEach((q) => {
    if (userAnswers[q.id] === q.answer) {
      correctCount++;
    }
  });

  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <HeaderTitleCard
            title="PYQ Mock Exam Simulation"
            subtitle="Practice authentic previous year questions under exam time limits"
          />
          {isTestActive && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#C73A57] font-mono font-black text-xs shadow-sm border border-[#FAD7E0]">
              <Clock className="w-3.5 h-3.5" />
              <span>{timeFormatted}</span>
            </div>
          )}
        </div>

        {!isTestActive ? (
          /* Test Config Card */
          <Card className="p-8 space-y-6 bg-white/95 text-center">
            <div className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-[#C73A57] to-[#E84D72] text-white flex items-center justify-center text-2xl mx-auto shadow-md">
              📝
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-[#2A1D22] font-heading italic">
                Ready to Test Your Mastery?
              </h3>
              <p className="text-xs text-[#66545B] max-w-sm mx-auto mt-1">
                Simulate official exam timing with instant explanations for every problem.
              </p>
            </div>

            <div className="max-w-xs mx-auto space-y-2 text-left">
              <label className="block text-xs font-bold text-[#2A1D22]">Select Subject:</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-[#FFF3F5] rounded-[16px] p-3 text-xs font-bold border border-[#FAD7E0] outline-none"
              >
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <Button size="lg" className="w-full max-w-xs mx-auto" onClick={handleStart}>
              Start 15-Minute Exam Block
            </Button>
          </Card>
        ) : isFinished ? (
          /* Test Result Scorecard */
          <Card className="p-8 space-y-6 bg-white/95 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-[22px] bg-emerald-500 text-white flex items-center justify-center text-3xl mx-auto shadow-md">
              🏆
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-[#2A1D22] font-heading italic">
                Exam Completed!
              </h3>
              <p className="text-xs text-[#66545B] mt-1">
                Here is your performance breakdown across this test set.
              </p>
            </div>

            <div className="p-4 rounded-[20px] bg-[#FFF3F5] border border-[#FFE4EB] flex items-center justify-around">
              <div>
                <span className="text-2xl font-black text-emerald-600">{correctCount}</span>
                <p className="text-[11px] font-bold text-[#66545B]">Correct</p>
              </div>
              <div className="w-px h-8 bg-[#FAD7E0]" />
              <div>
                <span className="text-2xl font-black text-[#D94C61]">
                  {Object.keys(userAnswers).length - correctCount}
                </span>
                <p className="text-[11px] font-bold text-[#66545B]">Wrong</p>
              </div>
              <div className="w-px h-8 bg-[#FAD7E0]" />
              <div>
                <span className="text-2xl font-black text-[#C73A57]">
                  {Math.round((correctCount / Math.max(1, filteredQuestions.length)) * 100)}%
                </span>
                <p className="text-[11px] font-bold text-[#66545B]">Accuracy</p>
              </div>
            </div>

            <Button size="lg" className="w-full" onClick={handleStart}>
              Take Another Practice Set
            </Button>
          </Card>
        ) : (
          /* Active Question Card */
          <Card className="p-6 space-y-5 bg-white/95">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#C73A57]">
                Question {currentIndex + 1} of {filteredQuestions.length}
              </span>
              <span className="text-[11px] font-bold text-[#66545B] bg-[#FFF3F5] px-2.5 py-0.5 rounded-full">
                {currentQ?.subject} • {currentQ?.year}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-extrabold text-[#2A1D22] font-heading italic leading-relaxed">
              {currentQ?.question}
            </h3>

            {/* Options */}
            <div className="space-y-2.5">
              {(currentQ?.options ?? []).map((opt: string, idx: number) => {
                const optNum = idx + 1; // 1-indexed
                const isSelected = userAnswers[currentQ?.id] === optNum;
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelectOption(optNum)}
                    className={clsx(
                      'w-full text-left p-3.5 rounded-[16px] text-xs font-bold border transition-all flex items-center justify-between',
                      isSelected
                        ? 'bg-[#C73A57] text-white border-[#C73A57] shadow-xs'
                        : 'bg-[#FFF7F8] border-[#FAD7E0] hover:bg-white text-[#2A1D22]'
                    )}
                  >
                    <span>{opt}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>

            {/* Navigation controls */}
            <div className="flex items-center justify-between pt-4 border-t border-[#FFE4EB]">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(currentIndex - 1)}
              >
                ← Prev
              </Button>

              {currentIndex + 1 < filteredQuestions.length ? (
                <Button size="sm" onClick={() => setCurrentIndex(currentIndex + 1)}>
                  Next →
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={handleFinish}>
                  Finish & Score
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
