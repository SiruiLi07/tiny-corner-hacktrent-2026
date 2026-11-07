/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { CornerItem, Category, ContentType, AccessibilitySettings } from './types/index.ts';
import { SEED_CORNERS } from './data/seedData.ts';
import { filterItems, toggleInterestInItem } from './utils/filterAndSearch.ts';
import { Navbar } from './components/Navbar.tsx';
import { HeroBanner } from './components/HeroBanner.tsx';
import { CornerCard } from './components/CornerCard.tsx';
import { DetailModal } from './components/DetailModal.tsx';
import { MagicCreateModal } from './components/MagicCreateModal.tsx';
import { ManualCreateModal } from './components/ManualCreateModal.tsx';
import { FindMyCornerModal } from './components/FindMyCornerModal.tsx';
import { AccessibilityDrawer } from './components/AccessibilityDrawer.tsx';
import { Toast } from './components/Toast.tsx';
import { Sparkles, Plus, SearchX, RotateCcw } from 'lucide-react';

const STORAGE_KEY_ITEMS = 'tiny_corner_items_v2';
const STORAGE_KEY_A11Y = 'tiny_corner_a11y_v1';

export default function App() {
  // 1. Items State with localStorage persistence
  const [items, setItems] = useState<CornerItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load items from localStorage:', e);
    }
    return SEED_CORNERS;
  });

  // 2. Accessibility State with localStorage persistence
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_A11Y);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load a11y from localStorage:', e);
    }
    return {
      highContrast: false,
      textSize: 'normal',
      simplifiedReading: false,
      reducedMotion: false,
    };
  });

  // 3. Search and Filter states
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [selectedContentType, setSelectedContentType] = useState<ContentType | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // 4. Modal and Drawer states
  const [selectedItem, setSelectedItem] = useState<CornerItem | null>(null);
  const [isMagicCreateOpen, setIsMagicCreateOpen] = useState(false);
  const [magicCreateInitialPrompt, setMagicCreateInitialPrompt] = useState('');
  const [isManualCreateOpen, setIsManualCreateOpen] = useState(false);
  const [isFindMyCornerOpen, setIsFindMyCornerOpen] = useState(false);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save items to localStorage:', e);
    }
  }, [items]);

  // Sync accessibility to localStorage and HTML root attributes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_A11Y, JSON.stringify(accessibility));
    } catch (e) {
      console.warn('Failed to save a11y to localStorage:', e);
    }

    const root = document.documentElement;
    if (accessibility.highContrast) {
      root.setAttribute('data-contrast', 'high');
    } else {
      root.removeAttribute('data-contrast');
    }

    if (accessibility.textSize !== 'normal') {
      root.setAttribute('data-text-size', accessibility.textSize);
    } else {
      root.removeAttribute('data-text-size');
    }

    if (accessibility.reducedMotion) {
      root.setAttribute('data-reduced-motion', 'true');
    } else {
      root.removeAttribute('data-reduced-motion');
    }
  }, [accessibility]);

  // Check URL query params on mount for demo-safe deep linking (?corner=id or ?find=true)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const cornerId = params.get('corner');
      if (cornerId) {
        const found = items.find((i) => i.id === cornerId);
        if (found) {
          setSelectedItem(found);
        } else {
          showToast(
            'The requested corner was created in a separate browser session. Enjoy exploring the Peterborough feed!'
          );
        }
      }
      if (params.get('find') === 'true') {
        setIsFindMyCornerOpen(true);
      }
    } catch (e) {
      console.warn('Could not parse URL query parameters:', e);
    }
  }, []);

  // Keep selectedItem in sync if its interest count updates
  useEffect(() => {
    if (selectedItem) {
      const updated = items.find((i) => i.id === selectedItem.id);
      if (updated) setSelectedItem(updated);
    }
  }, [items, selectedItem]);

  // Filtered items computation using pure logic
  const filteredItems = useMemo(() => {
    return filterItems(items, {
      category: selectedCategory,
      contentType: selectedContentType,
      searchQuery,
    });
  }, [items, selectedCategory, selectedContentType, searchQuery]);

  // Handlers
  const handleToggleInterest = (itemId: string) => {
    setItems((prev) => {
      const updated = toggleInterestInItem(prev, itemId);
      const target = updated.find((i) => i.id === itemId);
      if (target) {
        showToast(
          target.userIsInterested
            ? `Added "${target.title}" to your interested meetups!`
            : `Removed interest in "${target.title}"`
        );
      }
      return updated;
    });
  };

  const handlePublishItem = (newItem: CornerItem) => {
    setItems((prev) => [newItem, ...prev]);
    // Also reset filters so user immediately sees their newly posted corner at the top
    setSelectedCategory('All');
    setSelectedContentType('All');
    setSearchQuery('');
  };

  const handleResetData = () => {
    localStorage.removeItem(STORAGE_KEY_ITEMS);
    setItems(SEED_CORNERS);
    setSelectedCategory('All');
    setSelectedContentType('All');
    setSearchQuery('');
    showToast('Reset to original Peterborough demonstration dataset.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#1F2922] transition-colors">
      {/* Navigation Header */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenMagicCreate={() => {
          setMagicCreateInitialPrompt('');
          setIsMagicCreateOpen(true);
        }}
        onOpenManualCreate={() => setIsManualCreateOpen(true)}
        onOpenFindMyCorner={() => setIsFindMyCornerOpen(true)}
        onOpenAccessibility={() => setIsAccessibilityOpen(true)}
        accessibilitySettings={accessibility}
      />

      <main className="flex-1 pb-16">
        {/* Editorial Hero & Filtering Section */}
        <HeroBanner
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedContentType={selectedContentType}
          onSelectContentType={setSelectedContentType}
          onOpenFindMyCorner={() => setIsFindMyCornerOpen(true)}
          totalCount={items.length}
          filteredCount={filteredItems.length}
        />

        {/* Discovery Feed Grid */}
        <section
          aria-label="Discovery Feed"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2"
        >
          {filteredItems.length > 0 ? (
            <div className="masonry-grid">
              {filteredItems.map((item) => (
                <CornerCard
                  key={item.id}
                  item={item}
                  onSelect={(selected) => setSelectedItem(selected)}
                  onToggleInterest={handleToggleInterest}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white rounded-3xl p-8 sm:p-14 text-center max-w-xl mx-auto border border-[#E0D7C9] my-10 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-[#F2ECE3] text-[#7A6B5D] flex items-center justify-center mx-auto mb-4">
                <SearchX className="w-7 h-7" aria-hidden="true" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#1B3B2B] mb-2">
                No corners found
              </h2>
              <p className="text-sm text-[#6C5E50] mb-6">
                We couldn't find any activities or hidden gems matching "{searchQuery}". Try
                searching for "boardgames", "hiking", "coffee", or clear your category filter.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setSelectedContentType('All');
                  }}
                  className="px-4 py-2 text-xs font-bold text-[#1B3B2B] bg-[#EAE2D5] hover:bg-[#DDD3C3] rounded-xl transition-colors"
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  onClick={() => setIsMagicCreateOpen(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#1B3B2B] hover:bg-[#132A1F] rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F4C462]" aria-hidden="true" />
                  <span>Create with Gemini</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Local Community Reset Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-[#E8E1D7] flex flex-wrap items-center justify-between gap-4 text-xs text-[#7A6B5D]">
          <div>
            <span>Demo persistence active: Your added corners & interest selections stay saved in this browser.</span>
          </div>
          <button
            type="button"
            onClick={handleResetData}
            className="flex items-center gap-1.5 text-xs text-[#7A6B5D] hover:text-[#1B3B2B] font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Restore original demo posts</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1B3B2B] text-white py-12 border-t border-[#2D5A43]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-8">
            <div className="md:col-span-6 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#F4C462]/20 text-[#F4C462] flex items-center justify-center font-bold">
                  TC
                </div>
                <span className="font-serif text-2xl font-bold tracking-tight">Tiny Corner</span>
              </div>
              <p className="text-xs text-[#C5D5CC] max-w-md leading-relaxed">
                A hyperlocal lifestyle discovery and micro-community platform built for HackTrent 2026.
                Connecting students and young adults across Peterborough, Ontario through spontaneous,
                small gatherings and authentic local spots.
              </p>
            </div>

            <div className="md:col-span-3 space-y-2 text-xs text-[#C5D5CC]">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">
                Judging Highlights
              </div>
              <div>• Best Use of Gemini API (Magic Create)</div>
              <div>• Accessible High-Contrast, Text-Scaling & Reading Modes</div>
              <div>• Full-Stack Architecture with Server Proxy</div>
              <div>• Original Peterborough, ON Dataset</div>
            </div>

            <div className="md:col-span-3 space-y-2 text-xs text-[#C5D5CC]">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">
                Quick Actions
              </div>
              <button
                type="button"
                onClick={() => setIsFindMyCornerOpen(true)}
                className="text-left hover:text-[#F4C462] block transition-colors"
              >
                🧭 Find My Corner (AI Matchmaker)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMagicCreateInitialPrompt('');
                  setIsMagicCreateOpen(true);
                }}
                className="text-left hover:text-[#F4C462] block transition-colors"
              >
                ✨ Try Gemini AI Magic Create
              </button>
              <button
                type="button"
                onClick={() => setIsManualCreateOpen(true)}
                className="text-left hover:text-[#F4C462] block transition-colors"
              >
                + Share a Local Corner
              </button>
              <button
                type="button"
                onClick={() => setIsAccessibilityOpen(true)}
                className="text-left hover:text-[#F4C462] block transition-colors"
              >
                👁 Open Accessibility Controls
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-[#2D5A43] flex flex-wrap items-center justify-between text-[11px] text-[#A3B8AC] gap-4">
            <div>
              © 2026 Tiny Corner. All sample content is fictional demonstration data for HackTrent 2026.
            </div>
            <div>
              Powered by Google Gemini 3.8 Flash & Express Server
            </div>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <DetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onToggleInterest={handleToggleInterest}
        accessibilitySettings={accessibility}
        onShowToast={showToast}
      />

      <MagicCreateModal
        isOpen={isMagicCreateOpen}
        onClose={() => {
          setIsMagicCreateOpen(false);
          setMagicCreateInitialPrompt('');
        }}
        onPublish={handlePublishItem}
        onShowToast={showToast}
        initialPrompt={magicCreateInitialPrompt}
      />

      <FindMyCornerModal
        isOpen={isFindMyCornerOpen}
        onClose={() => setIsFindMyCornerOpen(false)}
        items={items}
        onSelectCorner={(item) => setSelectedItem(item)}
        onToggleInterest={handleToggleInterest}
        onOpenMagicCreateWithPrompt={(initialPrompt) => {
          setMagicCreateInitialPrompt(initialPrompt);
          setIsMagicCreateOpen(true);
        }}
        onShowToast={showToast}
      />

      <ManualCreateModal
        isOpen={isManualCreateOpen}
        onClose={() => setIsManualCreateOpen(false)}
        onPublish={handlePublishItem}
        onShowToast={showToast}
      />

      <AccessibilityDrawer
        isOpen={isAccessibilityOpen}
        onClose={() => setIsAccessibilityOpen(false)}
        settings={accessibility}
        onUpdateSettings={setAccessibility}
        onShowToast={showToast}
      />

      {/* Accessible Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
