// Flashcards feature – re-export relevant schemas from the central activity schemas module
export {
  flashcardCollectionSchema,
  flashcardSchema,
  flashcardReviewSchema,
  flashcardIdSchema,
  flashcardUpdateSchema,
  type FlashcardCollectionInput,
  type FlashcardInput,
  type FlashcardReviewInput,
  type FlashcardIdInput,
  type FlashcardUpdateInput,
} from '@/features/activity';
