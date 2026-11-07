import React from 'react';
import { Category, ContentType } from '../types/index.ts';
import { Compass, Users, Sparkles } from 'lucide-react';

interface HeroBannerProps {
  selectedCategory: Category | 'All';
  onSelectCategory: (category: Category | 'All') => void;
  selectedContentType: ContentType | 'All';
  onSelectContentType: (type: ContentType | 'All') => void;
  onOpenFindMyCorner: () => void;
  totalCount: number;
  filteredCount: number;
}

const CATEGORIES: (Category | 'All')[] = [
  'All',
  'Micro-Meetups',
  'Hidden Gems',
  'Coffee & Food',
  'Study & Crafts',
  'Outdoor & Nature',
  'Hobbies & Games',
];

export const HeroBanner: React.FC<HeroBannerProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedContentType,
  onSelectContentType,
  onOpenFindMyCorner,
  totalCount,
  filteredCount,
}) => {
  return (
    <section className="pt-8 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hackathon Prototype Context Banner */}
      <div className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBE3D5] text-[#5A4F43] text-xs font-medium border border-[#DCD3C3]">
        <span className="w-2 h-2 rounded-full bg-[#C85A32]" aria-hidden="true" />
        <span>HackTrent 2026 Prototype · Peterborough, ON · Demonstration Data</span>
      </div>

      {/* Editorial Hero Title & Philosophy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
        <div className="lg:col-span-8">
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl text-[#1B3B2B] font-bold tracking-tight leading-[1.15]">
            Small Corners. <br />
            <span className="italic font-normal text-[#C85A32]">Big Connections.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#554B40] max-w-2xl leading-relaxed">
            Forget massive impersonal crowds. Tiny Corner connects students and young adults through
            niche hobbies, overlooked spots, and spontaneous gatherings of 2 to 8 people across
            Peterborough.
          </p>
        </div>

        {/* Quick Stats & Values */}
        <div className="lg:col-span-4 bg-[#F2ECE3] rounded-2xl p-5 border border-[#E2D8C8]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#7A6B5D] mb-2">
            The Micro-Gathering Principle
          </div>
          <div className="text-sm text-[#3E352B] space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[#1B3B2B] font-bold">✓</span>
              <span>Intimate scale (under 10 participants)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#1B3B2B] font-bold">✓</span>
              <span>Zero-cost or student-budget friendly</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#1B3B2B] font-bold">✓</span>
              <span>Local, authentic, and spontaneous</span>
            </div>
          </div>
        </div>
      </div>

      {/* Find My Corner Interactive Feature Callout */}
      <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#FAF0E6] via-[#F5EFEB] to-[#ECE4D8] border border-[#DFCBB9] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C85A32] uppercase tracking-wider">
            <Compass className="w-4 h-4" aria-hidden="true" />
            <span>AI Hyperlocal Matchmaker</span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1B3B2B]">
            Looking for something specific? Let Gemini find your corner.
          </h2>
          <p className="text-xs sm:text-sm text-[#554B40] leading-relaxed">
            Describe your situation in natural words (e.g. <em>"I'm new in town, I don't have a car, I love photography, and I want to meet a few people this weekend."</em>). Gemini analyzes and ranks the 3 best real matches.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenFindMyCorner}
          className="shrink-0 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white bg-[#1B3B2B] hover:bg-[#132A1F] shadow-sm hover:shadow-md transition-all flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-[#1B3B2B]"
        >
          <Compass className="w-4 h-4 text-[#F4C462]" aria-hidden="true" />
          <span>Launch "Find My Corner"</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="space-y-4 pt-2 border-t border-[#E8E1D7]">
        {/* Content Type Selector (Segmented tabs) */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="Filter by content type"
            className="inline-flex p-1 bg-[#ECE4D8] rounded-xl border border-[#DDD3C3]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedContentType === 'All'}
              onClick={() => onSelectContentType('All')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#1B3B2B] ${
                selectedContentType === 'All'
                  ? 'bg-white text-[#1B3B2B] shadow-xs'
                  : 'text-[#6C5E50] hover:text-[#1B3B2B]'
              }`}
            >
              <Compass className="w-3.5 h-3.5" aria-hidden="true" />
              <span>All Discoveries ({totalCount})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={selectedContentType === 'event'}
              onClick={() => onSelectContentType('event')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#1B3B2B] ${
                selectedContentType === 'event'
                  ? 'bg-white text-[#1B3B2B] shadow-xs'
                  : 'text-[#6C5E50] hover:text-[#1B3B2B]'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#C85A32]" aria-hidden="true" />
              <span>Micro-Meetups</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={selectedContentType === 'lifestyle'}
              onClick={() => onSelectContentType('lifestyle')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#1B3B2B] ${
                selectedContentType === 'lifestyle'
                  ? 'bg-white text-[#1B3B2B] shadow-xs'
                  : 'text-[#6C5E50] hover:text-[#1B3B2B]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#1B3B2B]" aria-hidden="true" />
              <span>Hidden Gems</span>
            </button>
          </div>

          {/* Results count text */}
          <div className="text-xs text-[#7A6B5D] font-medium">
            Showing <span className="font-semibold text-[#1F2922]">{filteredCount}</span> corners in
            Peterborough
          </div>
        </div>

        {/* Category Horizontal Filter Buttons */}
        <div
          role="group"
          aria-label="Filter by category"
          className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none"
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                aria-pressed={isActive}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-[#1B3B2B] ${
                  isActive
                    ? 'bg-[#1B3B2B] text-white shadow-xs'
                    : 'bg-[#F2EBE1] text-[#4F4439] hover:bg-[#E7DED0] hover:text-[#1F2922] border border-transparent'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
