import type { CornerItem, FilterOptions, MagicDraftResponse } from '../types/index.ts';
import { resolveItemEventDate } from './constraintExtractor.ts';

/**
 * Filter items by category, content type, and keyword search
 */
export function filterItems(items: CornerItem[], options: FilterOptions): CornerItem[] {
  const { category, contentType, searchQuery } = options;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    // 1. Category check
    if (category !== 'All' && item.category !== category) {
      return false;
    }

    // 2. Content Type check
    if (contentType !== 'All' && item.contentType !== contentType) {
      return false;
    }

    // 3. Keyword Search check
    if (normalizedQuery.length > 0) {
      const inTitle = item.title.toLowerCase().includes(normalizedQuery);
      const inDesc = item.description.toLowerCase().includes(normalizedQuery);
      const inLoc = item.location.toLowerCase().includes(normalizedQuery);
      const inArea = item.area.toLowerCase().includes(normalizedQuery);
      const inTags = item.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));
      const inOrganizer = item.organizer.name.toLowerCase().includes(normalizedQuery);

      if (!inTitle && !inDesc && !inLoc && !inArea && !inTags && !inOrganizer) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Toggles the "Interested" state of an item and updates interest count
 */
export function toggleInterestInItem(items: CornerItem[], itemId: string): CornerItem[] {
  return items.map((item) => {
    if (item.id !== itemId) return item;

    const currentlyInterested = Boolean(item.userIsInterested);
    const newInterested = !currentlyInterested;
    const delta = newInterested ? 1 : -1;
    const newCount = Math.max(0, (item.currentInterested || 0) + delta);

    return {
      ...item,
      userIsInterested: newInterested,
      currentInterested: newCount,
    };
  });
}

/**
 * Validates a user post draft before publication
 */
export function validatePostDraft(post: Partial<CornerItem>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!post.title || post.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters long.';
  }

  if (!post.description || post.description.trim().length < 10) {
    errors.description = 'Description should provide at least 10 characters of context.';
  }

  if (!post.location || post.location.trim().length < 2) {
    errors.location = 'Please specify a local Peterborough spot or meeting point.';
  }

  if (post.contentType === 'event' && (!post.dateTime || post.dateTime.trim().length < 2)) {
    errors.dateTime = 'Please provide an approximate date or time for your gathering.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Converts a Gemini Magic Draft into a full CornerItem
 */
export function buildCornerItemFromDraft(
  draft: MagicDraftResponse,
  overrides?: {
    location?: string;
    dateTime?: string;
    imageUrl?: string;
    maxParticipants?: number | null;
  }
): CornerItem {
  const now = new Date().toISOString();
  const id = `corner-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    title: draft.title,
    description: draft.shortDescription,
    contentType: draft.contentType || 'event',
    category: draft.category || 'Micro-Meetups',
    location: overrides?.location || draft.suggestedLocation || 'Peterborough, ON',
    area: 'Peterborough',
    imageUrl:
      overrides?.imageUrl ||
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
    tags: draft.tags || ['community', 'peterborough'],
    createdAt: now,
    organizer: {
      name: 'You (Organizer)',
      handle: '@you',
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      role: 'Local Corner Creator',
    },
    isUserCreated: true,
    isDemoSeed: false,
    dateTime: overrides?.dateTime || draft.dateTime || '',
    dateDisplay: overrides?.dateTime || draft.dateTime || 'Date to be confirmed with group',
    eventDate: resolveItemEventDate({
      dateTime: overrides?.dateTime || draft.dateTime,
      dateDisplay: overrides?.dateTime || draft.dateTime,
    } as any) || undefined,
    maxParticipants:
      overrides?.maxParticipants !== undefined
        ? overrides?.maxParticipants
        : draft.participantLimit || 6,
    currentInterested: 1, // Creator is naturally interested
    userIsInterested: true,
    missingDetails: draft.missingDetails || [],
    vibe: draft.organizerNotes || 'Welcoming, relaxed, beginner-friendly atmosphere.',
    whatToBring: 'Just yourself and an open mind!',
  };
}
