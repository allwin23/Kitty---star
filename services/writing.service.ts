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
 * Local fallback evaluator when Edge Function or API key is unconfigured.
 */
function evaluateWritingLocally(vocabWords: string[], paragraph: string): WritingEvaluation {
  const cleanParagraph = paragraph.trim();
  const lowerPara = cleanParagraph.toLowerCase();

  const wordsUsedCorrectly: string[] = [];
  const wordsUsedIncorrectly: string[] = [];

  vocabWords.forEach((word) => {
    if (lowerPara.includes(word.toLowerCase())) {
      wordsUsedCorrectly.push(word);
    } else {
      wordsUsedIncorrectly.push(word);
    }
  });

  const grammarMistakes: GrammarMistake[] = [];
  // Basic checks
  if (cleanParagraph.length > 0 && cleanParagraph[0] !== cleanParagraph[0].toUpperCase()) {
    grammarMistakes.push({
      original: cleanParagraph.slice(0, 10),
      correction: cleanParagraph[0].toUpperCase() + cleanParagraph.slice(1, 10),
      explanation: 'Sentences should start with a capital letter.',
    });
  }

  if (!cleanParagraph.endsWith('.') && !cleanParagraph.endsWith('!') && !cleanParagraph.endsWith('?')) {
    grammarMistakes.push({
      original: cleanParagraph.slice(-10),
      correction: cleanParagraph.slice(-10) + '.',
      explanation: 'Paragraphs should end with proper punctuation.',
    });
  }

  const vocabularySuggestions: VocabularySuggestion[] = wordsUsedIncorrectly.map((word) => ({
    word,
    suggestion: `Try incorporating "${word}" into your next sentence to strengthen your vocabulary context.`,
  }));

  const matchPct = vocabWords.length > 0 ? Math.round((wordsUsedCorrectly.length / vocabWords.length) * 100) : 100;
  let overallFeedback = `Great effort! You successfully integrated ${wordsUsedCorrectly.length} out of ${vocabWords.length} target vocabulary words (${matchPct}%).`;
  if (matchPct === 100) {
    overallFeedback = `Outstanding work! You integrated all ${vocabWords.length} target vocabulary words accurately in your paragraph.`;
  }

  const improvedParagraph = cleanParagraph +
    (wordsUsedIncorrectly.length > 0
      ? ` Furthermore, applying words like ${wordsUsedIncorrectly.join(', ')} elevates the depth of expression.`
      : '');

  return {
    overallFeedback,
    grammarMistakes,
    vocabularySuggestions,
    improvedParagraph,
    wordsUsedCorrectly,
    wordsUsedIncorrectly,
  };
}

/**
 * Sends the user's paragraph and today's vocabulary words to the
 * secure backend Edge Function proxy (or local evaluator) to evaluate the writing.
 */
export async function evaluateWriting(
  vocabWords: string[],
  paragraph: string
): Promise<WritingEvaluation> {
  try {
    const { data, error } = await supabase.functions.invoke('evaluate-writing', {
      body: { vocabWords, paragraph },
    });

    if (!error && data?.evaluation) {
      return data.evaluation as WritingEvaluation;
    }
  } catch (err) {
    console.warn('Edge function invoke warning, falling back to local AI evaluator:', err);
  }

  // Use local evaluator fallback if function returns error or is not configured
  return evaluateWritingLocally(vocabWords, paragraph);
}
