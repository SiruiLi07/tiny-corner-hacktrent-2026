import React from 'react';
import { Sparkles, Plus, Eye, Search, MapPin, Compass } from 'lucide-react';
import { AccessibilitySettings } from '../types/index.ts';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenMagicCreate: () => void;
  onOpenManualCreate: () => void;
  onOpenFindMyCorner: () => void;
  onOpenAccessibility: () => void;
  accessibilitySettings: AccessibilitySettings;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenMagicCreate,
  onOpenManualCreate,
  onOpenFindMyCorner,
  onOpenAccessibility,
  accessibilitySettings,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8E1D7] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#"
              className="flex items-center gap-3 group focus-visible:ring-2 focus-visible:ring-[#1B3B2B] rounded-lg p-1"
              aria-label="Tiny Corner homepage"
            >
              <div className="w-11 h-11 rounded-2xl bg-[#1B3B2B] flex items-center justify-center text-[#F4C462] shadow-sm group-hover:scale-105 transition-transform">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 14V4h10" />
                  <path d="M10 20h10V10" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-xl sm:text-2xl text-[#1B3B2B] tracking-tight leading-none">
                  Tiny Corner
                </span>
                <span className="text-[11px] font-medium text-[#7A6B5D] tracking-wide mt-1">
                  Small Corners · Big Connections
                </span>
              </div>
            </a>

            {/* Hyperlocal Region Badge */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#1B3B2B] bg-[#EBE4D8] px-2.5 py-1 rounded-full font-medium ml-2">
              <MapPin className="w-3.5 h-3.5 text-[#C85A32]" aria-hidden="true" />
              <span>Peterborough, ON</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-sm hidden md:block">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7A6B5D]">
                <Search className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search micro-events, cafés, crafts..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#DDD4C7] rounded-xl text-[#1F2922] placeholder-[#8C7E70] focus:outline-none focus:ring-2 focus:ring-[#1B3B2B] focus:border-transparent transition-all shadow-xs"
                aria-label="Search posts and micro-events"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-[#8C7E70] hover:text-[#1F2922]"
                  aria-label="Clear search query"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Action Navigation */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Find My Corner Entry Button */}
            <button
              type="button"
              onClick={onOpenFindMyCorner}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#1B3B2B] bg-[#F2ECE3] hover:bg-[#E7DED0] border border-[#DDD3C3] transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#1B3B2B]"
              aria-label="Find My Corner using AI preferences"
            >
              <Compass className="w-4 h-4 text-[#C85A32]" aria-hidden="true" />
              <span>Find My Corner</span>
            </button>

            {/* Accessibility Drawer Toggle */}
            <button
              type="button"
              onClick={onOpenAccessibility}
              className={`p-2.5 rounded-xl border transition-all text-xs font-medium flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#1B3B2B] ${
                accessibilitySettings.highContrast ||
                accessibilitySettings.simplifiedReading ||
                accessibilitySettings.textSize !== 'normal'
                  ? 'bg-[#1B3B2B] text-[#F4C462] border-[#1B3B2B]'
                  : 'bg-white text-[#4A4036] border-[#DDD4C7] hover:border-[#1B3B2B]'
              }`}
              aria-label="Accessibility Settings"
              title="Accessibility & Reading Mode"
            >
              <Eye className="w-4 h-4" aria-hidden="true" />
              <span className="hidden xl:inline">A11y</span>
              {(accessibilitySettings.highContrast || accessibilitySettings.simplifiedReading) && (
                <span className="w-2 h-2 rounded-full bg-[#E6A635]" aria-hidden="true" />
              )}
            </button>

            {/* Manual Share Corner */}
            <button
              type="button"
              onClick={onOpenManualCreate}
              className="hidden sm:flex px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#1B3B2B] bg-[#EAE2D5] hover:bg-[#DDD3C3] border border-[#D5C9B7] transition-colors items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#1B3B2B]"
              aria-label="Share a new local corner"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Share</span>
            </button>

            {/* Gemini AI Magic Create Button */}
            <button
              type="button"
              onClick={onOpenMagicCreate}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#1B3B2B] to-[#2D5A43] hover:from-[#132A1F] hover:to-[#224533] shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#1B3B2B]"
              aria-label="Magic Create micro-event with Gemini AI"
            >
              <Sparkles className="w-4 h-4 text-[#F4C462] animate-pulse" aria-hidden="true" />
              <span>Magic Create</span>
            </button>
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="pb-3 sm:hidden">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7A6B5D]">
              <Search className="w-4 h-4" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search Peterborough micro-events..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-[#DDD4C7] rounded-xl text-[#1F2922] placeholder-[#8C7E70] focus:outline-none focus:ring-2 focus:ring-[#1B3B2B]"
              aria-label="Search posts and micro-events on mobile"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-[#8C7E70]"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
