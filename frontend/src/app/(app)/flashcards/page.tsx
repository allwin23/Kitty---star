'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { HeaderTitleCard } from '@/components/ui/HeaderTitleCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useFlashcardStore } from '@/stores/flashcard-store';
import { flashcardService } from '@/services/backend';
import { Zap, RotateCw, Check, Plus, FolderPlus, Sparkles, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import clsx from 'clsx';

// Default starter flashcards
const DEFAULT_CARDS = [
  { id: 'c1', question: 'What is the SuperMemo SM-2 algorithm based on?', answer: 'Calculating optimal review intervals using Easiness Factor (EF), repetition count, and quality ratings (0-5).' },
  { id: 'c2', question: 'What is the ideal Pomodoro work-to-break ratio for deep work?', answer: 'Typically 25 minutes of high-intensity focus followed by a 5-minute break, or 50/10 for longer blocks.' },
  { id: 'c3', question: 'How does dual-accountability increase goal completion rates?', answer: 'Studies show sharing commitments with a peer and requiring proof elevates completion probabilities to over 90%.' },
  { id: 'c4', question: 'What is active recall?', answer: 'The cognitive technique of actively stimulating memory retrieval during the learning process rather than passive reading.' },
];

export default function FlashcardsPage() {
  const { localSchedules, reviewCardLocally } = useFlashcardStore();
  const [cards, setCards] = useState(DEFAULT_CARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  const currentCard = cards[currentIndex] || cards[0];

  const handleRating = (rating: number) => {
    if (currentCard) {
      reviewCardLocally(currentCard.id, rating);
    }
    setIsFlipped(false);
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}
    }
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    setCards([
      ...cards,
      {
        id: `card_${Date.now()}`,
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
      },
    ]);
    setNewQuestion('');
    setNewAnswer('');
    setNewModalOpen(false);
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <HeaderTitleCard
            title="Spaced Repetition (SM-2)"
            subtitle="Review flashcards at mathematically optimized intervals"
          />
          <Button
            size="sm"
            onClick={() => setNewModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Card
          </Button>
        </div>

        {/* Progress Counter */}
        <div className="flex items-center justify-between text-xs font-bold text-white drop-shadow-xs px-1">
          <span>Card {currentIndex + 1} of {cards.length}</span>
          <span>Spaced Interval Engine</span>
        </div>

        {/* Flip Flashcard Stage */}
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="relative min-h-[300px] sm:min-h-[340px] rounded-[28px] bg-white/95 border-2 border-[#FAD7E0] hover:border-[#E84D72] shadow-xl p-8 flex flex-col justify-between items-center text-center cursor-pointer transition-all duration-300 hover:scale-[1.01] backdrop-blur-md select-none"
        >
          <span className="text-xs font-black uppercase tracking-widest text-[#E84D72] bg-[#FFE4EB] px-3 py-1 rounded-full border border-[#FAD7E0]">
            {isFlipped ? 'Answer (Click to Flip)' : 'Question (Click to Reveal)'}
          </span>

          <div className="my-auto max-w-md">
            <h3 className="text-xl sm:text-2xl font-black text-[#2A1D22] font-heading italic leading-relaxed">
              {isFlipped ? currentCard.answer : currentCard.question}
            </h3>
          </div>

          <p className="text-xs font-semibold text-[#BFAFB5] flex items-center gap-1">
            <RotateCw className="w-3.5 h-3.5" />
            <span>Tap anywhere on card to flip</span>
          </p>
        </div>

        {/* SM-2 Quality Rating Buttons */}
        {isFlipped && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <p className="text-center text-xs font-black uppercase tracking-wider text-white drop-shadow-xs">
              Rate Retrieval Ease (SM-2 Calculation):
            </p>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRating(1)}
                className="!bg-rose-100 hover:!bg-rose-200 text-[#D94C61] border-rose-300"
              >
                Again (1)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRating(3)}
                className="!bg-amber-100 hover:!bg-amber-200 text-amber-800 border-amber-300"
              >
                Hard (3)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRating(4)}
                className="!bg-blue-100 hover:!bg-blue-200 text-blue-800 border-blue-300"
              >
                Good (4)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRating(5)}
                className="!bg-emerald-100 hover:!bg-emerald-200 text-emerald-800 border-emerald-300"
              >
                Easy (5)
              </Button>
            </div>
          </div>
        )}

        {/* Add Flashcard Modal */}
        <Modal
          isOpen={newModalOpen}
          onClose={() => setNewModalOpen(false)}
          title="Create New Flashcard"
        >
          <form onSubmit={handleAddCard} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#2A1D22]">Front / Question</label>
              <textarea
                rows={3}
                placeholder="Enter prompt or question…"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="w-full bg-[#FFF3F5] rounded-[16px] p-3 text-sm border border-[#FAD7E0] outline-none"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#2A1D22]">Back / Answer</label>
              <textarea
                rows={3}
                placeholder="Enter accurate explanation or answer…"
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                className="w-full bg-[#FFF3F5] rounded-[16px] p-3 text-sm border border-[#FAD7E0] outline-none"
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full">
              Save Flashcard
            </Button>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
