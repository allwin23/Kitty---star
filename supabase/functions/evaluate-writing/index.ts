import { fail, handleOptions, json, readJson, requireUser } from '../_shared/http.ts';

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    // Authenticate the user calling the function
    await requireUser(request);

    // Read input data
    const body = await readJson<{ vocabWords: string[]; paragraph: string }>(request);
    const { vocabWords, paragraph } = body;

    if (!vocabWords || !Array.isArray(vocabWords) || vocabWords.length === 0) {
      throw new Error('vocabWords must be a non-empty array of strings.');
    }
    if (!paragraph || typeof paragraph !== 'string' || paragraph.trim().length === 0) {
      throw new Error('paragraph must be a non-empty string.');
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }

    // Build prompt for Gemini
    const prompt = `
You are an expert English language tutor. Analyze the user's paragraph, which was written to practice a set of vocabulary words.

Required Vocabulary Words: ${JSON.stringify(vocabWords)}
User's Paragraph: "${paragraph.trim()}"

Perform the following tasks:
1. Check if all required vocabulary words were used. Identify which were used correctly and which were used incorrectly or not used.
2. Evaluate the grammar, spelling, and punctuation of the paragraph. Identify specific mistakes with their corrections and explanations.
3. Suggest vocabulary improvements or better word choices.
4. Provide an improved, natural-sounding version of the paragraph that retains the user's original meaning and style but flows much better and uses the vocabulary correctly.
5. Provide overall encouraging feedback on their writing.

You must return a JSON response with the following keys:
- "overallFeedback": string, a brief summary of the strengths and weaknesses of the paragraph.
- "grammarMistakes": array of objects, where each object has:
  - "original": string, the original mistake substring.
  - "correction": string, the corrected substring.
  - "explanation": string, the reason for the correction.
- "vocabularySuggestions": array of objects, where each object has:
  - "word": string, the vocabulary word.
  - "suggestion": string, suggestion for better usage.
- "improvedParagraph": string, the rewritten paragraph.
- "wordsUsedCorrectly": array of strings, vocab words used correctly.
- "wordsUsedIncorrectly": array of strings, vocab words used incorrectly or not used.
`;

    const responseSchema = {
      type: 'object',
      properties: {
        overallFeedback: { type: 'string' },
        grammarMistakes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              original: { type: 'string' },
              correction: { type: 'string' },
              explanation: { type: 'string' },
            },
            required: ['original', 'correction', 'explanation'],
          },
        },
        vocabularySuggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              word: { type: 'string' },
              suggestion: { type: 'string' },
            },
            required: ['word', 'suggestion'],
          },
        },
        improvedParagraph: { type: 'string' },
        wordsUsedCorrectly: {
          type: 'array',
          items: { type: 'string' },
        },
        wordsUsedIncorrectly: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: [
        'overallFeedback',
        'grammarMistakes',
        'vocabularySuggestions',
        'improvedParagraph',
        'wordsUsedCorrectly',
        'wordsUsedIncorrectly',
      ],
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('Empty response from Gemini API.');
    }

    const evaluation = JSON.parse(responseText);
    return json({ evaluation });
  } catch (error) {
    return fail(error);
  }
});
