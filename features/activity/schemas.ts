import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.');
const timestampSchema = z.string().datetime({ offset: true });
const identifierSchema = z.string().trim().min(1).max(160);
const nonNegativeInteger = z.number().int().nonnegative();
const percentageSchema = z.number().min(0).max(100);

export const pyqAttemptSchema = z
  .object({
    set_name: identifierSchema,
    subject: z.string().trim().min(1).max(120),
    year: z.number().int().min(1900).max(2100),
    mode: z.string().trim().min(1).max(40),
    started_at: timestampSchema.optional(),
    submitted_at: timestampSchema.nullable().optional(),
    score: z.number().nonnegative().optional(),
    correct: nonNegativeInteger.optional(),
    wrong: nonNegativeInteger.optional(),
    unanswered: nonNegativeInteger.optional(),
    accuracy: percentageSchema.optional(),
    time_taken_seconds: nonNegativeInteger.optional(),
  })
  .strict();

export const pyqAttemptAnswerSchema = z
  .object({
    attempt_id: z.string().uuid(),
    question_id: identifierSchema,
    selected_option: z.string().trim().min(1).max(160).nullable().optional(),
    correct: z.boolean(),
    time_taken_seconds: nonNegativeInteger.optional(),
  })
  .strict();

export const waterLogSchema = z
  .object({ amount_ml: z.number().int().min(1).max(10000), logged_at: timestampSchema.optional() })
  .strict();

export const vocabularyProgressSchema = z
  .object({
    word_id: identifierSchema,
    learned: z.boolean(),
    learned_at: timestampSchema.nullable().optional(),
  })
  .strict()
  .superRefine(({ learned, learned_at }, context) => {
    if (learned && !learned_at)
      context.addIssue({
        code: 'custom',
        message: 'A learned word needs a learned_at timestamp.',
        path: ['learned_at'],
      });
    if (!learned && learned_at)
      context.addIssue({
        code: 'custom',
        message: 'An unlearned word cannot have a learned_at timestamp.',
        path: ['learned_at'],
      });
  });

export const grammarAttemptSchema = z
  .object({
    set_name: identifierSchema,
    topic: identifierSchema,
    correct: nonNegativeInteger,
    wrong: nonNegativeInteger,
    score: z.number().nonnegative(),
    completed_at: timestampSchema.optional(),
  })
  .strict();

export const flashcardCollectionSchema = z
  .object({ title: identifierSchema, description: z.string().max(1000).nullable().optional() })
  .strict();

export const flashcardSchema = z
  .object({
    collection_id: z.string().uuid(),
    type: z.literal('user').default('user'),
    question: z.string().trim().min(1).max(4000),
    answer: z.string().trim().min(1).max(4000),
  })
  .strict();

export const flashcardReviewSchema = z
  .object({
    card_id: z.string().uuid(),
    reviewed_at: timestampSchema.optional(),
    rating: z.enum(['again', 'hard', 'good', 'easy']),
  })
  .strict();

export const activityEventSchema = z
  .object({
    event_type: z.enum([
      'planner_created',
      'planner_updated',
      'task_completed',
      'pomodoro_started',
      'pomodoro_completed',
      'pyq_started',
      'pyq_completed',
      'grammar_completed',
      'vocabulary_learned',
      'flashcard_created',
      'flashcard_reviewed',
      'water_logged',
      'submission_sent',
      'submission_approved',
      'submission_rejected',
      'achievement_unlocked',
      'level_up',
      'streak_increased',
      'daily_goal_completed',
      'partner_connected',
    ]),
    reference_table: z
      .string()
      .regex(/^[a-z][a-z0-9_]{0,62}$/)
      .nullable()
      .optional(),
    reference_id: z.string().uuid().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    visibility: z.enum(['private', 'partner', 'public']).default('private'),
  })
  .strict()
  .superRefine(({ reference_table, reference_id }, context) => {
    if (Boolean(reference_table) !== Boolean(reference_id)) {
      context.addIssue({
        code: 'custom',
        message: 'reference_table and reference_id must be supplied together.',
      });
    }
  });

export const mascotFeedSchema = z
  .object({
    event_id: z.string().uuid().nullable().optional(),
    message_type: z.string().trim().min(1).max(64),
    title: z.string().trim().min(1).max(140),
    subtitle: z.string().max(500).nullable().optional(),
    icon: z.string().trim().min(1).max(120).nullable().optional(),
    emotion: z.enum(['happy', 'celebrate', 'encourage', 'remind', 'concerned']),
    priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  })
  .strict();

export const dailyActivityDateSchema = dateSchema;

export type PyqAttemptInput = z.infer<typeof pyqAttemptSchema>;
export type PyqAttemptAnswerInput = z.infer<typeof pyqAttemptAnswerSchema>;
export type WaterLogInput = z.infer<typeof waterLogSchema>;
export type VocabularyProgressInput = z.infer<typeof vocabularyProgressSchema>;
export type GrammarAttemptInput = z.infer<typeof grammarAttemptSchema>;
export type FlashcardCollectionInput = z.infer<typeof flashcardCollectionSchema>;
export type FlashcardInput = z.infer<typeof flashcardSchema>;
export type FlashcardReviewInput = z.infer<typeof flashcardReviewSchema>;
export type ActivityEventInput = z.infer<typeof activityEventSchema>;
export type MascotFeedInput = z.infer<typeof mascotFeedSchema>;
