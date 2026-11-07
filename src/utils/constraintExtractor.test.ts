import test from 'node:test';
import assert from 'node:assert';
import {
  extractUserConstraints,
  filterCandidatesByHardConstraints,
  scoreCandidateDeterministically,
  prepareTop10CompactPayload,
  resolveItemEventDate,
  computeItemsFingerprint,
  parseItemCost,
  isValidCalendarDate,
  evaluateBudgetMatch,
} from './constraintExtractor.ts';
import type { CornerItem } from '../types/index.ts';

const mockItems: CornerItem[] = [
  {
    id: 'test-1',
    title: 'Sadleir House Cozy Board Game Gathering',
    description: 'Play casual board games.',
    contentType: 'event',
    category: 'Micro-Meetups',
    location: 'Sadleir House',
    area: 'Downtown Peterborough',
    imageUrl: '',
    tags: ['boardgames', 'beginners'],
    createdAt: '2026-11-01T00:00:00Z',
    organizer: { name: 'Hannah', avatarUrl: '', handle: '@hannah' },
    dateTime: 'Saturday, Nov 14 · 6:30 PM',
    dateDisplay: 'Sat, Nov 14 · 6:30 PM',
    eventDate: '2026-11-14',
    currentInterested: 5,
    cost: 'Free',
    transitAccessible: true,
    wheelchairAccessible: true,
  },
  {
    id: 'test-2',
    title: 'Hunter Street Historic Alleyway Photography Walk',
    description: 'Downtown photo walk with 35mm cameras.',
    contentType: 'event',
    category: 'Hobbies & Games',
    location: '273 Hunter St W',
    area: 'Downtown Peterborough',
    imageUrl: '',
    tags: ['photography', 'film', 'walking'],
    createdAt: '2026-11-01T00:00:00Z',
    organizer: { name: 'Devon', avatarUrl: '', handle: '@devon' },
    dateTime: 'Saturday, Nov 7 · 3:00 PM',
    dateDisplay: 'Sat, Nov 7 · 3:00 PM',
    eventDate: '2026-11-07',
    currentInterested: 4,
    cost: 'Free',
    transitAccessible: true,
    wheelchairAccessible: 'Not confirmed',
  },
  {
    id: 'test-3',
    title: 'Beginner Golden Hour Hike & Birding',
    description: 'Gentle nature walk through sanctuary boardwalk.',
    contentType: 'event',
    category: 'Outdoor & Nature',
    location: 'Trent Wildlife Sanctuary',
    area: 'Trent Campus',
    imageUrl: '',
    tags: ['hiking', 'birding', 'nature'],
    createdAt: '2026-11-01T00:00:00Z',
    organizer: { name: 'Noah', avatarUrl: '', handle: '@noah' },
    dateTime: 'Sunday, Nov 8 · 3:45 PM',
    dateDisplay: 'Sun, Nov 8 · 3:45 PM',
    eventDate: '2026-11-08',
    currentInterested: 7,
    cost: 'Free',
    transitAccessible: true,
    wheelchairAccessible: false,
  },
  {
    id: 'test-4',
    title: 'Fancy Dinner Tasting Tour',
    description: 'High-end culinary tour.',
    contentType: 'event',
    category: 'Coffee & Food',
    location: 'George St',
    area: 'Downtown Peterborough',
    imageUrl: '',
    tags: ['food', 'tasting'],
    createdAt: '2026-11-01T00:00:00Z',
    organizer: { name: 'Chef', avatarUrl: '', handle: '@chef' },
    dateTime: 'Saturday, Nov 7 · 7:00 PM',
    dateDisplay: 'Sat, Nov 7 · 7:00 PM',
    eventDate: '2026-11-07',
    currentInterested: 2,
    cost: '$$$',
    transitAccessible: true,
    wheelchairAccessible: true,
  },
  {
    id: 'test-5-unknown-cost',
    title: 'Secret Study Nook',
    description: 'A study session with unconfirmed cost.',
    contentType: 'event',
    category: 'Study & Crafts',
    location: 'Water St',
    area: 'Downtown Peterborough',
    imageUrl: '',
    tags: ['study'],
    createdAt: '2026-11-01T00:00:00Z',
    organizer: { name: 'Alex', avatarUrl: '', handle: '@alex' },
    dateTime: 'Saturday, Nov 7 · 2:00 PM',
    dateDisplay: 'Sat, Nov 7 · 2:00 PM',
    eventDate: '2026-11-07',
    currentInterested: 1,
    cost: undefined, // Unknown cost! Must NOT be labeled Free!
    transitAccessible: true,
    wheelchairAccessible: true,
  },
  {
    id: 'test-6-mid-budget',
    title: 'Ceramics Workshop',
    description: 'Throwing pottery for beginners.',
    contentType: 'event',
    category: 'Study & Crafts',
    location: 'Charlotte St',
    area: 'Downtown Peterborough',
    imageUrl: '',
    tags: ['crafts', 'pottery'],
    createdAt: '2026-11-01T00:00:00Z',
    organizer: { name: 'Maria', avatarUrl: '', handle: '@maria' },
    dateTime: 'Saturday, Nov 7 · 1:00 PM',
    dateDisplay: 'Sat, Nov 7 · 1:00 PM',
    eventDate: '2026-11-07',
    currentInterested: 3,
    cost: '$18',
    transitAccessible: true,
    wheelchairAccessible: true,
  },
];

test('extractUserConstraints correctly resolves "this weekend" on Friday Nov 6, 2026', () => {
  // Friday, Nov 6, 2026
  const refDate = new Date('2026-11-06T12:00:00Z');
  const query = "I'm new in town, I don't have a car, I love photography, and I want to meet a few people this weekend.";
  const constraints = extractUserConstraints(query, refDate);

  assert.strictEqual(constraints.hasDateConstraint, true);
  assert.strictEqual(constraints.carFreeRequired, true);
  assert.strictEqual(constraints.requiresEvent, true);
  assert.deepStrictEqual(constraints.allowedDates, ['2026-11-07', '2026-11-08']);
  assert.ok(constraints.interestKeywords.includes('photography'));
});

test('REGRESSION: relative date "next weekend" on Sunday Nov 8, 2026 must resolve to Nov 14–15 (not Nov 20–21)', () => {
  // Sunday, November 8, 2026
  const refDate = new Date('2026-11-08T12:00:00Z');
  const query = 'I want to meet people next weekend for board games';
  const constraints = extractUserConstraints(query, refDate);

  assert.strictEqual(constraints.hasDateConstraint, true);
  assert.strictEqual(constraints.dateLabel, 'Next Weekend');
  assert.deepStrictEqual(
    constraints.allowedDates,
    ['2026-11-14', '2026-11-15'],
    'Sunday Nov 8 next weekend must be Saturday Nov 14 and Sunday Nov 15'
  );
});

test('REGRESSION: numeric budgets like "under $20" and "less than $15" are recognized', () => {
  const q1 = extractUserConstraints('Looking for a craft activity under $20 this weekend');
  assert.strictEqual(q1.numericMaxBudget, 20);

  const q2 = extractUserConstraints('Want to join a workshop less than $15');
  assert.strictEqual(q2.numericMaxBudget, 15);

  const q3 = extractUserConstraints('I want free only meetups');
  assert.strictEqual(q3.freeOnly, true);
  assert.strictEqual(q3.numericMaxBudget, 0);
  assert.strictEqual(q3.maxCost, 'Free');
});

test('REGRESSION: filterCandidatesByHardConstraints enforces numeric budget', () => {
  const refDate = new Date('2026-11-06T12:00:00Z');

  // Query 1: "under $15 this weekend" -> test-6 ($18) and test-4 ($$$) must be excluded!
  const constraints15 = extractUserConstraints('activities under $15 this weekend', refDate);
  const filtered15 = filterCandidatesByHardConstraints(mockItems, constraints15);
  assert.strictEqual(filtered15.some((i) => i.id === 'test-6-mid-budget'), false, '$18 should exceed $15 budget');
  assert.strictEqual(filtered15.some((i) => i.id === 'test-4'), false, '$$$ should exceed $15 budget');
  assert.strictEqual(filtered15.some((i) => i.id === 'test-2'), true, 'Free ($0) must be included');

  // Query 2: "under $20 this weekend" -> test-6 ($18) is included, test-4 ($$$) is excluded
  const constraints20 = extractUserConstraints('activities under $20 this weekend', refDate);
  const filtered20 = filterCandidatesByHardConstraints(mockItems, constraints20);
  assert.strictEqual(filtered20.some((i) => i.id === 'test-6-mid-budget'), true, '$18 is within $20 budget');
  assert.strictEqual(filtered20.some((i) => i.id === 'test-4'), false, '$$$ exceeds $20 budget');
});

test('REGRESSION: "free only" strictly excludes unknown price items', () => {
  const refDate = new Date('2026-11-06T12:00:00Z');
  const constraints = extractUserConstraints('free only this weekend', refDate);

  const filtered = filterCandidatesByHardConstraints(mockItems, constraints);
  assert.strictEqual(
    filtered.some((i) => i.id === 'test-5-unknown-cost'),
    false,
    'Item with unknown cost must NOT qualify when free only is requested'
  );
  assert.strictEqual(filtered.some((i) => i.id === 'test-2'), true, 'Confirmed Free item must qualify');
});

test('REGRESSION: prepareTop10CompactPayload never labels unknown price as Free', () => {
  const constraints = extractUserConstraints('');
  const payload = prepareTop10CompactPayload(mockItems, constraints);

  const unknownItem = payload.find((p) => p.id === 'test-5-unknown-cost');
  assert.ok(unknownItem, 'test-5 should be in candidates');
  assert.strictEqual(unknownItem.cost, 'Not confirmed', 'Unknown cost must be preserved as "Not confirmed"');
});

test('REGRESSION: resolveItemEventDate supports dates across months and ISO formats', () => {
  // Complete ISO
  const isoItem: CornerItem = { ...mockItems[0], eventDate: '2026-12-05' };
  assert.strictEqual(resolveItemEventDate(isoItem), '2026-12-05');

  // December date in dateDisplay
  const decItem: CornerItem = {
    ...mockItems[0],
    eventDate: undefined,
    dateDisplay: 'Saturday, Dec 12 · 2:00 PM',
  };
  assert.strictEqual(resolveItemEventDate(decItem), '2026-12-12');

  // January date
  const janItem: CornerItem = {
    ...mockItems[0],
    eventDate: undefined,
    dateTime: 'January 15th, 2027 6pm',
    dateDisplay: '',
  };
  assert.strictEqual(resolveItemEventDate(janItem), '2027-01-15');

  // Newly published post with raw user date picker input (e.g. "2026-11-20")
  const userPost: CornerItem = {
    ...mockItems[0],
    eventDate: undefined,
    dateTime: '2026-11-20',
    dateDisplay: '2026-11-20',
  };
  assert.strictEqual(resolveItemEventDate(userPost), '2026-11-20');
});

test('REGRESSION: computeItemsFingerprint invalidates cache when event details are edited', () => {
  const original = mockItems.slice(0, 3);
  const fp1 = computeItemsFingerprint(original);

  // Edit date of test-1
  const editedDate = original.map((item) =>
    item.id === 'test-1' ? { ...item, eventDate: '2026-11-21', dateDisplay: 'Sat, Nov 21' } : item
  );
  const fp2 = computeItemsFingerprint(editedDate);
  assert.notStrictEqual(fp1, fp2, 'Fingerprint must change when date is edited');

  // Edit cost of test-2
  const editedCost = original.map((item) =>
    item.id === 'test-2' ? { ...item, cost: '$10' } : item
  );
  const fp3 = computeItemsFingerprint(editedCost);
  assert.notStrictEqual(fp1, fp3, 'Fingerprint must change when cost is edited');

  // Edit accessibility
  const editedA11y = original.map((item) =>
    item.id === 'test-2' ? { ...item, transitAccessible: false } : item
  );
  const fp4 = computeItemsFingerprint(editedA11y);
  assert.notStrictEqual(fp1, fp4, 'Fingerprint must change when transit status is edited');
});

test('scoreCandidateDeterministically produces predictable score and criteria', () => {
  const refDate = new Date('2026-11-06T12:00:00Z');
  const query = "I'm new in town, I don't have a car, I love photography, and I want to meet a few people this weekend.";
  const constraints = extractUserConstraints(query, refDate);

  const photoWalk = mockItems.find((i) => i.id === 'test-2')!;
  const scored = scoreCandidateDeterministically(photoWalk, constraints);

  assert.ok(scored.reproducibleScore >= 80, `Expected score >= 80, got ${scored.reproducibleScore}`);
  assert.ok(scored.criteriaMet.some((c) => c.includes('photography')));
  assert.ok(scored.criteriaMet.some((c) => c.includes('Nov 7') || c.includes('Weekend')));
});

test('REGRESSION: isValidCalendarDate cleanly rejects impossible dates and respects leap years', () => {
  // Impossible days in month
  assert.strictEqual(isValidCalendarDate(2027, 2, 31), false, 'Feb 31 does not exist');
  assert.strictEqual(isValidCalendarDate(2026, 4, 31), false, 'April 31 does not exist');
  assert.strictEqual(isValidCalendarDate(2026, 6, 31), false, 'June 31 does not exist');
  assert.strictEqual(isValidCalendarDate(2026, 11, 31), false, 'November 31 does not exist');

  // Leap year check: 2027 is not leap year; 2028 is leap year
  assert.strictEqual(isValidCalendarDate(2027, 2, 29), false, '2027 is not a leap year');
  assert.strictEqual(isValidCalendarDate(2028, 2, 29), true, '2028 is a leap year');

  // Invalid ranges
  assert.strictEqual(isValidCalendarDate(2026, 0, 15), false, 'Month 0 is invalid');
  assert.strictEqual(isValidCalendarDate(2026, 13, 1), false, 'Month 13 is invalid');
  assert.strictEqual(isValidCalendarDate(2026, 5, 0), false, 'Day 0 is invalid');
  assert.strictEqual(isValidCalendarDate(2026, 5, 32), false, 'Day 32 is invalid');
});

test('REGRESSION: resolveItemEventDate rejects impossible dates in both ISO and text formats', () => {
  // Impossible ISO date
  const badIsoItem: CornerItem = {
    ...mockItems[0],
    eventDate: '2027-02-31',
  };
  assert.strictEqual(resolveItemEventDate(badIsoItem), null, '2027-02-31 must be rejected');

  // Impossible text date
  const badTextItem: CornerItem = {
    ...mockItems[0],
    eventDate: undefined,
    dateTime: 'February 31, 2027 at 7:00 PM',
    dateDisplay: '',
  };
  assert.strictEqual(resolveItemEventDate(badTextItem), null, 'February 31 must be rejected');

  // Valid leap year date
  const leapItem: CornerItem = {
    ...mockItems[0],
    eventDate: '2028-02-29',
  };
  assert.strictEqual(resolveItemEventDate(leapItem), '2028-02-29', '2028-02-29 must be accepted');
});

test('REGRESSION: "this weekend" on Sunday Nov 8, 2026 excludes Saturday Nov 7', () => {
  const sundayRef = new Date('2026-11-08T14:00:00Z');
  const query = 'Find events this weekend';
  const constraints = extractUserConstraints(query, sundayRef);

  assert.strictEqual(constraints.hasDateConstraint, true);
  assert.deepStrictEqual(
    constraints.allowedDates,
    ['2026-11-08'],
    'On Sunday, "this weekend" must only include Sunday (today), not yesterday'
  );
});

test('REGRESSION: month rollover on Monday Nov 30, 2026 handles tomorrow, this weekend, next weekend', () => {
  const nov30Ref = new Date('2026-11-30T10:00:00Z'); // Monday

  // Tomorrow -> Dec 1, 2026
  const tomorrowConstraints = extractUserConstraints('events tomorrow', nov30Ref);
  assert.deepStrictEqual(tomorrowConstraints.allowedDates, ['2026-12-01']);

  // This weekend -> Saturday Dec 5 and Sunday Dec 6
  const thisWeekendConstraints = extractUserConstraints('things to do this weekend', nov30Ref);
  assert.deepStrictEqual(thisWeekendConstraints.allowedDates, ['2026-12-05', '2026-12-06']);

  // Next weekend -> Saturday Dec 12 and Sunday Dec 13
  const nextWeekendConstraints = extractUserConstraints('events next weekend', nov30Ref);
  assert.deepStrictEqual(nextWeekendConstraints.allowedDates, ['2026-12-12', '2026-12-13']);
});

test('REGRESSION: filterCandidatesByHardConstraints strictly rejects past events', () => {
  const sundayRef = new Date('2026-11-08T12:00:00Z');
  const pastItem: CornerItem = {
    ...mockItems[0],
    id: 'past-event-nov5',
    eventDate: '2026-11-05',
    dateTime: 'Thursday, Nov 5',
  };
  const currentItem: CornerItem = {
    ...mockItems[0],
    id: 'current-event-nov8',
    eventDate: '2026-11-08',
    dateTime: 'Sunday, Nov 8',
  };

  const constraints = extractUserConstraints('upcoming events', sundayRef);
  const result = filterCandidatesByHardConstraints([pastItem, currentItem], constraints);

  assert.strictEqual(result.some((i) => i.id === 'past-event-nov5'), false, 'Past event must be filtered out');
  assert.strictEqual(result.some((i) => i.id === 'current-event-nov8'), true, 'Today event must be included');
});

test('REGRESSION: price range "$5–$30" is rejected for "under $20" budget and accepted for "under $35"', () => {
  const rangeCost = parseItemCost('$5–$30');
  assert.strictEqual(rangeCost.min, 5);
  assert.strictEqual(rangeCost.max, 30);
  assert.strictEqual(rangeCost.isFree, false);
  assert.strictEqual(rangeCost.isUnknown, false);

  // Under $20: maximum cost (30) > budget (20) -> must be confirmed_over_budget!
  const constraintsUnder20 = extractUserConstraints('find activities under $20');
  const statusUnder20 = evaluateBudgetMatch(rangeCost, constraintsUnder20);
  assert.strictEqual(
    statusUnder20,
    'confirmed_over_budget',
    'Event with max $30 must be confirmed_over_budget when user budget is $20'
  );

  // Under $35: maximum cost (30) <= budget (35) -> confirmed_affordable
  const constraintsUnder35 = extractUserConstraints('find activities under $35');
  const statusUnder35 = evaluateBudgetMatch(rangeCost, constraintsUnder35);
  assert.strictEqual(
    statusUnder35,
    'confirmed_affordable',
    'Event with max $30 must be confirmed_affordable when user budget is $35'
  );
});

test('REGRESSION: budget phrasing variations ("maximum $25", "up to $10", "$20 or less", "no more than $15")', () => {
  assert.strictEqual(extractUserConstraints('maximum $25').numericMaxBudget, 25);
  assert.strictEqual(extractUserConstraints('up to $10').numericMaxBudget, 10);
  assert.strictEqual(extractUserConstraints('$20 or less').numericMaxBudget, 20);
  assert.strictEqual(extractUserConstraints('no more than $15').numericMaxBudget, 15);
  assert.strictEqual(extractUserConstraints('$25 max').numericMaxBudget, 25);
});

test('REGRESSION: transit score is NOT inferred from downtown or campus location', () => {
  const downtownItemNoTransit: CornerItem = {
    ...mockItems[0],
    id: 'dt-no-transit',
    location: 'Sadleir House, Downtown',
    area: 'Downtown Peterborough',
    transitAccessible: undefined, // Missing/unconfirmed!
  };
  const dtItemFalseTransit: CornerItem = {
    ...mockItems[0],
    id: 'dt-false-transit',
    location: 'Downtown Peterborough',
    transitAccessible: false, // Explicitly false!
  };
  const dtItemConfirmedTransit: CornerItem = {
    ...mockItems[0],
    id: 'dt-confirmed-transit',
    location: 'Downtown Peterborough',
    transitAccessible: true, // Explicitly confirmed!
  };

  const constraints = extractUserConstraints("I don't have a car, need public transit");
  assert.strictEqual(constraints.carFreeRequired, true);

  const scoreUnconfirmed = scoreCandidateDeterministically(downtownItemNoTransit, constraints);
  const scoreFalse = scoreCandidateDeterministically(dtItemFalseTransit, constraints);
  const scoreConfirmed = scoreCandidateDeterministically(dtItemConfirmedTransit, constraints);

  assert.strictEqual(
    scoreUnconfirmed.criteriaMet.some((c) => c.includes('Transit: Confirmed')),
    false,
    'Unconfirmed transit must not get confirmed transit credit even in downtown'
  );
  assert.strictEqual(
    scoreFalse.criteriaMet.some((c) => c.includes('Transit: Confirmed')),
    false,
    'False transit must not get transit credit'
  );
  assert.strictEqual(
    scoreConfirmed.criteriaMet.some((c) => c.includes('Transit: Confirmed')),
    true,
    'Explicitly true transit item must get confirmed transit credit'
  );
  assert.ok(
    scoreConfirmed.reproducibleScore > scoreUnconfirmed.reproducibleScore,
    'Confirmed transit must score higher than unconfirmed for car-free users'
  );
});

test('REGRESSION: computeItemsFingerprint invalidates cache on any metadata edit (tags, title, area, desc)', () => {
  const base = [mockItems[0]];
  const fpBase = computeItemsFingerprint(base);

  // Edit title
  assert.notStrictEqual(
    fpBase,
    computeItemsFingerprint([{ ...base[0], title: 'New Title' }]),
    'Title edit must change fingerprint'
  );

  // Edit description
  assert.notStrictEqual(
    fpBase,
    computeItemsFingerprint([{ ...base[0], description: 'New Description' }]),
    'Description edit must change fingerprint'
  );

  // Edit tags
  assert.notStrictEqual(
    fpBase,
    computeItemsFingerprint([{ ...base[0], tags: ['newtag', 'another'] }]),
    'Tags edit must change fingerprint'
  );

  // Edit area
  assert.notStrictEqual(
    fpBase,
    computeItemsFingerprint([{ ...base[0], area: 'East City' }]),
    'Area edit must change fingerprint'
  );
});

test('REGRESSION: computeItemsFingerprint invalidates cache on description edits beyond 80 characters', () => {
  // Description longer than 80 characters
  const longDescA =
    'This is a wonderful historic gathering for students in Peterborough looking to discover cozy corners and play board games together on weekend evenings.';
  const longDescB =
    'This is a wonderful historic gathering for students in Peterborough looking to discover cozy corners and play BOARD GAMES AND PUZZLES together on weekend evenings.';

  assert.ok(longDescA.length > 80, 'Test description must be > 80 chars');
  assert.ok(longDescB.length > 80, 'Test description must be > 80 chars');
  assert.strictEqual(
    longDescA.slice(0, 80),
    longDescB.slice(0, 80),
    'First 80 characters must be identical to isolate changes past char 80'
  );

  const itemA: CornerItem = { ...mockItems[0], description: longDescA };
  const itemB: CornerItem = { ...mockItems[0], description: longDescB };

  const fpA = computeItemsFingerprint([itemA]);
  const fpB = computeItemsFingerprint([itemB]);

  assert.notStrictEqual(
    fpA,
    fpB,
    'Changes after character 80 in description MUST produce different fingerprints'
  );
});

test('REGRESSION: unknown price when no budget specified NEVER produces "Budget: Confirmed affordable (Not confirmed)"', () => {
  const unknownPriceItem: CornerItem = {
    ...mockItems[0],
    id: 'unknown-price-item',
    cost: undefined, // Unknown price!
  };

  // User specifies NO budget constraint (just wants board games this weekend)
  const queryNoBudget = 'board games this weekend';
  const constraintsNoBudget = extractUserConstraints(queryNoBudget);
  assert.strictEqual(constraintsNoBudget.numericMaxBudget, undefined);
  assert.strictEqual(constraintsNoBudget.freeOnly, undefined);
  assert.strictEqual(constraintsNoBudget.maxCost, undefined);

  const scored = scoreCandidateDeterministically(unknownPriceItem, constraintsNoBudget);

  // Must NOT claim Budget: Confirmed affordable!
  assert.strictEqual(
    scored.criteriaMet.some((c) => c.includes('Budget: Confirmed affordable (Not confirmed)')),
    false,
    'Must NEVER push "Budget: Confirmed affordable (Not confirmed)"'
  );
  assert.strictEqual(
    scored.criteriaMet.some((c) => c.toLowerCase().includes('budget: confirmed')),
    false,
    'Must NOT have ANY "Budget: Confirmed" badge when user did not specify a budget'
  );
  assert.ok(
    scored.missingCriteria.some((c) => c.includes('Price: Not confirmed')),
    'Must note price not confirmed in missingCriteria'
  );
});

test('REGRESSION: verified budget badges ONLY displayed when explicit budget constraint exists and price supports it', () => {
  const itemWithKnownPrice: CornerItem = {
    ...mockItems[0],
    id: 'known-price-12',
    cost: '$12',
  };
  const itemWithUnknownPrice: CornerItem = {
    ...mockItems[0],
    id: 'unknown-price',
    cost: undefined,
  };

  // 1. Explicit budget: "under $20"
  const constraintsBudget20 = extractUserConstraints('activities under $20');
  const scoredKnown = scoreCandidateDeterministically(itemWithKnownPrice, constraintsBudget20);
  const scoredUnknown = scoreCandidateDeterministically(itemWithUnknownPrice, constraintsBudget20);

  assert.ok(
    scoredKnown.criteriaMet.some((c) => c.includes('Budget: Confirmed under $20 ($12)')),
    'Known $12 item must have verified budget badge when under $20 constraint exists'
  );
  assert.strictEqual(
    scoredUnknown.criteriaMet.some((c) => c.includes('Budget: Confirmed')),
    false,
    'Unknown price item must NEVER have confirmed budget badge even when budget constraint exists'
  );
});

test('REGRESSION: strict wheelchair and transit accessibility distinguishes verified matches from unverified', () => {
  const confirmedWheelchairItem: CornerItem = {
    ...mockItems[0],
    id: 'wheelchair-verified',
    wheelchairAccessible: true,
  };
  const unverifiedWheelchairItem: CornerItem = {
    ...mockItems[0],
    id: 'wheelchair-unverified',
    wheelchairAccessible: undefined, // Not confirmed!
  };
  const inaccessibleWheelchairItem: CornerItem = {
    ...mockItems[0],
    id: 'wheelchair-false',
    wheelchairAccessible: false,
  };

  const constraints = extractUserConstraints('I use a wheelchair, need accessible venue');
  assert.strictEqual(constraints.wheelchairRequired, true);

  const scoreVerified = scoreCandidateDeterministically(confirmedWheelchairItem, constraints);
  const scoreUnverified = scoreCandidateDeterministically(unverifiedWheelchairItem, constraints);
  const scoreFalse = scoreCandidateDeterministically(inaccessibleWheelchairItem, constraints);

  // Verified must receive confirmed badge
  assert.ok(
    scoreVerified.criteriaMet.some((c) => c === 'Wheelchair: Confirmed accessible'),
    'Verified accessible item must receive Wheelchair: Confirmed accessible badge'
  );

  // Unverified must NOT receive confirmed badge
  assert.strictEqual(
    scoreUnverified.criteriaMet.some((c) => c.includes('Wheelchair: Confirmed')),
    false,
    'Unverified wheelchair item must NOT be presented with confirmed accessible badge'
  );
  assert.ok(
    scoreUnverified.missingCriteria.some((c) => c.includes('Wheelchair: Not confirmed in stored records')),
    'Unverified wheelchair item must note unconfirmed status in missingCriteria'
  );

  // Verified must score higher than unverified
  assert.ok(
    scoreVerified.reproducibleScore > scoreUnverified.reproducibleScore,
    `Verified wheelchair item (${scoreVerified.reproducibleScore}) must outscore unverified (${scoreUnverified.reproducibleScore})`
  );
  assert.ok(
    scoreUnverified.reproducibleScore > scoreFalse.reproducibleScore,
    `Unverified item must score higher than explicitly inaccessible item`
  );
});

