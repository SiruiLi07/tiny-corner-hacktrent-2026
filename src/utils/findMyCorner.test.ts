import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enrichAndValidateMatches,
  prepareCandidatePayload,
  getClientCachedResult,
  setClientCachedResult,
  clearClientCache,
  validateAndSanitizeExplanation,
} from './findMyCorner.ts';
import { extractUserConstraints } from './constraintExtractor.ts';
import type { CornerItem } from '../types/index.ts';

const mockItems: CornerItem[] = [
  {
    id: 'seed-1',
    title: 'Sadleir House Board Game Gathering',
    description: 'Cozy board games in downtown library.',
    contentType: 'event',
    category: 'Micro-Meetups',
    location: 'Sadleir House, 751 George St N',
    area: 'Downtown Peterborough',
    imageUrl: 'https://example.com/games.jpg',
    tags: ['boardgames', 'beginners'],
    createdAt: '2026-11-01',
    eventDate: '2026-11-14',
    dateTime: 'Saturday, Nov 14 · 6:30 PM',
    dateDisplay: 'Sat, Nov 14 · 6:30 PM',
    organizer: { name: 'Hannah', handle: '@hannah', avatarUrl: '' },
    currentInterested: 4,
    cost: 'Free',
    transitAccessible: true,
    wheelchairAccessible: true,
  },
  {
    id: 'seed-4',
    title: 'Hunter Street Historic Photography Walk',
    description: 'Downtown alleyway 35mm and phone photography walk.',
    contentType: 'event',
    category: 'Hobbies & Games',
    location: 'Black Honey Bakery, Hunter St',
    area: 'Downtown Peterborough',
    imageUrl: 'https://example.com/photo.jpg',
    tags: ['photography', 'film', 'downtown'],
    createdAt: '2026-11-01',
    eventDate: '2026-11-07',
    dateTime: 'Saturday, Nov 7 · 3:00 PM',
    dateDisplay: 'Sat, Nov 7 · 3:00 PM',
    organizer: { name: 'Devon', handle: '@devon', avatarUrl: '' },
    currentInterested: 5,
    cost: 'Free',
    transitAccessible: true,
    wheelchairAccessible: 'Not confirmed',
  },
  {
    id: 'seed-10',
    title: 'Secret Cedar Trail behind Lady Eaton College',
    description: 'Serene forest walk on Trent campus drumlin.',
    contentType: 'lifestyle',
    category: 'Outdoor & Nature',
    location: 'Lady Eaton College',
    area: 'Trent Campus',
    imageUrl: 'https://example.com/trail.jpg',
    tags: ['nature', 'cedar'],
    createdAt: '2026-11-01',
    organizer: { name: 'Kieran', handle: '@kieran', avatarUrl: '' },
    currentInterested: 10,
    cost: undefined, // Unknown cost!
    transitAccessible: true,
    wheelchairAccessible: false,
  },
];

test('enrichAndValidateMatches discards invalid or non-existent IDs', () => {
  const rawMatches = [
    {
      itemId: 'seed-4',
      relevanceScore: 95,
      matchReason: 'Walkable downtown photography gathering.',
    },
    {
      itemId: 'hallucinated-id-999',
      relevanceScore: 90,
      matchReason: 'Fake event invented by model.',
    },
  ];

  const result = enrichAndValidateMatches(rawMatches, mockItems);
  assert.equal(result.length, 1);
  assert.equal(result[0].item.id, 'seed-4');
  assert.equal(result[0].rank, 1);
  assert.equal(result[0].verifiedFacts.wheelchair, 'Not confirmed');
  assert.equal(result[0].verifiedFacts.transit, 'Confirmed transit-accessible');
});

test('REGRESSION: enrichAndValidateMatches preserves unknown price as "Not confirmed" and never "Free"', () => {
  const rawMatches = [
    {
      itemId: 'seed-10',
      relevanceScore: 80,
      matchReason: 'Cedar trail walk.',
    },
  ];

  const result = enrichAndValidateMatches(rawMatches, mockItems);
  assert.equal(result.length, 1);
  assert.equal(result[0].verifiedFacts.cost, 'Not confirmed', 'Unknown price must be Not confirmed');
});

test('enrichAndValidateMatches strictly rejects date-violating matches when constraints active', () => {
  const refDate = new Date('2026-11-06T12:00:00Z');
  const constraints = extractUserConstraints('meet people this weekend', refDate);

  const rawMatches = [
    { itemId: 'seed-1', relevanceScore: 90, matchReason: 'Board games next week' },
    { itemId: 'seed-4', relevanceScore: 85, matchReason: 'Photography this Saturday' },
  ];

  // seed-1 is on Nov 14 (not this weekend) -> must be rejected even if model suggested it!
  const result = enrichAndValidateMatches(rawMatches, mockItems, constraints);
  assert.equal(result.length, 1);
  assert.equal(result[0].item.id, 'seed-4');
});

test('enrichAndValidateMatches never pads results when fewer than 3 qualify', () => {
  const rawMatches = [
    { itemId: 'seed-4', relevanceScore: 85, matchReason: 'Photography this Saturday' },
  ];

  // Only 1 match provided -> result must have exactly 1 item, NO filler items added
  const result = enrichAndValidateMatches(rawMatches, mockItems);
  assert.equal(result.length, 1);
  assert.equal(result[0].item.id, 'seed-4');
});

test('enrichAndValidateMatches sorts by score and caps at top 3', () => {
  const rawMatches = [
    { itemId: 'seed-1', relevanceScore: 80, matchReason: 'Board games' },
    { itemId: 'seed-10', relevanceScore: 75, matchReason: 'Nature walk' },
    { itemId: 'seed-4', relevanceScore: 92, matchReason: 'Photography walk' },
  ];

  const result = enrichAndValidateMatches(rawMatches, mockItems);
  assert.equal(result.length, 3);
  assert.equal(result[0].item.id, 'seed-4'); // highest
  assert.equal(result[0].rank, 1);
});

test('client caching stores and retrieves cached responses using items fingerprint', () => {
  clearClientCache();
  const query = 'photography downtown';
  const mockResp = {
    matches: [{ itemId: 'seed-4', relevanceScore: 95, matchReason: 'Great walk' }],
  };

  setClientCachedResult(query, mockItems, mockResp);
  const cached = getClientCachedResult(query, mockItems);
  assert.ok(cached);
  assert.equal(cached.timing?.cacheHit, true);
  assert.equal(cached.matches[0].itemId, 'seed-4');

  // If item details change (e.g. date changed), cache must miss!
  const editedItems = mockItems.map((item) =>
    item.id === 'seed-4' ? { ...item, eventDate: '2026-11-21' } : item
  );
  const cachedAfterEdit = getClientCachedResult(query, editedItems);
  assert.equal(cachedAfterEdit, null, 'Cache must miss when item attributes are modified');
});

test('REGRESSION: validateAndSanitizeExplanation cleans ungrounded claims', () => {
  const paidItem: CornerItem = {
    ...mockItems[0],
    cost: '$15',
    transitAccessible: undefined, // Unconfirmed transit
    wheelchairAccessible: false, // Inaccessible
  };

  const rawGeminiReason =
    'This is a completely free event with a direct bus that takes only 10 minutes walk and is fully wheelchair accessible!';
  const sanitized = validateAndSanitizeExplanation(rawGeminiReason, paidItem);

  assert.ok(!sanitized.includes('completely free'), 'Must strip completely free for paid item');
  assert.ok(sanitized.includes('entry ($15)'), 'Must show the stored entry cost');
  assert.ok(!sanitized.includes('direct bus'), 'Must strip direct bus claim for unconfirmed transit');
  assert.ok(sanitized.includes('transit access not confirmed'), 'Must replace with honest transit status');
  assert.ok(!sanitized.includes('fully wheelchair'), 'Must strip fully wheelchair for inaccessible item');
  assert.ok(sanitized.includes('Wheelchair: Not accessible'), 'Must report stored wheelchair=false accurately');
  assert.ok(!sanitized.includes('10 minutes walk'), 'Must strip hallucinated travel times');
  assert.ok(sanitized.includes('located in Peterborough'), 'Must ground location in Peterborough');
});

test('REGRESSION: enrichAndValidateMatches strictly rejects price range "$5–$30" for "under $20" budget', () => {
  const rangeItem: CornerItem = {
    ...mockItems[0],
    id: 'seed-range-cost',
    cost: '$5–$30',
  };
  const affordableItem: CornerItem = {
    ...mockItems[0],
    id: 'seed-affordable',
    cost: '$12',
  };

  const items = [rangeItem, affordableItem];
  const constraints = extractUserConstraints('activities under $20');

  const rawMatches = [
    { itemId: 'seed-range-cost', relevanceScore: 95, matchReason: 'Fun workshop' },
    { itemId: 'seed-affordable', relevanceScore: 90, matchReason: 'Affordable gathering' },
  ];

  // seed-range-cost has max $30, which violates under $20 constraint!
  const enriched = enrichAndValidateMatches(rawMatches, items, constraints);
  assert.equal(enriched.length, 1);
  assert.equal(enriched[0].item.id, 'seed-affordable');
  assert.equal(enriched[0].verifiedFacts.costStatus, 'confirmed_affordable');
});

test('REGRESSION: validateAndSanitizeExplanation handles EXACT hallucination sentence without claiming unconfirmed attributes', () => {
  // An event with unknown price, unknown transit, and unknown wheelchair accessibility
  const unknownItem: CornerItem = {
    ...mockItems[0],
    id: 'seed-unknown-logistics',
    cost: undefined,
    transitAccessible: undefined,
    wheelchairAccessible: undefined,
  };

  const exactUserHallucination =
    'This event is free, wheelchair accessible, easy to reach by bus 88, and a 5-minute walk from campus.';

  const sanitized = validateAndSanitizeExplanation(exactUserHallucination, unknownItem);

  // Must NEVER claim free
  assert.strictEqual(
    /\bfree\b/i.test(sanitized),
    false,
    'Must NOT claim event is free when price is unknown'
  );
  // Must NOT claim bus 88
  assert.strictEqual(
    sanitized.includes('bus 88'),
    false,
    'Must NOT claim specific bus route 88'
  );
  // Must NOT claim 5-minute walk
  assert.strictEqual(
    sanitized.includes('5-minute'),
    false,
    'Must NOT claim 5-minute travel time'
  );
  // Must NOT claim wheelchair accessible as an unqualified positive fact
  assert.strictEqual(
    /\bwheelchair\s+accessible\b/i.test(sanitized) && !sanitized.includes('not confirmed'),
    false,
    'Must NOT claim wheelchair accessible without noting it is not confirmed'
  );

  // Must convey honest verified status
  assert.ok(
    sanitized.includes('Price: Not confirmed') || sanitized.includes('price not confirmed'),
    'Must state price is not confirmed'
  );
  assert.ok(
    sanitized.includes('Transit: Not confirmed') || sanitized.includes('transit access not confirmed'),
    'Must state transit is not confirmed'
  );
  assert.ok(
    sanitized.includes('Wheelchair: Not confirmed') || sanitized.includes('wheelchair accessibility not confirmed'),
    'Must state wheelchair accessibility is not confirmed'
  );
});

test('REGRESSION: validateAndSanitizeExplanation handles alternative hallucination wordings', () => {
  const unconfirmedItem: CornerItem = {
    ...mockItems[0],
    cost: '$25',
    transitAccessible: false, // Requires personal car
    wheelchairAccessible: false, // Inaccessible
  };

  const alternativeHallucination =
    'Admission is completely free of charge, jump on bus route 12, step-free access throughout, and only 15 mins away!';
  const sanitized = validateAndSanitizeExplanation(alternativeHallucination, unconfirmedItem);

  assert.strictEqual(sanitized.includes('free of charge'), false);
  assert.ok(sanitized.includes('entry ($25)'));
  assert.strictEqual(sanitized.includes('bus route 12'), false);
  assert.ok(sanitized.includes('transit access not confirmed') || sanitized.includes('Requires vehicle'));
  assert.strictEqual(sanitized.includes('step-free access throughout'), false);
  assert.strictEqual(sanitized.includes('15 mins away'), false);
  assert.ok(sanitized.includes('located in Peterborough'));
});

test('REGRESSION: client cache key includes reference date to prevent cross-day stale relative queries', () => {
  clearClientCache();
  const relativeQuery = 'things to do this weekend';
  const mockResp = {
    matches: [{ itemId: 'seed-4', relevanceScore: 90, matchReason: 'Photo walk' }],
  };

  // Cache on Friday, Nov 6, 2026
  setClientCachedResult(relativeQuery, mockItems, mockResp, '2026-11-06');

  // Query on the same Friday: CACHE HIT
  const hitSameDay = getClientCachedResult(relativeQuery, mockItems, '2026-11-06');
  assert.ok(hitSameDay, 'Must hit cache on the same calendar day');
  assert.strictEqual(hitSameDay.timing?.cacheHit, true);

  // Query on Sunday, Nov 8, 2026: MUST BE CACHE MISS (so weekend constraints are re-evaluated!)
  const missNextDay = getClientCachedResult(relativeQuery, mockItems, '2026-11-08');
  assert.strictEqual(
    missNextDay,
    null,
    'Must miss cache on a different calendar day for relative date queries'
  );
});

test('REGRESSION: server candidate fingerprint invalidates cache when keyDetails changes', () => {
  // Candidate item compact payloads sent to /api/find-my-corner
  const candidateA = {
    id: 'seed-1',
    title: 'Sadleir House Board Game Gathering',
    category: 'Micro-Meetups',
    area: 'Downtown Peterborough',
    dateTime: 'Sat, Nov 14 · 6:30 PM',
    cost: 'Free',
    transitAccessible: 'Confirmed transit-accessible',
    wheelchairAccessible: 'Confirmed wheelchair-accessible',
    keyDetails: 'Casual board games for beginners and enthusiasts.',
  };

  const candidateB = {
    ...candidateA,
    keyDetails: 'Competitive strategy tournaments and modern Euro games.', // Edited keyDetails!
  };

  const fpA = `${candidateA.id}:${candidateA.title}:${candidateA.category}:${candidateA.area}:${candidateA.dateTime}:${candidateA.cost}:${candidateA.transitAccessible}:${candidateA.wheelchairAccessible}:${candidateA.keyDetails}`;
  const fpB = `${candidateB.id}:${candidateB.title}:${candidateB.category}:${candidateB.area}:${candidateB.dateTime}:${candidateB.cost}:${candidateB.transitAccessible}:${candidateB.wheelchairAccessible}:${candidateB.keyDetails}`;

  assert.notStrictEqual(
    fpA,
    fpB,
    'Server candidate fingerprint MUST differ when keyDetails field changes'
  );
});

