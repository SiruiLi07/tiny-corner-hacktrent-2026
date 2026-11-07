export type ContentType = 'lifestyle' | 'event';

export type Category =
  | 'Micro-Meetups'
  | 'Hidden Gems'
  | 'Coffee & Food'
  | 'Study & Crafts'
  | 'Outdoor & Nature'
  | 'Hobbies & Games';

export interface Organizer {
  name: string;
  avatarUrl: string;
  handle: string;
  role?: string;
}

export interface CornerItem {
  id: string;
  title: string;
  description: string;
  contentType: ContentType;
  category: Category;
  location: string;
  area: string; // e.g. "Downtown", "Trent Campus", "East City"
  imageUrl: string;
  tags: string[];
  createdAt: string;
  organizer: Organizer;
  isDemoSeed?: boolean;
  isUserCreated?: boolean;

  // Event specific fields
  dateTime?: string;
  dateDisplay?: string;
  eventDate?: string; // ISO YYYY-MM-DD for exact date constraints
  maxParticipants?: number | null;
  currentInterested: number;
  userIsInterested?: boolean;
  missingDetails?: string[];
  vibe?: string;
  whatToBring?: string;

  // Lifestyle post specific fields
  bestTimeToVisit?: string;
  cost?: 'Free' | '$' | '$$' | '$$$' | string;
  insiderTip?: string;

  // Accessibility & Transportation metadata (verified facts only)
  wheelchairAccessible?: boolean | 'Not confirmed';
  transitAccessible?: boolean | 'Not confirmed';
}

export interface FilterOptions {
  category: Category | 'All';
  contentType: ContentType | 'All';
  searchQuery: string;
}

export interface MagicDraftResponse {
  title: string;
  shortDescription: string;
  contentType: 'event' | 'lifestyle';
  category: Category;
  tags: string[];
  participantLimit?: number | null;
  dateTime?: string;
  suggestedLocation?: string;
  missingDetails: string[];
  organizerNotes?: string;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  textSize: 'normal' | 'large' | 'xlarge';
  simplifiedReading: boolean;
  reducedMotion: boolean;
}
