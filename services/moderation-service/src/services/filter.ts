/**
 * ProfanityFilter – simple word-based content filter.
 *
 * In production this would be backed by a more sophisticated NLP pipeline
 * or a third-party moderation API.  The in-memory word list is sufficient
 * for development and demonstrates the filter routing logic.
 */
export class ProfanityFilter {
  private words: Set<string>;

  constructor(initialWords?: string[]) {
    this.words = new Set(
      (initialWords ?? [
        'badword',
        'offensive',
        'slur',
        'profanity',
        'hateful',
        'abuse',
        'spam',
        'scam',
        'phishing',
      ]).map((w) => w.toLowerCase()),
    );
  }

  /**
   * Check a text string against the word list.
   * Returns whether the text was flagged and which words matched.
   */
  check(text: string): { flagged: boolean; matches: string[] } {
    const normalised = text.toLowerCase();
    const matches: string[] = [];

    for (const word of this.words) {
      // Use word-boundary matching to avoid false positives on substrings
      const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
      if (regex.test(normalised)) {
        matches.push(word);
      }
    }

    return {
      flagged: matches.length > 0,
      matches,
    };
  }

  /**
   * Add words to the filter list.
   */
  addWords(words: string[]): void {
    for (const word of words) {
      this.words.add(word.toLowerCase());
    }
    console.log(`[ProfanityFilter] Added ${words.length} words, total: ${this.words.size}`);
  }

  /**
   * Remove words from the filter list.
   */
  removeWords(words: string[]): void {
    for (const word of words) {
      this.words.delete(word.toLowerCase());
    }
    console.log(`[ProfanityFilter] Removed ${words.length} words, total: ${this.words.size}`);
  }

  /**
   * Get all current filter words.
   */
  getWords(): string[] {
    return Array.from(this.words);
  }
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const profanityFilter = new ProfanityFilter();
