import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterItems,
  toggleInterestInItem,
  validatePostDraft,
  buildCornerItemFromDraft,
} from './filterAndSearch.ts';
import type { CornerItem, MagicDraftResponse } from '../types/index.ts';

const mockItems: CornerItem[] = [
  {
    id: 'item-1',
    title: 'Sadleir House Board Game Night',
    description: 'Come play Catan and Wingspan in the cozy library.',
    contentType: 'event',
    category: 'Micro-Meetups',
    location: 'Sadleir House',
    area: 'Downtown',
    imageUrl: 'https://example.com/catan.jpg',
    tags: ['boardgames', 'beginners', 'peterborough'],
    createdAt: '2026-11-01',
    organizer: {
      name: 'Maya Lin',
      handle: '@mayalin',
      avatarUrl: 'https://example.com/avatar.jpg',
    },
    currentInterested: 4,
    userIsInterested: false,
  },
  {
    id: 'item-2',
    title: 'Silver Bean Café Riverside Reading',
    description: 'Secret peaceful spot on Little Lake for quiet study and tea.',
    contentType: 'lifestyle',
    category: 'Coffee & Food',
    location: 'Silver Bean Café',
    area: 'Waterfront',
    imageUrl: 'https://example.com/coffee.jpg',
    tags: ['coffee', 'reading', 'waterfront'],
    createdAt: '2026-11-02',
    organizer: {
      name: 'Julian Vance',
      handle: '@julianv',
      avatarUrl: 'https://example.com/avatar2.jpg',
    },
    currentInterested: 8,
    userIsInterested: true,
  },
  {
    id: 'item-3',
    title: 'Trent Nature Sanctuary Beginner Trail Walk',
    description: 'Gentle walk through cedar drumlins and wetland boardwalks.',
    contentType: 'event',
    category: 'Outdoor & Nature',
    location: 'Trent Wildlife Sanctuary',
    area: 'Trent Campus',
    imageUrl: 'https://example.com/trail.jpg',
    tags: ['nature', 'hiking', 'birds'],
    createdAt: '2026-11-03',
    organizer: {
      name: 'Sam Otonabee',
      handle: '@samo',
      avatarUrl: 'https://example.com/avatar3.jpg',
    },
    currentInterested: 2,
    userIsInterested: false,
  },
];

test('filterItems by category', () => {
  const result = filterItems(mockItems, {
    category: 'Coffee & Food',
    contentType: 'All',
    searchQuery: '',
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'item-2');
});

test('filterItems by contentType event', () => {
  const result = filterItems(mockItems, {
    category: 'All',
    contentType: 'event',
    searchQuery: '',
  });
  assert.equal(result.length, 2);
  assert.equal(result.some((i) => i.id === 'item-1'), true);
  assert.equal(result.some((i) => i.id === 'item-3'), true);
});

test('filterItems by keyword search in title and tags', () => {
  const byKeyword = filterItems(mockItems, {
    category: 'All',
    contentType: 'All',
    searchQuery: 'boardgames',
  });
  assert.equal(byKeyword.length, 1);
  assert.equal(byKeyword[0].id, 'item-1');

  const byLocation = filterItems(mockItems, {
    category: 'All',
    contentType: 'All',
    searchQuery: 'Little Lake',
  });
  assert.equal(byLocation.length, 1);
  assert.equal(byLocation[0].id, 'item-2');
});

test('toggleInterestInItem increments and flags correctly', () => {
  // Toggle on item-1 (currently false with 4 interested)
  const toggled = toggleInterestInItem(mockItems, 'item-1');
  const item1 = toggled.find((i) => i.id === 'item-1');
  assert.equal(item1?.userIsInterested, true);
  assert.equal(item1?.currentInterested, 5);

  // Toggle again should decrement back to 4
  const untoggled = toggleInterestInItem(toggled, 'item-1');
  const untoggledItem1 = untoggled.find((i) => i.id === 'item-1');
  assert.equal(untoggledItem1?.userIsInterested, false);
  assert.equal(untoggledItem1?.currentInterested, 4);
});

test('validatePostDraft validates required fields', () => {
  const invalid = validatePostDraft({
    title: '',
    description: 'too short',
    location: '',
  });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.title);
  assert.ok(invalid.errors.description);
  assert.ok(invalid.errors.location);

  const valid = validatePostDraft({
    title: 'Acoustic Guitar Circle',
    description: 'Casual gathering to play 90s indie songs in the park.',
    location: 'Rotary Greenway Trail',
    contentType: 'lifestyle',
  });
  assert.equal(valid.isValid, true);
  assert.equal(Object.keys(valid.errors).length, 0);
});

test('buildCornerItemFromDraft creates complete entity with missing details noted', () => {
  const mockDraft: MagicDraftResponse = {
    title: 'Beginner Pottery Hand-building',
    shortDescription: 'Let us try air-dry clay together on Sunday morning.',
    contentType: 'event',
    category: 'Study & Crafts',
    tags: ['crafts', 'pottery', 'peterborough'],
    participantLimit: 5,
    dateTime: 'Sunday 10am',
    suggestedLocation: 'Peterborough Square food court atrium',
    missingDetails: ['Confirm whether table permits air-dry clay', 'Bring newspaper mats'],
    organizerNotes: 'Bring small sponges and toothpicks for sculpting details',
  };

  const item = buildCornerItemFromDraft(mockDraft, {
    location: 'Peterborough Square Mezzanine',
  });

  assert.equal(item.title, 'Beginner Pottery Hand-building');
  assert.equal(item.category, 'Study & Crafts');
  assert.equal(item.location, 'Peterborough Square Mezzanine');
  assert.equal(item.maxParticipants, 5);
  assert.equal(item.isUserCreated, true);
  assert.equal(item.missingDetails?.length, 2);
  assert.equal(item.currentInterested, 1);
});
