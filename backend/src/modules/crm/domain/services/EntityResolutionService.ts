/**
 * ==========================================================================
 * CRM Entity Resolution Service
 * ==========================================================================
 *
 * Domain service responsible for real-time detection and prevention of
 * duplicate contact/prospect records across the CRM bounded context.
 *
 * Implements a multi-signal scoring pipeline:
 *   1. Levenshtein Distance  -- edit-distance metric for name fields
 *   2. Jaro-Winkler Similarity -- prefix-weighted similarity for names
 *   3. Email Domain Matching  -- structural comparison of email addresses
 *   4. Phone Canonical Match  -- normalized phone number comparison
 *   5. Company Fuzzy Match    -- organization-level deduplication
 *
 * Each signal produces a score in [0, 1]. The final duplicate confidence
 * is a weighted composite that accounts for the relative reliability
 * of each data point (email > phone > name > company).
 *
 * Thresholds:
 *   >= 0.90  DUPLICATE_CONFIRMED  -- auto-merge or block creation
 *   >= 0.70  DUPLICATE_PROBABLE   -- flag for human review
 *   <  0.70  NO_DUPLICATE         -- allow creation
 *
 * Complexity: O(n * m) per field comparison where n, m are string lengths.
 * For batch operations, an inverted index (trigram) pre-filter reduces
 * the candidate set before running pairwise comparisons.
 * ==========================================================================
 */

export interface EntityCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
}

export interface ResolutionResult {
  candidateId: string;
  confidence: number;
  verdict: DuplicateVerdict;
  breakdown: SignalBreakdown;
}

export interface SignalBreakdown {
  nameScore: number;
  emailScore: number;
  phoneScore: number;
  companyScore: number;
}

export enum DuplicateVerdict {
  DUPLICATE_CONFIRMED = 'DUPLICATE_CONFIRMED',
  DUPLICATE_PROBABLE = 'DUPLICATE_PROBABLE',
  NO_DUPLICATE = 'NO_DUPLICATE',
}

const WEIGHTS = {
  name: 0.25,
  email: 0.40,
  phone: 0.20,
  company: 0.15,
} as const;

const THRESHOLDS = {
  confirmed: 0.90,
  probable: 0.70,
} as const;

export class EntityResolutionService {
  /**
   * Evaluates a new contact record against a set of existing candidates
   * to determine if it is a potential duplicate.
   *
   * @param incoming  The record being created or imported.
   * @param existing  The candidate set retrieved from the database
   *                  (pre-filtered by trigram index on name + email domain).
   * @returns         Sorted array of matches above the probable threshold.
   */
  resolve(
    incoming: EntityCandidate,
    existing: EntityCandidate[],
  ): ResolutionResult[] {
    const results: ResolutionResult[] = [];

    for (const candidate of existing) {
      if (candidate.id === incoming.id) continue;

      const breakdown = this.computeSignals(incoming, candidate);
      const confidence = this.computeComposite(breakdown, incoming, candidate);
      const verdict = this.classify(confidence);

      if (verdict !== DuplicateVerdict.NO_DUPLICATE) {
        results.push({
          candidateId: candidate.id,
          confidence: Math.round(confidence * 1000) / 1000,
          verdict,
          breakdown,
        });
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  // ---------------------------------------------------------------------------
  // Signal Computation
  // ---------------------------------------------------------------------------

  private computeSignals(
    a: EntityCandidate,
    b: EntityCandidate,
  ): SignalBreakdown {
    const firstNameSim = this.jaroWinkler(
      this.normalize(a.firstName),
      this.normalize(b.firstName),
    );
    const lastNameSim = this.jaroWinkler(
      this.normalize(a.lastName),
      this.normalize(b.lastName),
    );
    const nameScore = firstNameSim * 0.4 + lastNameSim * 0.6;

    const emailScore = this.computeEmailSimilarity(a.email, b.email);

    const phoneScore =
      a.phone && b.phone ? this.computePhoneSimilarity(a.phone, b.phone) : 0;

    const companyScore =
      a.companyName && b.companyName
        ? this.jaroWinkler(
            this.normalize(a.companyName),
            this.normalize(b.companyName),
          )
        : 0;

    return {
      nameScore: Math.round(nameScore * 1000) / 1000,
      emailScore: Math.round(emailScore * 1000) / 1000,
      phoneScore: Math.round(phoneScore * 1000) / 1000,
      companyScore: Math.round(companyScore * 1000) / 1000,
    };
  }

  /**
   * Weighted composite score with dynamic weight adjustment.
   * When a signal is absent (e.g., no phone), its weight is redistributed
   * proportionally to the remaining signals.
   */
  private computeComposite(
    breakdown: SignalBreakdown,
    a: EntityCandidate,
    b: EntityCandidate,
  ): number {
    let totalWeight = 0;
    let weightedSum = 0;

    const signals: { score: number; weight: number; present: boolean }[] = [
      { score: breakdown.nameScore, weight: WEIGHTS.name, present: true },
      { score: breakdown.emailScore, weight: WEIGHTS.email, present: true },
      {
        score: breakdown.phoneScore,
        weight: WEIGHTS.phone,
        present: !!(a.phone && b.phone),
      },
      {
        score: breakdown.companyScore,
        weight: WEIGHTS.company,
        present: !!(a.companyName && b.companyName),
      },
    ];

    const activeWeight = signals
      .filter((s) => s.present)
      .reduce((sum, s) => sum + s.weight, 0);

    for (const signal of signals) {
      if (!signal.present) continue;
      const normalizedWeight = signal.weight / activeWeight;
      weightedSum += signal.score * normalizedWeight;
      totalWeight += normalizedWeight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private classify(confidence: number): DuplicateVerdict {
    if (confidence >= THRESHOLDS.confirmed) return DuplicateVerdict.DUPLICATE_CONFIRMED;
    if (confidence >= THRESHOLDS.probable) return DuplicateVerdict.DUPLICATE_PROBABLE;
    return DuplicateVerdict.NO_DUPLICATE;
  }

  // ---------------------------------------------------------------------------
  // Levenshtein Distance
  // ---------------------------------------------------------------------------

  /**
   * Classic Wagner-Fischer algorithm for computing the minimum number of
   * single-character edits (insertions, deletions, substitutions) required
   * to transform string `a` into string `b`.
   *
   * Time: O(n * m)  |  Space: O(min(n, m)) via single-row optimization
   */
  levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    // Ensure `a` is the shorter string for space optimization.
    if (a.length > b.length) [a, b] = [b, a];

    const m = a.length;
    const n = b.length;
    let prev = new Array(m + 1);
    let curr = new Array(m + 1);

    for (let i = 0; i <= m; i++) prev[i] = i;

    for (let j = 1; j <= n; j++) {
      curr[0] = j;
      for (let i = 1; i <= m; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[i] = Math.min(
          prev[i] + 1,      // deletion
          curr[i - 1] + 1,  // insertion
          prev[i - 1] + cost, // substitution
        );
      }
      [prev, curr] = [curr, prev];
    }

    return prev[m];
  }

  /**
   * Normalized Levenshtein similarity in [0, 1].
   * 1.0 = identical strings, 0.0 = completely different.
   */
  levenshteinSimilarity(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1.0;
    return 1.0 - this.levenshteinDistance(a, b) / maxLen;
  }

  // ---------------------------------------------------------------------------
  // Jaro-Winkler Similarity
  // ---------------------------------------------------------------------------

  /**
   * Jaro-Winkler similarity metric, optimized for short strings (names).
   *
   * The Jaro similarity accounts for:
   *   - The number of matching characters within a sliding window.
   *   - The number of transpositions (matched chars in different order).
   *
   * Winkler modification adds a bonus for common prefixes (up to 4 chars),
   * reflecting the empirical observation that typographic errors are less
   * frequent at the beginning of names.
   *
   * Returns a value in [0, 1] where 1.0 = exact match.
   */
  jaroWinkler(s1: string, s2: string, prefixScale: number = 0.1): number {
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const matchWindow = Math.max(Math.floor(Math.max(s1.length, s2.length) / 2) - 1, 0);

    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Pass 1: Find matching characters within the window.
    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, s2.length);

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // Pass 2: Count transpositions.
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    const jaro =
      (matches / s1.length +
        matches / s2.length +
        (matches - transpositions / 2) / matches) /
      3;

    // Winkler prefix bonus (max 4 characters).
    let prefixLength = 0;
    const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
    for (let i = 0; i < maxPrefix; i++) {
      if (s1[i] === s2[i]) prefixLength++;
      else break;
    }

    return jaro + prefixLength * prefixScale * (1 - jaro);
  }

  // ---------------------------------------------------------------------------
  // Domain-Specific Comparators
  // ---------------------------------------------------------------------------

  private computeEmailSimilarity(emailA: string, emailB: string): number {
    const a = emailA.trim().toLowerCase();
    const b = emailB.trim().toLowerCase();

    // Exact match
    if (a === b) return 1.0;

    const [localA, domainA] = a.split('@');
    const [localB, domainB] = b.split('@');

    if (!domainA || !domainB) return 0;

    // Same domain: high base score + local part similarity
    if (domainA === domainB) {
      const localSim = this.jaroWinkler(localA, localB);
      return 0.5 + localSim * 0.5;
    }

    // Different domains but similar local parts (e.g., same person, different company)
    const localSim = this.jaroWinkler(localA, localB);
    return localSim * 0.3;
  }

  private computePhoneSimilarity(phoneA: string, phoneB: string): number {
    const a = phoneA.replace(/[\s\-\(\)\.\+]/g, '');
    const b = phoneB.replace(/[\s\-\(\)\.\+]/g, '');

    if (a === b) return 1.0;

    // Handle country code prefix variations: compare last N digits
    const minLen = Math.min(a.length, b.length);
    const suffixA = a.slice(-minLen);
    const suffixB = b.slice(-minLen);

    if (suffixA === suffixB) return 0.95;

    return this.levenshteinSimilarity(a, b);
  }

  // ---------------------------------------------------------------------------
  // Normalization
  // ---------------------------------------------------------------------------

  private normalize(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Strip diacritics
      .replace(/[^a-z0-9\s]/g, '')      // Remove special chars
      .replace(/\s+/g, ' ');
  }
}
