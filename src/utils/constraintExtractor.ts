import type { CornerItem } from '../types/index.ts';

export interface UserConstraints {
  rawQuery: string;
  hasDateConstraint: boolean;
  allowedDates?: string[]; // ISO YYYY-MM-DD
  dateLabel?: string;
  requiresEvent?: boolean;
  maxCost?: 'Free' | '$' | '$$' | '$$$';
  freeOnly?: boolean;
  numericMaxBudget?: number;
  wheelchairRequired?: boolean;
  carFreeRequired?: boolean;
  interestKeywords: string[];
}

export type CostMatchStatus = 'confirmed_affordable' | 'confirmed_over_budget' | 'not_confirmed';

export interface ParsedItemCost {
  min: number;
  max: number;
  isFree: boolean;
  isUnknown: boolean;
  display: string;
}

export interface CandidateWithScore {
  item: CornerItem;
  criteriaMet: string[];
  missingCriteria: string[];
  reproducibleScore: number;
}

/**
 * Validates whether a year is a leap year in the Gregorian calendar
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Strictly validates that a date actually exists on the calendar.
 * Rejects impossible dates such as February 31 or February 29 on non-leap years.
 */
export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (year < 1900 || year > 2200) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const daysInMonth = [0, 31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month];
}

/**
 * Format a Date to YYYY-MM-DD in local time
 */
export function formatLocalDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MONTH_NAME_MAP: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

/**
 * Extracts a normalized ISO YYYY-MM-DD date from an item.
 * Strictly validates calendar reality (rejects Feb 31, Feb 29 on non-leap years, etc.).
 * Supports explicit eventDate, ISO strings, and dates in any month of the year.
 */
export function resolveItemEventDate(item: CornerItem, referenceYear = 2026): string | null {
  // 1. If explicit eventDate is already set
  if (item.eventDate && typeof item.eventDate === 'string') {
    const isoMatch = item.eventDate.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10);
      const day = parseInt(isoMatch[3], 10);
      if (isValidCalendarDate(year, month, day)) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      return null; // Reject impossible calendar dates
    }
  }

  // 2. Inspect dateDisplay and dateTime
  const raw = `${item.dateDisplay || ''} ${item.dateTime || ''}`.trim();
  if (!raw) return null;

  // 2a. Direct ISO format check (e.g. "2026-11-07" or "2026-12-05T14:00")
  const directIsoMatch = raw.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (directIsoMatch) {
    const year = parseInt(directIsoMatch[1], 10);
    const month = parseInt(directIsoMatch[2], 10);
    const day = parseInt(directIsoMatch[3], 10);
    if (isValidCalendarDate(year, month, day)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
  }

  // 2b. Month name + Day pattern (e.g. "Nov 7", "November 14th", "Dec 05", "December 15, 2026")
  const monthFirstMatch = raw.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i
  );
  if (monthFirstMatch) {
    const monthKey = monthFirstMatch[1].toLowerCase();
    const monthNumStr = MONTH_NAME_MAP[monthKey] || '11';
    const month = parseInt(monthNumStr, 10);
    const day = parseInt(monthFirstMatch[2], 10);
    const year = monthFirstMatch[3] ? parseInt(monthFirstMatch[3], 10) : referenceYear;

    if (isValidCalendarDate(year, month, day)) {
      const monthPad = String(month).padStart(2, '0');
      const dayPad = String(day).padStart(2, '0');
      return `${year}-${monthPad}-${dayPad}`;
    }
    return null;
  }

  // 2c. Day + Month name pattern (e.g. "7 Nov", "14th November 2026")
  const dayFirstMatch = raw.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:,?\s*(\d{4}))?\b/i
  );
  if (dayFirstMatch) {
    const day = parseInt(dayFirstMatch[1], 10);
    const monthKey = dayFirstMatch[2].toLowerCase();
    const monthNumStr = MONTH_NAME_MAP[monthKey] || '11';
    const month = parseInt(monthNumStr, 10);
    const year = dayFirstMatch[3] ? parseInt(dayFirstMatch[3], 10) : referenceYear;

    if (isValidCalendarDate(year, month, day)) {
      const monthPad = String(month).padStart(2, '0');
      const dayPad = String(day).padStart(2, '0');
      return `${year}-${monthPad}-${dayPad}`;
    }
    return null;
  }

  return null;
}

/**
 * Parses numeric cost values from an item's cost field into structured min and max.
 * Handles ranges (e.g. "$5–$30", "$10 - $20", "$5 to $15"), free activities,
 * tier symbols, and unknown/not confirmed prices.
 */
export function parseItemCost(cost?: string): ParsedItemCost {
  if (!cost || cost.trim() === '' || cost === 'Not confirmed' || cost.toLowerCase() === 'unknown') {
    return { min: 0, max: 0, isFree: false, isUnknown: true, display: 'Not confirmed' };
  }

  const c = cost.trim().toLowerCase();

  // Pure free
  if (c === 'free' || c === '$0' || c === '0' || c === 'free to browse') {
    return { min: 0, max: 0, isFree: true, isUnknown: false, display: 'Free' };
  }

  // Free with optional donation
  if (c.includes('free') && (c.includes('donation') || c.includes('optional'))) {
    // Check if donation amount specified (e.g. "$5 suggested donation")
    const donationMatch = c.match(/\$?(\d+(?:\.\d+)?)/);
    const donationMax = donationMatch ? parseFloat(donationMatch[1]) : 5;
    return { min: 0, max: donationMax, isFree: true, isUnknown: false, display: cost };
  }

  // Extract explicit dollar numbers: e.g. "$5", "$15", "$5–$30", "$10 - $20", "$5 to $15"
  // Normalize dashes and "to"
  const normalizedRange = c.replace(/[–—]/g, '-');
  const dollarMatches = normalizedRange.match(/\$?(\d+(?:\.\d+)?)/g);
  if (dollarMatches && dollarMatches.length > 0) {
    const nums = dollarMatches.map((val) => parseFloat(val.replace('$', ''))).filter((n) => !isNaN(n));
    if (nums.length > 0) {
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      return {
        min,
        max,
        isFree: min === 0 && max === 0,
        isUnknown: false,
        display: nums.length > 1 ? `$${min}–$${max}` : `$${min}`,
      };
    }
  }

  // Tier approximations
  if (c === '$') {
    return { min: 5, max: 15, isFree: false, isUnknown: false, display: '$ (Under $15)' };
  }
  if (c === '$$') {
    return { min: 16, max: 35, isFree: false, isUnknown: false, display: '$$ ($16-$35)' };
  }
  if (c === '$$$') {
    return { min: 36, max: 75, isFree: false, isUnknown: false, display: '$$$ ($36+)' };
  }

  return { min: 0, max: 0, isFree: false, isUnknown: true, display: 'Not confirmed' };
}

/**
 * Evaluates whether an item's cost meets the user's budget constraints.
 * Distinguishes three states:
 * - 'confirmed_affordable': strictly meets budget (maximum possible cost <= budget constraint)
 * - 'confirmed_over_budget': maximum cost exceeds budget constraint
 * - 'not_confirmed': cost information is unknown or missing
 */
export function evaluateBudgetMatch(
  parsed: ParsedItemCost,
  constraints: UserConstraints
): CostMatchStatus {
  // An unknown price can NEVER be confirmed affordable!
  if (parsed.isUnknown) {
    return 'not_confirmed';
  }

  // 1. Strict Free Only
  if (constraints.freeOnly) {
    return parsed.isFree ? 'confirmed_affordable' : 'confirmed_over_budget';
  }

  // 2. Numeric Maximum Budget (e.g. "under $20", "less than $15")
  if (typeof constraints.numericMaxBudget === 'number') {
    // STRICT BUDGET POLICY: An event is only a confirmed match when its MAXIMUM possible cost meets the budget!
    return parsed.max <= constraints.numericMaxBudget
      ? 'confirmed_affordable'
      : 'confirmed_over_budget';
  }

  // 3. General Free
  if (constraints.maxCost === 'Free') {
    return parsed.isFree ? 'confirmed_affordable' : 'confirmed_over_budget';
  }

  // 4. Tier $ (Under $15)
  if (constraints.maxCost === '$') {
    return parsed.max <= 15 ? 'confirmed_affordable' : 'confirmed_over_budget';
  }

  // 5. Tier $$ (Under $35)
  if (constraints.maxCost === '$$') {
    return parsed.max <= 35 ? 'confirmed_affordable' : 'confirmed_over_budget';
  }

  // When no budget is constrained and price is known, it is affordable
  return 'confirmed_affordable';
}

/**
 * Resolves natural language date and budget phrasing using the user's reference date
 */
export function extractUserConstraints(query: string, referenceDate: Date = new Date()): UserConstraints {
  const q = query.toLowerCase();

  const constraints: UserConstraints = {
    rawQuery: query,
    hasDateConstraint: false,
    interestKeywords: [],
  };

  const refDayOfWeek = referenceDate.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
  const todayISO = formatLocalDateISO(referenceDate);

  // Helper to add days cleanly respecting month/year rollovers
  const addDays = (base: Date, days: number): Date => {
    const next = new Date(base.getTime());
    next.setDate(base.getDate() + days);
    return next;
  };

  // 1. Resolve relative dates
  if (q.includes('next weekend')) {
    constraints.hasDateConstraint = true;
    constraints.dateLabel = 'Next Weekend';

    // Days until next Saturday (the weekend following this weekend):
    // - On Sunday (0): this weekend is today; next weekend's Saturday is in 6 days (e.g. Nov 8 -> Nov 14)
    // - On Saturday (6): next weekend's Saturday is in 7 days (e.g. Nov 7 -> Nov 14)
    // - On Mon-Fri (1-5): next weekend is the one after upcoming weekend -> (6 - refDayOfWeek) + 7
    let daysUntilNextSat = 0;
    if (refDayOfWeek === 0) {
      daysUntilNextSat = 6;
    } else if (refDayOfWeek === 6) {
      daysUntilNextSat = 7;
    } else {
      daysUntilNextSat = 6 - refDayOfWeek + 7;
    }

    const sat = addDays(referenceDate, daysUntilNextSat);
    const sun = addDays(sat, 1);
    constraints.allowedDates = [formatLocalDateISO(sat), formatLocalDateISO(sun)];
  } else if (q.includes('this weekend') || q.includes('the weekend') || q.includes('this coming weekend')) {
    constraints.hasDateConstraint = true;
    constraints.dateLabel = 'This Weekend';

    if (refDayOfWeek === 5) {
      // Friday: Saturday and Sunday
      const sat = addDays(referenceDate, 1);
      const sun = addDays(referenceDate, 2);
      constraints.allowedDates = [formatLocalDateISO(sat), formatLocalDateISO(sun)];
    } else if (refDayOfWeek === 6) {
      // Saturday: today and Sunday
      const sun = addDays(referenceDate, 1);
      constraints.allowedDates = [todayISO, formatLocalDateISO(sun)];
    } else if (refDayOfWeek === 0) {
      // Sunday: for upcoming activities, yesterday (Saturday) has passed. Only today (Sunday) remains!
      constraints.allowedDates = [todayISO];
    } else {
      // Mon - Thu: upcoming Saturday and Sunday
      const daysUntilSat = 6 - refDayOfWeek;
      const sat = addDays(referenceDate, daysUntilSat);
      const sun = addDays(sat, 1);
      constraints.allowedDates = [formatLocalDateISO(sat), formatLocalDateISO(sun)];
    }
  } else if (q.includes('today') || q.includes('tonight')) {
    constraints.hasDateConstraint = true;
    constraints.dateLabel = 'Today';
    constraints.allowedDates = [todayISO];
  } else if (q.includes('tomorrow')) {
    constraints.hasDateConstraint = true;
    constraints.dateLabel = 'Tomorrow';
    constraints.allowedDates = [formatLocalDateISO(addDays(referenceDate, 1))];
  } else if (q.includes('this saturday') || q.includes('on saturday') || (q.includes('saturday') && !q.includes('weekend'))) {
    constraints.hasDateConstraint = true;
    constraints.dateLabel = 'Saturday';
    const daysUntilSat = (6 - refDayOfWeek + 7) % 7 || 7;
    constraints.allowedDates = [formatLocalDateISO(addDays(referenceDate, refDayOfWeek === 6 ? 0 : daysUntilSat))];
  } else if (q.includes('this sunday') || q.includes('on sunday') || (q.includes('sunday') && !q.includes('weekend'))) {
    constraints.hasDateConstraint = true;
    constraints.dateLabel = 'Sunday';
    const daysUntilSun = (7 - refDayOfWeek) % 7 || 7;
    constraints.allowedDates = [formatLocalDateISO(addDays(referenceDate, refDayOfWeek === 0 ? 0 : daysUntilSun))];
  } else {
    // Check for explicit calendar date in query (e.g. "Nov 14", "November 7", "Dec 5", "2026-11-14")
    const explicitDate = resolveItemEventDate({ dateDisplay: query } as any, referenceDate.getFullYear());
    if (explicitDate) {
      constraints.hasDateConstraint = true;
      constraints.dateLabel = explicitDate;
      constraints.allowedDates = [explicitDate];
    }
  }

  // 2. Event vs venue request
  if (
    q.includes('meet people') ||
    q.includes('meet a few') ||
    q.includes('gathering') ||
    q.includes('event') ||
    q.includes('group') ||
    q.includes('session') ||
    q.includes('join')
  ) {
    constraints.requiresEvent = true;
  }

  // 3. Cost & budget constraint (Priority 1: numeric budget limits & free only)
  // 3a. Strict "free only" check
  if (
    /\b(?:free\s+only|only\s+free|strictly\s+free)\b/i.test(q) ||
    q.includes('$0 only') ||
    q.includes('zero dollars')
  ) {
    constraints.maxCost = 'Free';
    constraints.freeOnly = true;
    constraints.numericMaxBudget = 0;
  } else if (
    q.includes('free') ||
    q.includes('no cost') ||
    q.includes('zero cost') ||
    q.includes('without spending') ||
    q.includes('$0')
  ) {
    constraints.maxCost = 'Free';
    constraints.numericMaxBudget = 0;
  }

  // 3b. Numeric budget limits (e.g. "under $20", "less than $15", "maximum $25", "max $20", "up to $10", "budget of $25", "no more than $20", "$20 or less", "$25 max")
  let numericBudgetMatch = q.match(
    /\b(?:under|less\s+than|below|up\s+to|no\s+more\s+than|within|limit\s+of|max(?:imum)?|budget\s+of|budget\s*:?)\s*\$?(\d+(?:\.\d+)?)\s*(?:dollars?|bucks)?\b/i
  );
  if (!numericBudgetMatch) {
    numericBudgetMatch = q.match(
      /\$?(\d+(?:\.\d+)?)\s*(?:dollars?|bucks)?\s*(?:or\s+less|max(?:imum)?|limit)\b/i
    );
  }
  if (numericBudgetMatch) {
    const budgetVal = parseFloat(numericBudgetMatch[1]);
    if (!isNaN(budgetVal)) {
      constraints.numericMaxBudget = budgetVal;
      if (budgetVal === 0) {
        constraints.maxCost = 'Free';
      } else if (budgetVal <= 15) {
        constraints.maxCost = '$';
      } else if (budgetVal <= 35) {
        constraints.maxCost = '$$';
      } else {
        constraints.maxCost = '$$$';
      }
    }
  } else if (
    q.includes('cheap') ||
    q.includes('inexpensive') ||
    q.includes('budget') ||
    q.includes('without spending a lot') ||
    q.includes('low cost')
  ) {
    constraints.maxCost = '$';
    constraints.numericMaxBudget = 15;
  }

  // 4. Accessibility constraint
  if (
    q.includes('wheelchair') ||
    q.includes('accessible') ||
    q.includes('step-free') ||
    q.includes('barrier-free') ||
    q.includes('mobility')
  ) {
    constraints.wheelchairRequired = true;
  }

  // 5. Transportation / car-free constraint
  if (
    q.includes('no car') ||
    q.includes("don't have a car") ||
    q.includes('without a car') ||
    q.includes('car-free') ||
    q.includes('carfree') ||
    q.includes('walkable') ||
    q.includes('on foot') ||
    q.includes('transit') ||
    /\b(?:bus|buses|public transit)\b/.test(q)
  ) {
    constraints.carFreeRequired = true;
  }

  // 6. Topic keywords
  const TOPIC_WORDS = [
    'photography',
    'photo',
    'camera',
    '35mm',
    'board game',
    'boardgame',
    'catan',
    'hike',
    'hiking',
    'birding',
    'birds',
    'nature',
    'coffee',
    'tea',
    'study',
    'reading',
    'craft',
    'crafts',
    'knit',
    'knitting',
    'crochet',
    'mending',
    'music',
    'folk',
    'guitar',
    'acoustic',
    'vinyl',
    'records',
    'disc golf',
    'frisbee',
    'farmers market',
    'market',
    'watercolour',
    'sketching',
  ];

  for (const topic of TOPIC_WORDS) {
    if (q.includes(topic)) {
      constraints.interestKeywords.push(topic);
    }
  }

  return constraints;
}

/**
 * Applies hard constraints to filter available corners before calling Gemini.
 * Guarantees:
 * 1. Zero date-constraint violations and no past events recommended as upcoming.
 * 2. Strict maximum budgets: events whose maximum cost exceeds the user's budget are rejected.
 * 3. Free-only strictly requires verified free events.
 * 4. Zero false transit or wheelchair inferences.
 */
export function filterCandidatesByHardConstraints(
  items: CornerItem[],
  constraints: UserConstraints,
  referenceDate: Date = new Date()
): CornerItem[] {
  const todayISO = formatLocalDateISO(referenceDate);

  return items.filter((item) => {
    // A. Date Hard Constraints & Past Event Rejection
    const eventDateISO = resolveItemEventDate(item, referenceDate.getFullYear());

    if (constraints.hasDateConstraint && constraints.allowedDates && constraints.allowedDates.length > 0) {
      if (item.contentType === 'event') {
        if (!eventDateISO || !constraints.allowedDates.includes(eventDateISO)) {
          // Hard rejection: event date does not match requested date window
          return false;
        }
        // Never recommend past events
        if (eventDateISO < todayISO) {
          return false;
        }
      } else {
        // If user explicitly asked for an event/meetup to "meet people", filter out lifestyle venues
        if (constraints.requiresEvent) {
          return false;
        }
      }
    } else if (item.contentType === 'event' && eventDateISO) {
      // General upcoming event search: reject past events
      if (eventDateISO < todayISO) {
        return false;
      }
    }

    // B. Budget & Cost Hard Constraints
    const parsedCost = parseItemCost(item.cost);
    const budgetStatus = evaluateBudgetMatch(parsedCost, constraints);

    if (constraints.freeOnly) {
      if (budgetStatus !== 'confirmed_affordable') {
        return false; // Reject unconfirmed or paid events
      }
    } else if (typeof constraints.numericMaxBudget === 'number') {
      // Strict budget: if confirmed over budget (max > budget), reject!
      if (budgetStatus === 'confirmed_over_budget') {
        return false;
      }
    } else if (constraints.maxCost === 'Free') {
      if (budgetStatus !== 'confirmed_affordable') {
        return false;
      }
    } else if (constraints.maxCost === '$') {
      if (budgetStatus === 'confirmed_over_budget') {
        return false;
      }
    }

    // C. Wheelchair Hard Constraint (Priority 2: no inference from venue)
    if (constraints.wheelchairRequired && item.wheelchairAccessible !== true) {
      // Strict requirement: unknown is not the same as verified accessible.
      return false;
    }

    // D. Car-Free / Transit Hard Constraint (Priority 2: no inference from venue/area)
    if (constraints.carFreeRequired && item.transitAccessible !== true) {
      // Strict car-free / public transit requirement requires affirmative data.
      return false;
    }

    return true;
  });
}

/**
 * Pre-scores candidate corners using a deterministic, transparent formula.
 * Zero transit or accessibility inferences: transit points only awarded if verified in stored data.
 * Distinguishes confirmed affordable, over budget, and price not confirmed.
 */
export function scoreCandidateDeterministically(
  item: CornerItem,
  constraints: UserConstraints
): CandidateWithScore {
  let score = 0;
  const criteriaMet: string[] = [];
  const missingCriteria: string[] = [];

  const itemText = (
    item.title +
    ' ' +
    item.description +
    ' ' +
    item.category +
    ' ' +
    item.area +
    ' ' +
    item.tags.join(' ') +
    ' ' +
    (item.vibe || '')
  ).toLowerCase();

  // 1. Date Fit (up to 40 pts)
  if (constraints.hasDateConstraint && constraints.allowedDates) {
    const itemDate = resolveItemEventDate(item);
    if (itemDate && constraints.allowedDates.includes(itemDate)) {
      score += 40;
      criteriaMet.push(`Date: ${item.dateDisplay || constraints.dateLabel}`);
    } else if (item.contentType === 'lifestyle' && !constraints.requiresEvent) {
      score += 25;
      criteriaMet.push('Open anytime this weekend');
    } else {
      missingCriteria.push('Date outside requested range');
    }
  } else {
    // If no date requested, award baseline timing score
    score += 35;
  }

  // 2. Interest / Topic Fit (up to 35 pts)
  let matchedInterests = 0;
  for (const kw of constraints.interestKeywords) {
    if (itemText.includes(kw)) {
      matchedInterests++;
    }
  }

  if (constraints.interestKeywords.length > 0) {
    if (matchedInterests > 0) {
      const matchRatio = Math.min(1, matchedInterests / Math.min(2, constraints.interestKeywords.length));
      const topicScore = Math.round(35 * matchRatio);
      score += topicScore;
      criteriaMet.push(`Matched topic: ${constraints.interestKeywords.slice(0, 2).join(', ')}`);
    } else {
      missingCriteria.push('Does not directly match niche topic');
    }
  } else {
    // No specific keyword specified; general discovery
    score += 25;
    criteriaMet.push('Relevant Peterborough discovery');
  }

  // 3. Transportation & Location Fit (up to 15 pts)
  // Zero transit inferences: transit points only awarded if verified in stored data!
  if (constraints.carFreeRequired) {
    if (item.transitAccessible === true) {
      score += 15;
      criteriaMet.push('Transit: Confirmed transit-accessible');
    } else if (item.transitAccessible === false) {
      score -= 20;
      missingCriteria.push('Transit: Confirmed requires vehicle');
    } else {
      missingCriteria.push('Transit: Not confirmed in stored records');
    }
  } else {
    score += 15;
  }

  // 4. Budget Fit (up to 10 pts)
  // Only display verified budget-match badges when an explicit budget constraint exists and price data supports it!
  const costInfo = parseItemCost(item.cost);
  const budgetStatus = evaluateBudgetMatch(costInfo, constraints);
  const hasExplicitBudget =
    constraints.freeOnly ||
    typeof constraints.numericMaxBudget === 'number' ||
    Boolean(constraints.maxCost);

  if (hasExplicitBudget) {
    if (budgetStatus === 'confirmed_affordable') {
      score += 10;
      if (costInfo.isFree) {
        criteriaMet.push('Budget: Confirmed Free');
      } else if (typeof constraints.numericMaxBudget === 'number') {
        criteriaMet.push(`Budget: Confirmed under $${constraints.numericMaxBudget} (${costInfo.display})`);
      } else {
        criteriaMet.push(`Budget: Confirmed affordable (${costInfo.display})`);
      }
    } else if (budgetStatus === 'not_confirmed') {
      // Never label unknown prices as verified budget matches!
      missingCriteria.push('Price: Not confirmed in stored data (verify before attending)');
    } else {
      missingCriteria.push(`Price: Exceeds stated budget (${costInfo.display})`);
    }
  } else {
    // When no budget is constrained by user, award neutral baseline points (known price = 10, unknown = 5)
    // NEVER push a "Budget: Confirmed affordable" badge!
    if (!costInfo.isUnknown) {
      score += 10;
    } else {
      score += 5;
      missingCriteria.push('Price: Not confirmed in stored data (verify before attending)');
    }
  }

  // 5. Wheelchair Accessibility Fit (up to 15 pts)
  // When wheelchair access is explicitly required, distinguish verified matches from unknown/unverified
  if (constraints.wheelchairRequired) {
    if (item.wheelchairAccessible === true) {
      score += 15;
      criteriaMet.push('Wheelchair: Confirmed accessible');
    } else if (item.wheelchairAccessible === false) {
      score -= 20;
      missingCriteria.push('Wheelchair: Confirmed not accessible');
    } else {
      missingCriteria.push('Wheelchair: Not confirmed in stored records');
    }
  }

  const finalScore = Math.min(100, Math.max(1, score));

  return {
    item,
    criteriaMet,
    missingCriteria,
    reproducibleScore: finalScore,
  };
}

/**
 * Prepares the compact candidate payload (top 10 max) for Gemini.
 * Sends ONLY essential compact fields, preserving unknown prices as "Not confirmed" (never Free).
 */
export function prepareTop10CompactPayload(
  items: CornerItem[],
  constraints: UserConstraints,
  referenceDate: Date = new Date()
): Array<{
  id: string;
  title: string;
  category: string;
  area: string;
  dateTime: string | null;
  cost: string;
  transitAccessible: string;
  wheelchairAccessible: string;
  keyDetails: string;
  tags: string[];
}> {
  // 1. Filter by hard constraints
  const filtered = filterCandidatesByHardConstraints(items, constraints, referenceDate);

  // 2. Score deterministically
  const scored = filtered.map((item) => scoreCandidateDeterministically(item, constraints));

  // 3. Sort by score descending
  scored.sort((a, b) => b.reproducibleScore - a.reproducibleScore);

  // 4. Cap at top 10
  const top10 = scored.slice(0, 10);

  // 5. Build compact lean schema — NEVER label unknown prices as Free
  return top10.map(({ item }) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    area: item.area,
    dateTime: item.dateDisplay || item.dateTime || null,
    cost: item.cost && item.cost.trim() !== '' ? item.cost : 'Not confirmed',
    transitAccessible:
      item.transitAccessible === true
        ? 'Confirmed transit-accessible'
        : item.transitAccessible === false
        ? 'Requires personal vehicle'
        : 'Not confirmed',
    wheelchairAccessible:
      item.wheelchairAccessible === true
        ? 'Confirmed wheelchair-accessible'
        : item.wheelchairAccessible === false
        ? 'Not wheelchair-accessible'
        : 'Not confirmed',
    keyDetails: item.description.slice(0, 120),
    tags: [...new Set((item.tags || []).map((tag) => tag.trim()).filter(Boolean))]
      .slice(0, 8)
      .map((tag) => tag.slice(0, 40)),
  }));
}

/**
 * Computes an item state fingerprint to ensure cache invalidation
 * whenever ANY recommendation-relevant field changes:
 * id, title, description, category, tags, date, time, location, area,
 * price/cost, transit accessibility, and wheelchair accessibility.
 */
export function computeItemsFingerprint(items: CornerItem[]): string {
  return items
    .map((i) => {
      const tagsKey = (i.tags || []).slice().sort().join(',');
      const dateKey = `${i.eventDate || ''}|${i.dateTime || ''}|${i.dateDisplay || ''}`;
      const descSnippet = (i.description || '').trim().replace(/\s+/g, ' ');
      return [
        i.id,
        i.title.trim(),
        descSnippet,
        i.category,
        tagsKey,
        dateKey,
        i.location.trim(),
        i.area.trim(),
        i.cost || 'nc',
        String(i.transitAccessible),
        String(i.wheelchairAccessible),
      ].join('::');
    })
    .sort()
    .join('||');
}
