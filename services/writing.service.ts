import { supabase } from '@/lib/supabase';

export interface GrammarMistake {
  original: string;
  correction: string;
  explanation: string;
}

export interface VocabularySuggestion {
  word: string;
  suggestion: string;
}

export interface WritingEvaluation {
  overallFeedback: string;
  grammarMistakes: GrammarMistake[];
  vocabularySuggestions: VocabularySuggestion[];
  improvedParagraph: string;
  wordsUsedCorrectly: string[];
  wordsUsedIncorrectly: string[];
}

/**
 * Sends the user's paragraph and today's vocabulary words to the
 * secure backend Edge Function proxy to evaluate the writing.
 */
export async function evaluateWriting(
  vocabWords: string[],
  paragraph: string
): Promise<WritingEvaluation> {
  const { data, error } = await supabase.functions.invoke('evaluate-writing', {
    body: { vocabWords, paragraph },
  });

  if (error) {
    throw new Error(error.message || 'Error occurred while calling the evaluation service.');
  }

  if (!data || !data.evaluation) {
    throw new Error('No evaluation returned from the evaluation service.');
  }

  return data.evaluation as WritingEvaluation;
}
