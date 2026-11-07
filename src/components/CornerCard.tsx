import React, { useState } from 'react';
import { CornerItem } from '../types/index.ts';
import { Heart, MapPin, Calendar, Users, Sparkles } from 'lucide-react';

interface CornerCardProps {
  item: CornerItem;
  onSelect: (item: CornerItem) => void;
  onToggleInterest: (itemId: string) => void;
}

export const CornerCard: React.FC<CornerCardProps> = ({
  item,
  onSelect,
  onToggleInterest,
}) => {
  const [imageError, setImageError] = useState(false);
  const isEvent = item.contentType === 'event';

  const handleInterestClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleInterest(item.id);
  };

  return (
    <article
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${item.title}. ${isEvent ? 'Micro-event' : 'Lifestyle recommendation'} in ${item.area}`}
      className="masonry-item group cursor-pointer bg-white rounded-2xl overflow-hidden border border-[#E8E1D7] hover:border-[#C4B7A5] hover:shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#1B3B2B] focus:outline-none flex flex-col"
    >
      {/* Visual Image Header */}
      <div className="corner-card-media relative aspect-4/3 w-full bg-[#EAE2D5] overflow-hidden">
        {!imageError ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            onError={() => setImageError(true)}
            loading="lazy"
            className="corner-card-artwork w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          />
        ) : (
          <div className="corner-card-artwork w-full h-full flex flex-col items-center justify-center p-4 text-[#8C7E70] bg-[#EFE9DF]">
            <Sparkles className="w-8 h-8 text-[#C85A32] mb-1" />
            <span className="text-xs font-serif italic text-center">{item.category}</span>
          </div>
        )}

        {/* Content Type subtle badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide backdrop-blur-md shadow-xs ${
              isEvent
                ? 'bg-[#1B3B2B]/90 text-white'
                : 'bg-white/90 text-[#1B3B2B] border border-[#DDD3C3]'
            }`}
          >
            {isEvent ? 'Micro-Gathering' : 'Lifestyle Gem'}
          </span>
        </div>

        {/* Demo Seed Tag */}
        {item.isDemoSeed && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-0.5 rounded-md bg-[#242A24]/75 text-[#F4C462] text-[10px] font-medium backdrop-blur-xs">
              Demo
            </span>
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Clean Unboxed Metadata with Typographic Separators */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs text-[#7A6B5D] font-medium mb-2">
            <span>{item.category}</span>
            <span aria-hidden="true">·</span>
            <span>{item.area}</span>
            {isEvent && item.maxParticipants && (
              <>
                <span aria-hidden="true">·</span>
                <span>Max {item.maxParticipants}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h2 className="font-serif text-lg font-bold text-[#1B3B2B] group-hover:text-[#C85A32] transition-colors leading-snug line-clamp-2">
            {item.title}
          </h2>

          {/* Description Excerpt */}
          <p className="mt-2 text-xs sm:text-sm text-[#554B40] line-clamp-3 leading-relaxed">
            {item.description}
          </p>

          {/* Event-specific schedule / Location Info */}
          <div className="mt-3.5 space-y-1.5 text-xs text-[#6C5E50] border-t border-[#F2ECE3] pt-3">
            {isEvent && item.dateDisplay && (
              <div className="flex items-center gap-1.5 font-medium text-[#1B3B2B]">
                <Calendar className="w-3.5 h-3.5 text-[#C85A32] shrink-0" aria-hidden="true" />
                <span className="truncate">{item.dateDisplay}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[#7A6B5D]">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-[#8C7E70]" aria-hidden="true" />
              <span className="truncate">{item.location}</span>
            </div>
          </div>
        </div>

        {/* Card Footer: Host & Interest Action */}
        <div className="mt-4 pt-3.5 border-t border-[#F0EAE0] flex items-center justify-between gap-3">
          {/* Organizer */}
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={item.organizer.avatarUrl}
              alt=""
              className="w-7 h-7 rounded-full object-cover border border-[#DDD3C3] shrink-0"
            />
            <div className="truncate">
              <span className="block text-xs font-semibold text-[#1F2922] truncate">
                {item.organizer.name}
              </span>
              <span className="block text-[10px] text-[#8C7E70] truncate">
                {item.organizer.role || 'Organizer'}
              </span>
            </div>
          </div>

          {/* Interested Button */}
          {isEvent ? (
            <button
              type="button"
              onClick={handleInterestClick}
              aria-pressed={Boolean(item.userIsInterested)}
              aria-label={`Express interest in ${item.title}. Currently ${item.currentInterested} interested.`}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-[#1B3B2B] ${
                item.userIsInterested
                  ? 'bg-[#C85A32] text-white shadow-xs'
                  : 'bg-[#F2ECE3] text-[#4A4036] hover:bg-[#E7DFD2] border border-[#DDD4C7]'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-transform ${
                  item.userIsInterested ? 'fill-current scale-110' : ''
                }`}
                aria-hidden="true"
              />
              <span>{item.currentInterested}</span>
              <span className="hidden sm:inline">
                {item.userIsInterested ? 'Going' : 'Interested'}
              </span>
            </button>
          ) : (
            <div className="text-xs font-medium text-[#7A6B5D] flex items-center gap-1">
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{item.currentInterested} saved</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
