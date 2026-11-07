import test from 'node:test';
import assert from 'node:assert/strict';
import type { CornerItem } from '../types/index.ts';
import {
  extractUserConstraints,
  filterCandidatesByHardConstraints,
  prepareTop10CompactPayload,
} from './constraintExtractor.ts';
import {
  enrichAndValidateMatches,
  generateFactualExplanation,
  validateAndSanitizeExplanation,
} from './findMyCorner.ts';

const base: CornerItem = {
  id: 'candidate-1',
  title: 'Cozy Photography Meetup',
  description: 'Explore analog photography in a small group',
  contentType: 'event',
  category: 'Hobbies & Games',
  location: 'Campus Hall',
  area: 'Downtown Peterborough',
  imageUrl: '',
  tags: ['photography', 'film', 'students'],
  createdAt: '2026-11-06',
  eventDate: '2026-11-14',
  dateDisplay: 'Saturday, Nov 14 at 2 PM',
  organizer: { name: 'Host', avatarUrl: '', handle: '@host' },
  currentInterested: 0,
};

const referenceDate = new Date('2026-11-07T12:00:00');
const hallucination = 'The venue has an accessible entrance and admission costs nothing, with excellent transit connections. Bus 88 arrives in 5 minutes.';

test('NEW: no AI prose survives a structured-data-only explanation', () => {
  const result = validateAndSanitizeExplanation(hallucination, base);
  assert.equal(result.includes('accessible entrance'), false);
  assert.equal(result.includes('admission costs nothing'), false);
  assert.equal(result.includes('excellent transit'), false);
  assert.equal(result.includes('Bus 88'), false);
  assert.equal(result.includes('5 minutes'), false);
  assert.match(result, /Price: Not confirmed/);
  assert.match(result, /transit access not confirmed/);
  assert.match(result, /wheelchair accessibility not confirmed/);
});

test('NEW: even inventive hallucination wording is ignored, not regex-sanitized', () => {
  const strange = 'You can roll straight in and pay zero dollars; the bus is always on time.';
  assert.equal(validateAndSanitizeExplanation(strange, base), generateFactualExplanation(base));
});

test('NEW: listing facts are described without hallucinated route numbers', () => {
  const item = { ...base, cost: '$10', transitAccessible: true, wheelchairAccessible: true };
  const result = validateAndSanitizeExplanation('Route 41, 8-minute walk, excellent elevators.', item);
  assert.match(result, /entry \(\$10\)/);
  assert.match(result, /Marked transit-accessible in listing/);
  assert.match(result, /Marked wheelchair-accessible in listing/);
  assert.doesNotMatch(result, /Route 41|8-minute|excellent elevators/);
});

test('NEW: strict wheelchair constraint excludes unknown and inaccessible before Gemini', () => {
  const constraints = extractUserConstraints('I use a wheelchair and need an accessible venue', referenceDate);
  const choices = [
    { ...base, id: 'unknown' },
    { ...base, id: 'no', wheelchairAccessible: false },
    { ...base, id: 'yes', wheelchairAccessible: true },
  ];
  assert.deepEqual(filterCandidatesByHardConstraints(choices, constraints, referenceDate).map((x) => x.id), ['yes']);
});

test('NEW: strict transit constraint excludes unverified and false transit before Gemini', () => {
  const constraints = extractUserConstraints('I need public transit, I do not have a car', referenceDate);
  const choices = [
    { ...base, id: 'unknown' },
    { ...base, id: 'no', transitAccessible: false },
    { ...base, id: 'yes', transitAccessible: true },
  ];
  assert.deepEqual(filterCandidatesByHardConstraints(choices, constraints, referenceDate).map((x) => x.id), ['yes']);
});

test('NEW: strict combined constraints rechecked after Gemini and on cached responses', () => {
  const constraints = extractUserConstraints('wheelchair access and public transit required', referenceDate);
  const choices = [
    { ...base, id: 'unknown' },
    { ...base, id: 'wheelchair-only', wheelchairAccessible: true },
    { ...base, id: 'transit-only', transitAccessible: true },
    { ...base, id: 'both', transitAccessible: true, wheelchairAccessible: true },
  ];
  const raw = choices.map(({ id }) => ({ itemId: id, matchReason: hallucination }));
  const matches = enrichAndValidateMatches(raw, choices, constraints, referenceDate);
  assert.deepEqual(matches.map((x) => x.item.id), ['both']);
  assert.doesNotMatch(matches[0].matchReason, /accessible entrance|excellent transit connections/i);
});

test('NEW: compact Gemini payload preserves niche tags in a bounded form', () => {
  const payload = prepareTop10CompactPayload([base], extractUserConstraints('photography'), referenceDate);
  assert.equal(payload.length, 1);
  assert.deepEqual(payload[0].tags, ['photography', 'film', 'students']);
  assert.ok(payload[0].keyDetails.length <= 120);
});

test('NEW: niche tags are bounded and deduplicated', () => {
  const item = { ...base, tags: ['photography', 'photography', '  hiking ', ...Array.from({ length: 20 }, (_, i) => `tag${i}`)] };
  const payload = prepareTop10CompactPayload([item], extractUserConstraints(''), referenceDate);
  assert.equal(payload.length, 1);
  assert.equal(payload[0].tags.length, 8);
  assert.deepEqual(payload[0].tags.slice(0, 2), ['photography', 'hiking']);
});

test('NEW: ordinary hobby word walking should not be treated as a bus requirement', () => {
  const constraints = extractUserConstraints('I enjoy walking through the park', referenceDate);
  assert.equal(constraints.carFreeRequired, undefined);
});

test('NEW: unknown wheelchair/accessibility never becomes a false positive in ranking', () => {
  const query = extractUserConstraints('I need a wheelchair friendly photography event', referenceDate);
  const matches = enrichAndValidateMatches([
    { itemId: 'candidate-1', matchReason: 'Wheelchair accessible entry with a ramp' },
  ], [base], query, referenceDate);
  assert.equal(matches.length, 0);
});
