import React, { useState } from 'react';
import { X, Calendar, MapPin, Users, Tag, ArrowRight } from 'lucide-react';
import { Category, ContentType, CornerItem } from '../types/index.ts';
import { validatePostDraft } from '../utils/filterAndSearch.ts';
import { resolveItemEventDate } from '../utils/constraintExtractor.ts';
import { useFocusTrap } from '../utils/useFocusTrap.ts';

interface ManualCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (item: CornerItem) => void;
  onShowToast: (msg: string) => void;
}

const PRESET_IMAGES = [
  {
    label: 'Board Games / Library',
    url: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Nature / Cedar Trails',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Café / Coffee & Tea',
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Photography / Brick Alleyways',
    url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Study / Library Focus',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'Crafts / Knitting & Art',
    url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=900&q=80',
  },
];

export const ManualCreateModal: React.FC<ManualCreateModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  onShowToast,
}) => {
  const [contentType, setContentType] = useState<ContentType>('event');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('Micro-Meetups');
  const [location, setLocation] = useState('');
  const [area, setArea] = useState('Downtown Peterborough');
  const [dateTime, setDateTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number | ''>(6);
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['peterborough', 'community']);
  const [extraDetail, setExtraDetail] = useState(''); // what to bring or insider tip
  const [selectedImage, setSelectedImage] = useState(PRESET_IMAGES[0].url);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const modalContainerRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validatePostDraft({
      title,
      description,
      location,
      contentType,
      dateTime,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const calculatedEventDate =
      contentType === 'event' && dateTime
        ? resolveItemEventDate({ dateTime, dateDisplay: dateTime } as any) || undefined
        : undefined;

    const newItem: CornerItem = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description.trim(),
      contentType,
      category,
      location: location.trim(),
      area,
      imageUrl: selectedImage,
      tags,
      createdAt: new Date().toISOString(),
      organizer: {
        name: 'You (Organizer)',
        handle: '@you',
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        role: 'Local Corner Creator',
      },
      isUserCreated: true,
      isDemoSeed: false,
      currentInterested: 1,
      userIsInterested: true,
      dateTime: contentType === 'event' ? dateTime : undefined,
      dateDisplay: contentType === 'event' ? dateTime : undefined,
      eventDate: calculatedEventDate,
      maxParticipants:
        contentType === 'event' && typeof maxParticipants === 'number'
          ? maxParticipants
          : undefined,
      whatToBring: contentType === 'event' ? extraDetail : undefined,
      insiderTip: contentType === 'lifestyle' ? extraDetail : undefined,
      vibe: 'Friendly, low pressure, community vibes.',
    };

    onPublish(newItem);
    onShowToast(`🎉 "${newItem.title}" has been shared to Tiny Corner!`);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-create-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
    >
      <div
        ref={modalContainerRef}
        className="relative w-full max-w-2xl bg-[#FAF7F2] rounded-3xl shadow-2xl border border-[#D5C9B7] overflow-hidden my-6"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#1B3B2B] text-white flex items-center justify-between">
          <div>
            <h2 id="manual-create-title" className="font-serif text-xl sm:text-2xl font-bold">
              Share a Corner
            </h2>
            <p className="text-xs text-[#D8E4DC]">
              Create a lifestyle recommendation or organize a small gathering
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 max-h-[75vh] overflow-y-auto space-y-5">
          {/* Post Type Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-[#1B3B2B] mb-2">
              What kind of corner are you sharing?
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#ECE4D8] rounded-xl border border-[#DDD3C3]">
              <button
                type="button"
                onClick={() => setContentType('event')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  contentType === 'event'
                    ? 'bg-white text-[#1B3B2B] shadow-xs'
                    : 'text-[#6C5E50] hover:text-[#1B3B2B]'
                }`}
              >
                Micro-Gathering (Meetup)
              </button>
              <button
                type="button"
                onClick={() => setContentType('lifestyle')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  contentType === 'lifestyle'
                    ? 'bg-white text-[#1B3B2B] shadow-xs'
                    : 'text-[#6C5E50] hover:text-[#1B3B2B]'
                }`}
              >
                Lifestyle Gem (Local Spot)
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="manual-title" className="block text-xs font-bold text-[#1B3B2B] mb-1">
              Title *
            </label>
            <input
              id="manual-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors({ ...errors, title: '' });
              }}
              placeholder={
                contentType === 'event'
                  ? 'e.g. Saturday Morning Coffee & Sketching Circle'
                  : 'e.g. Hidden Garden Bench behind Sadleir House'
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#DDD3C3] rounded-xl text-[#1F2922] focus:ring-2 focus:ring-[#1B3B2B] focus:outline-none"
            />
            {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
          </div>

          {/* Category & Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="manual-category" className="block text-xs font-bold text-[#1B3B2B] mb-1">
                Category
              </label>
              <select
                id="manual-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#DDD3C3] rounded-xl text-[#1F2922] focus:ring-2 focus:ring-[#1B3B2B] focus:outline-none"
              >
                <option value="Micro-Meetups">Micro-Meetups</option>
                <option value="Hidden Gems">Hidden Gems</option>
                <option value="Coffee & Food">Coffee & Food</option>
                <option value="Study & Crafts">Study & Crafts</option>
                <option value="Outdoor & Nature">Outdoor & Nature</option>
                <option value="Hobbies & Games">Hobbies & Games</option>
              </select>
            </div>

            <div>
              <label htmlFor="manual-area" className="block text-xs font-bold text-[#1B3B2B] mb-1">
                Peterborough Neighborhood
              </label>
              <select
                id="manual-area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#DDD3C3] rounded-xl text-[#1F2922] focus:ring-2 focus:ring-[#1B3B2B] focus:outline-none"
              >
                <option value="Downtown Peterborough">Downtown Peterborough</option>
                <option value="Trent Campus">Trent Campus</option>
                <option value="East City">East City</option>
                <option value="Waterfront / Little Lake">Waterfront / Little Lake</option>
                <option value="North Peterborough">North Peterborough</option>
                <option value="Peterborough South">Peterborough South</option>
              </select>
            </div>
          </div>

          {/* Location & Meeting Point */}
          <div>
            <label
              htmlFor="manual-location"
              className="block text-xs font-bold text-[#1B3B2B] mb-1 flex items-center gap-1"
            >
              <MapPin className="w-3.5 h-3.5 text-[#C85A32]" aria-hidden="true" />
              <span>Specific Spot / Meeting Point *</span>
            </label>
            <input
              id="manual-location"
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                if (errors.location) setErrors({ ...errors, location: '' });
              }}
              placeholder="e.g. Sadleir House library, Silver Bean patio, Bata Library 4th floor"
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#DDD3C3] rounded-xl text-[#1F2922] focus:ring-2 focus:ring-[#1B3B2B] focus:outline-none"
            />
            {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location}</p>}
          </div>

          {/* Event Specific: Date/Time & Capacity */}
          {contentType === 'event' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="manual-datetime"
                  className="block text-xs font-bold text-[#1B3B2B] mb-1 flex items-center gap-1"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#C85A32]" aria-hidden="true" />
                  <span>Proposed Date & Time *</span>
                </label>
                <input
                  id="manual-datetime"
                  type="text"
                  value={dateTime}
                  onChange={(e) => {
                    setDateTime(e.target.value);
                    if (errors.dateTime) setErrors({ ...errors, dateTime: '' });
                  }}
                  placeholder="e.g. This Saturday, 6:00 PM - 8:00 PM"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#DDD3C3] rounded-xl text-[#1F2922] focus:ring-2 focus:ring-[#1B3B2B] focus:outline-none"
                />
                {errors.dateTime && <p className="text-xs text-red-600 mt-1">{errors.dateTime}</p>}
              </div>

              <div>
                <label
                  htmlFor="manual-limit"
                  className="block text-xs font-bold text-[#1B3B2B] mb-1 flex items-center gap-1"
                >
                  <Users className="w-3.5 h-3.5 text-[#1B3B2B]" aria-hidden="true" />
                  <span>Max Participants</span>
                </label>
                <input
                  id="manual-limit"
                  type="number"
                  min={2}
                  max={15}
                  value={maxParticipants}
                  onChange={(e) =>
                    setMaxParticipants(e.target.value ? parseInt(e.target.value, 10) : '')
                  }
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#DDD3C3] rounded-xl text-[#1F2922] focus:ring-2 focus:ring-[#1B3B2B] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="manual-desc" className="block text-xs font-bold text-[#1B3B2B] mb-1">
              Description *
            </label>
            <textarea
              id="manual-desc"
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors({ ...errors, description: '' });
              }}
              placeholder="What makes this corner special? What should participants know about the vibe?"
              className="w-full p-3 text-sm bg-white border border-[#DDD3C3] rounded-xl text-[#1F2922] focus:ring-2 focus:ring-[#1B3B2B] focus:outline-none"
            />
            {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description}</p>}
          </div>

          {/* Extra Detail: What to bring or Insider Tip */}
          <div>
            <label htmlFor="manual-extra" className="block text-xs font-bold text-[#1B3B2B] mb-1">
              {contentType === 'event' ? 'What to Bring' : 'Local Insider Tip'}
            </label>
            <input
              id="manual-extra"
              type="text"
              value={extraDetail}
              onChange={(e) => setExtraDetail(e.target.value)}
              placeholder={
                contentType === 'event'
                  ? 'e.g. Your favorite travel board game, a thermos, warm layers'
                  : 'e.g. Best light is right at 5pm; outlets are behind the back booths'
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#DDD3C3] rounded-xl text-[#1F2922] focus:ring-2 focus:ring-[#1B3B2B] focus:outline-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-[#1B3B2B] mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tags</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#D5C9B7] text-xs font-medium text-[#4A4036]"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-600 ml-0.5 text-xs"
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag and press Enter"
                className="w-48 px-3 py-1.5 text-xs bg-white border border-[#DDD3C3] rounded-lg text-[#1F2922] focus:outline-none focus:ring-2 focus:ring-[#1B3B2B]"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-2.5 py-1.5 text-xs font-semibold bg-[#EAE2D5] text-[#1B3B2B] rounded-lg hover:bg-[#DDD3C3]"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Cover Photo Preset */}
          <div>
            <label className="block text-xs font-bold text-[#1B3B2B] mb-1.5">
              Select Curated Cover Photo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_IMAGES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(preset.url)}
                  className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all ${
                    selectedImage === preset.url
                      ? 'border-[#1B3B2B] ring-2 ring-[#1B3B2B]/30 scale-102'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/35 flex items-end p-1.5 text-[10px] text-white font-medium">
                    <span className="truncate">{preset.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Footer */}
          <div className="pt-4 border-t border-[#D5C9B7] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#6C5E50] hover:text-[#1F2922]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-[#1B3B2B] hover:bg-[#132A1F] shadow-sm hover:shadow-md transition-all flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-[#1B3B2B]"
            >
              <span>Publish Corner</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
