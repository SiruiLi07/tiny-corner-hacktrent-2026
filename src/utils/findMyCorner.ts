import type { CornerItem } from '../types/index.ts';
import {
  extractUserConstraints,
  scoreCandidateDeterministically,
  resolveItemEventDate,
  computeItemsFingerprint,
  parseItemCost,
  evaluateBudgetMatch,
  formatLocalDateISO,
} from './constraintExtractor.ts';
import type { UserConstraints, CostMatchStatus } from './constraintExtractor.ts';

export interface RankedMatchResult {
  itemId: string;
  relevanceScore?: number;
  matchReason: string;
  criteriaMet?: string[];
}

export interface FindMyCornerTiming {
  localFilterMs: number;
  apiCallMs: number;
  totalMs: number;
  cacheHit: boolean;
}

export interface FindMyCornerResponse {
  matches: RankedMatchResult[];
  noMatchExplanation?: string;
  userPreferencesSummary?: string;
  timing?: FindMyCornerTiming;
}

export interface EnrichedMatch {
  item: CornerItem;
  rank: number;
  relevanceScore: number;
  matchReason: string;
  criteriaMet: string[];
  verifiedFacts: {
    cost: string;
    costStatus: CostMatchStatus;
    transit: string;
    wheelchair: string;
    dateTime: string;
  };
}

// Client-side in-memory cache for instant responses on identical queries
// Key includes normalized query + comprehensive items fingerprint so edits invalidate cache immediately
const clientQueryCache = new Map<
  string,
  {
    response: FindMyCornerResponse;
    timestamp: number;
  }
>();

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function getClientCachedResult(
  query: string,
  items: CornerItem[],
  referenceDate?: string | Date
): FindMyCornerResponse | null {
  const fingerprint = computeItemsFingerprint(items);
  const dateStr =
    typeof referenceDate === 'string'
      ? referenceDate
    : formatLocalDateISO(referenceDate || new Date());
  const key = `${query.trim().toLowerCase()}::${fingerprint}::${dateStr}`;
  const entry = clientQueryCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return {
      ...entry.response,
      timing: {
        localFilterMs: 0,
        apiCallMs: 0,
        totalMs: 1,
        cacheHit: true,
      },
    };
  }
  return null;
}

export function setClientCachedResult(
  query: string,
  items: CornerItem[],
  response: FindMyCornerResponse,
  referenceDate?: string | Date
): void {
  const fingerprint = computeItemsFingerprint(items);
  const dateStr =
    typeof referenceDate === 'string'
      ? referenceDate
    : formatLocalDateISO(referenceDate || new Date());
  const key = `${query.trim().toLowerCase()}::${fingerprint}::${dateStr}`;
  clientQueryCache.set(key, { response, timestamp: Date.now() });
}

export function clearClientCache(): void {
  clientQueryCache.clear();
}

/**
 * Generate the *entire* user-facing recommendation explanation from stored fields.
 * Gemini chooses/ranks IDs, but its free-form prose is not trusted: an open-ended
 * phrase blacklist cannot reliably detect invented fares, routes or accessibility.
 * This deliberately excludes unsourced travel estimates, venue facilities, etc.
 */
export function generateFactualExplanation(
  item: CornerItem,
  constraints?: UserConstraints
): string {
  const parsedCost = parseItemCost(item.cost);
  const searchable = [item.title, item.description, item.category, ...(item.tags || [])]
    .join(' ')
    .toLowerCase();
  const matchedKeywords = (constraints?.interestKeywords || [])
    .filter((word) => searchable.includes(word.toLowerCase()))
    .slice(0, 2);
  const parts: string[] = [];

  // The listing itself supplies its area/location; never assume routes or proximity.
  const location = [item.location, item.area].filter(Boolean).join(' · ');
  if (item.area.toLowerCase().includes('peterborough')) {
    parts.push(`${item.title} is located in Peterborough (${location}).`);
  } else {
    parts.push(`${item.title} is listed at ${location || 'an unspecified location'}.`);
  }

  if (matchedKeywords.length > 0) {
    parts.push(`It matches your interest in ${matchedKeywords.join(' and ')}.`);
  } else {
    parts.push(`It is listed under ${item.category}.`);
  }
  if (item.contentType === 'event' && (item.dateDisplay || item.dateTime)) {
    parts.push(`Listed event time: ${item.dateDisplay || item.dateTime}.`);
  }

  const facts: string[] = [];
  if (parsedCost.isUnknown) {
    facts.push('Price: Not confirmed (verify with host)');
  } else if (parsedCost.isFree) {
    facts.push('Cost: Free (according to listing)');
  } else {
    facts.push(`Cost: entry (${parsedCost.display})`);
  }

  if (item.transitAccessible === true) {
    facts.push('Transit: Marked transit-accessible in listing (check route independently)');
  } else if (item.transitAccessible === false) {
    facts.push('Transit: Requires vehicle according to listing');
  } else {
    facts.push('Transit: transit access not confirmed');
  }

  if (item.wheelchairAccessible === true) {
    facts.push('Wheelchair: Marked wheelchair-accessible in listing (confirm with organizer)');
  } else if (item.wheelchairAccessible === false) {
    facts.push('Wheelchair: Not accessible according to listing');
  } else {
    facts.push('Wheelchair: wheelchair accessibility not confirmed');
  }

  parts.push(`Listing details: ${facts.join('; ')}.`);
  return parts.join(' ');
}

/**
 * We never display Gemini's untrusted free-form explanation. It can still
 * influence personalized ranking by choosing candidate IDs; the final explanation
 * is reconstructed from known attributes even if Gemini supplies plausible-sounding
 * but unsupported bus, cost, distance or accessible-entrance claims.
 */
export function validateAndSanitizeExplanation(
  _rawReason: string,
  item: CornerItem,
  constraints?: UserConstraints
): string {
  return generateFactualExplanation(item, constraints);
}

/**
 * Validates and enriches matches returned from Gemini or read from Cache.
 * Defense-in-depth:
 * 1. Only existing items with valid IDs are returned.
 * 2. Matches strictly respect active date constraints and reject past events.
 * 3. Matches strictly enforce numeric budgets and reject confirmed over-budget items.
 * 4. Grounded transit & accessibility verification (no inferences from venue names).
 * 5. Sanitizes LLM explanation to eliminate unsupported assertions.
 * 6. Returns fewer than 3 if fewer than 3 qualify (never pads).
 */
export function enrichAndValidateMatches(
  rawMatches: RankedMatchResult[],
  availableItems: CornerItem[],
  constraints?: UserConstraints,
  referenceDate: Date = new Date()
): EnrichedMatch[] {
  if (!Array.isArray(rawMatches) || rawMatches.length === 0) {
    return [];
  }

  const todayISO = formatLocalDateISO(referenceDate);
  const itemMap = new Map<string, CornerItem>();
  for (const item of availableItems) {
    itemMap.set(item.id, item);
  }

  const validEnriched: EnrichedMatch[] = [];

  for (const match of rawMatches) {
    if (!match.itemId) continue;
    const item = itemMap.get(match.itemId);
    if (!item) {
      // Discard any ID that doesn't exist in current database
      continue;
    }

    // A. Hard Constraint Defense: Date
    const itemDate = resolveItemEventDate(item, referenceDate.getFullYear());
    if (constraints?.hasDateConstraint && constraints.allowedDates && constraints.allowedDates.length > 0) {
      if (item.contentType === 'event') {
        if (!itemDate || !constraints.allowedDates.includes(itemDate)) {
          // Reject date violation (even if cached or returned by model)
          continue;
        }
        if (itemDate < todayISO) {
          // Reject past event
          continue;
        }
      } else if (constraints.requiresEvent) {
        continue;
      }
    } else if (item.contentType === 'event' && itemDate && itemDate < todayISO) {
      // General upcoming search: reject past events
      continue;
    }

    // B. Hard Constraint Defense: Strict Budget Policy
    const parsedCost = parseItemCost(item.cost);
    const budgetStatus = constraints
      ? evaluateBudgetMatch(parsedCost, constraints)
      : 'confirmed_affordable';

    if (constraints?.freeOnly && budgetStatus !== 'confirmed_affordable') {
      continue;
    }
    if (typeof constraints?.numericMaxBudget === 'number' && budgetStatus === 'confirmed_over_budget') {
      // Strict budget policy: reject events whose maximum possible cost exceeds stated budget!
      continue;
    }
    if (constraints?.maxCost === 'Free' && budgetStatus !== 'confirmed_affordable') {
      continue;
    }
    if (constraints?.maxCost === '$' && budgetStatus === 'confirmed_over_budget') {
      continue;
    }

    // C. Hard Constraint Defense: Transportation & Accessibility
    // When transit or wheelchair access is a hard requirement, missing evidence
    // must not be treated as a confirmed match. This also protects cached matches.
    if (constraints?.carFreeRequired && item.transitAccessible !== true) {
      continue;
    }
    if (constraints?.wheelchairRequired && item.wheelchairAccessible !== true) {
      continue;
    }

    // Compute reproducible score & criteria
    const scored = constraints
      ? scoreCandidateDeterministically(item, constraints)
      : {
          criteriaMet: match.criteriaMet || ['General interest match'],
          reproducibleScore: Math.min(100, Math.max(1, match.relevanceScore || 75)),
        };

    // Verified facts (Priority 1 & 2: verified facts only, no unconfirmed claims)
    const verifiedCost = parsedCost.display;
    const verifiedTransit =
      item.transitAccessible === true
        ? 'Confirmed transit-accessible'
        : item.transitAccessible === false
        ? 'Requires personal vehicle'
        : 'Not confirmed';

    const verifiedWheelchair =
      item.wheelchairAccessible === true
        ? 'Confirmed wheelchair-accessible'
        : item.wheelchairAccessible === false
        ? 'Not wheelchair-accessible'
        : 'Not confirmed';

    const verifiedDateTime =
      item.dateDisplay || item.dateTime || (item.bestTimeToVisit ? `Open: ${item.bestTimeToVisit}` : 'Flexible timing');

    // Priority 3: Sanitize explanation to strip unsupported assertions
    const sanitizedReason = validateAndSanitizeExplanation(match.matchReason, item, constraints);

    validEnriched.push({
      item,
      rank: 0,
      relevanceScore: scored.reproducibleScore,
      matchReason: sanitizedReason,
      criteriaMet: scored.criteriaMet,
      verifiedFacts: {
        cost: verifiedCost,
        costStatus: budgetStatus,
        transit: verifiedTransit,
        wheelchair: verifiedWheelchair,
        dateTime: verifiedDateTime,
      },
    });
  }

  // Sort by score descending
  validEnriched.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Return up to 3 (or fewer if fewer qualify — never pad)
  const topMatches = validEnriched.slice(0, 3);
  return topMatches.map((m, idx) => ({
    ...m,
    rank: idx + 1,
  }));
}

/**
 * Legacy compatibility export for existing tests
 */
export function prepareCandidatePayload(items: CornerItem[]) {
  const dummyConstraints = extractUserConstraints('');
  return items.slice(0, 10).map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    area: item.area,
    tags: item.tags,
    dateTime: item.dateDisplay || item.dateTime || null,
  }));
}
