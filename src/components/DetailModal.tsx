import React, { useEffect, useRef } from 'react';
import { CornerItem, AccessibilitySettings } from '../types/index.ts';
import { useFocusTrap } from '../utils/useFocusTrap.ts';
import {
  X,
  MapPin,
  Calendar,
  Users,
  Heart,
  AlertCircle,
  Sparkles,
  Info,
  Clock,
  DollarSign,
  Share2,
} from 'lucide-react';

interface DetailModalProps {
  item: CornerItem | null;
  onClose: () => void;
  onToggleInterest: (itemId: string) => void;
  accessibilitySettings: AccessibilitySettings;
  onShowToast: (message: string) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  item,
  onClose,
  onToggleInterest,
  accessibilitySettings,
  onShowToast,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isSimplified = accessibilitySettings.simplifiedReading;
  const modalContainerRef = useFocusTrap(Boolean(item), onClose);

  useEffect(() => {
    if (item) {
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [item]);

  if (!item) return null;

  const isEvent = item.contentType === 'event';

  const handleShare = () => {
    const summary = `🌟 Tiny Corner discovery: "${item.title}" (${item.category} in ${item.area})
${item.description.slice(0, 160)}...
${item.dateDisplay || item.dateTime ? '📅 ' + (item.dateDisplay || item.dateTime) + '\n' : ''}📍 ${item.location}
(Peterborough hyperlocal discovery)`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summary);
      onShowToast(`Copied activity summary to clipboard! (Note: posts are stored in your local browser demo)`);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
    >
      <div
        ref={modalContainerRef}
        className={`relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E0D7C9] overflow-hidden my-6 transition-all ${
          isSimplified ? 'p-6 sm:p-10 bg-[#FAF7F2]' : ''
        }`}
      >
        {/* Simplified Reading Mode View */}
        {isSimplified ? (
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#D5C9B7]">
              <span className="text-xs uppercase tracking-widest font-mono text-[#5A4F43]">
                Simplified Reading Mode · {item.category}
              </span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-[#3E352B] hover:bg-[#EBE2D5] focus-visible:ring-2 focus-visible:ring-[#1B3B2B]"
                aria-label="Close reading view"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <h1 id="modal-title" className="font-serif text-3xl font-bold text-[#1B3B2B] leading-tight">
                {item.title}
              </h1>

              <div className="text-base text-[#242A24] leading-relaxed border-l-2 border-[#1B3B2B] pl-4">
                {item.description}
              </div>

              {isEvent && (
                <div className="bg-white p-5 rounded-2xl border border-[#D5C9B7] space-y-3">
                  <div className="text-sm font-semibold text-[#1B3B2B]">Event Specifics:</div>
                  <div className="text-sm">
                    <strong>When:</strong> {item.dateDisplay || item.dateTime || 'To be confirmed'}
                  </div>
                  <div className="text-sm">
                    <strong>Where:</strong> {item.location} ({item.area})
                  </div>
                  {item.maxParticipants && (
                    <div className="text-sm">
                      <strong>Group Size:</strong> Up to {item.maxParticipants} people
                    </div>
                  )}
                  {item.vibe && (
                    <div className="text-sm">
                      <strong>Atmosphere:</strong> {item.vibe}
                    </div>
                  )}
                  {item.whatToBring && (
                    <div className="text-sm">
                      <strong>What to Bring:</strong> {item.whatToBring}
                    </div>
                  )}
                </div>
              )}

              {/* Host info in reading mode */}
              <div className="pt-4 border-t border-[#D5C9B7] flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#5A4F43]">Organized by</div>
                  <div className="text-sm font-bold text-[#1B3B2B]">{item.organizer.name}</div>
                </div>

                <div className="flex items-center gap-3">
                  {isEvent && (
                    <button
                      type="button"
                      onClick={() => onToggleInterest(item.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                        item.userIsInterested
                          ? 'bg-[#1B3B2B] text-white border-[#1B3B2B]'
                          : 'bg-white text-[#1B3B2B] border-[#1B3B2B]'
                      }`}
                    >
                      {item.userIsInterested ? '✓ You Are Going' : 'Express Interest'} ({item.currentInterested})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#EBE2D5] text-[#242A24]"
                  >
                    Done Reading
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Rich Media View */
          <div>
            {/* Modal Image Header */}
            <div className="relative h-64 sm:h-72 w-full bg-[#EAE2D5]">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

              {/* Close Button */}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-md transition-colors focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Close details"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>

              {/* Badges on Header */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-[#1B3B2B] backdrop-blur-md">
                  {isEvent ? 'Micro-Gathering' : 'Lifestyle Gem'}
                </span>
                {item.isDemoSeed && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#1B3B2B]/85 text-[#F4C462]">
                    Peterborough Demo
                  </span>
                )}
              </div>

              {/* Title & Category over image gradient */}
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="text-xs font-medium uppercase tracking-wider text-[#F4C462] mb-1">
                  {item.category} · {item.area}
                </div>
                <h1 id="modal-title" className="font-serif text-2xl sm:text-3xl font-bold leading-tight">
                  {item.title}
                </h1>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-7 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Description */}
              <p className="text-sm sm:text-base text-[#3E352B] leading-relaxed">
                {item.description}
              </p>

              {/* Missing Details Notice (Core Feature for transparent micro-organizing) */}
              {item.missingDetails && item.missingDetails.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#FFF9E6] border border-[#F4DC96] text-[#7A5B15]">
                  <div className="flex items-center gap-2 font-semibold text-xs mb-1.5">
                    <AlertCircle className="w-4 h-4 text-[#C85A32]" aria-hidden="true" />
                    <span>Organizer Notes · Details to Confirm</span>
                  </div>
                  <ul className="text-xs space-y-1 list-disc pl-5">
                    {item.missingDetails.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Micro-Event Key Details Grid */}
              {isEvent ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8E1D7]">
                  <div className="flex items-start gap-2.5 text-xs text-[#4F4439]">
                    <Calendar className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="font-semibold text-[#1F2922] block">Date & Time</span>
                      <span>{item.dateDisplay || item.dateTime || 'To be finalized'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-[#4F4439]">
                    <MapPin className="w-4 h-4 text-[#1B3B2B] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="font-semibold text-[#1F2922] block">Meeting Spot</span>
                      <span>{item.location}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-[#4F4439]">
                    <Users className="w-4 h-4 text-[#1B3B2B] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="font-semibold text-[#1F2922] block">Group Cap</span>
                      <span>{item.maxParticipants ? `Up to ${item.maxParticipants} people` : 'Small group'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-[#4F4439]">
                    <Sparkles className="w-4 h-4 text-[#E6A635] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="font-semibold text-[#1F2922] block">Atmosphere</span>
                      <span>{item.vibe || 'Friendly, casual & beginner welcome'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Lifestyle specific details */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8E1D7]">
                  {item.bestTimeToVisit && (
                    <div className="flex items-start gap-2.5 text-xs text-[#4F4439]">
                      <Clock className="w-4 h-4 text-[#1B3B2B] shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <span className="font-semibold text-[#1F2922] block">Best Time to Visit</span>
                        <span>{item.bestTimeToVisit}</span>
                      </div>
                    </div>
                  )}

                  {item.cost && (
                    <div className="flex items-start gap-2.5 text-xs text-[#4F4439]">
                      <DollarSign className="w-4 h-4 text-[#1B3B2B] shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <span className="font-semibold text-[#1F2922] block">Cost</span>
                        <span>{item.cost}</span>
                      </div>
                    </div>
                  )}

                  <div className="sm:col-span-2 flex items-start gap-2.5 text-xs text-[#4F4439]">
                    <MapPin className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="font-semibold text-[#1F2922] block">Location</span>
                      <span>{item.location} ({item.area})</span>
                    </div>
                  </div>
                </div>
              )}

              {/* What to bring / Insider tip */}
              {isEvent && item.whatToBring && (
                <div className="text-xs text-[#554B40] bg-[#F4EFE6] p-3.5 rounded-xl border border-[#E5DAC8]">
                  <span className="font-semibold text-[#1B3B2B] block mb-1">What to Bring</span>
                  <p>{item.whatToBring}</p>
                </div>
              )}

              {!isEvent && item.insiderTip && (
                <div className="text-xs text-[#554B40] bg-[#F4EFE6] p-3.5 rounded-xl border border-[#E5DAC8]">
                  <span className="font-semibold text-[#C85A32] block mb-1">Local Insider Tip</span>
                  <p>{item.insiderTip}</p>
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-[#7A6B5D] bg-[#F0EBE2] px-2.5 py-1 rounded-lg font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Host Profile */}
              <div className="flex items-center justify-between p-4 bg-[#F8F5EE] rounded-2xl border border-[#E8E1D7]">
                <div className="flex items-center gap-3">
                  <img
                    src={item.organizer.avatarUrl}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover border border-[#D5C9B7]"
                  />
                  <div>
                    <div className="text-xs text-[#7A6B5D]">Shared by</div>
                    <div className="font-bold text-sm text-[#1B3B2B]">{item.organizer.name}</div>
                    <div className="text-xs text-[#8C7E70]">{item.organizer.role || item.organizer.handle}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleShare}
                  className="p-2 text-xs font-semibold text-[#554B40] bg-white hover:bg-[#EAE2D5] border border-[#DDD3C3] rounded-xl flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[#1B3B2B]"
                  aria-label="Share corner"
                >
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
            </div>

            {/* Modal Action Footer */}
            <div className="p-4 sm:p-5 bg-[#FAF7F2] border-t border-[#E8E1D7] flex items-center justify-between gap-3">
              <div className="text-xs text-[#7A6B5D] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tiny Corner prototype · Stored locally</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#554B40] hover:text-[#1F2922] transition-colors"
                >
                  Close
                </button>

                {isEvent && (
                  <button
                    type="button"
                    onClick={() => onToggleInterest(item.id)}
                    aria-pressed={Boolean(item.userIsInterested)}
                    className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-[#1B3B2B] ${
                      item.userIsInterested
                        ? 'bg-[#C85A32] text-white shadow-xs hover:bg-[#B34E2A]'
                        : 'bg-[#1B3B2B] text-white hover:bg-[#132A1F]'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${item.userIsInterested ? 'fill-current' : ''}`}
                      aria-hidden="true"
                    />
                    <span>
                      {item.userIsInterested ? "I'm Going ✓" : "I'm Interested"}
                    </span>
                    <span className="text-xs opacity-80">({item.currentInterested})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
