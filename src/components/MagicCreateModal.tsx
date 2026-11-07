import React, { useState } from 'react';
import {
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Calendar,
  MapPin,
  Users,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { Category, ContentType, CornerItem, MagicDraftResponse } from '../types/index.ts';
import { buildCornerItemFromDraft } from '../utils/filterAndSearch.ts';
import { useFocusTrap } from '../utils/useFocusTrap.ts';

interface MagicCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (newItem: CornerItem) => void;
  onShowToast: (message: string) => void;
  initialPrompt?: string;
}

const SAMPLE_PROMPTS = [
  'I want to find a few students to play board games this Saturday evening. Beginners are welcome.',
  'Looking for 2-3 people to do a quiet sunset photography walk along Hunter Street historic brick alleyways.',
  'Looking for a study buddy for Bata Library 4th floor quiet riverview tables this Tuesday evening.',
  'Want to organize a Sunday morning beginner hike through Trent Nature Sanctuary cedar boardwalks.',
  'Anyone want to meet at Peterborough Square mezzanine to knit, crochet, or mend sweaters together?',
];

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
  {
    label: 'Acoustic Jam / Park',
    url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=900&q=80',
  },
];

export const MagicCreateModal: React.FC<MagicCreateModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  onShowToast,
  initialPrompt,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt || '');

  React.useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Editable Draft state after Gemini returns
  const [draft, setDraft] = useState<MagicDraftResponse | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDesc, setEditedDesc] = useState('');
  const [editedCategory, setEditedCategory] = useState<Category>('Micro-Meetups');
  const [editedContentType, setEditedContentType] = useState<ContentType>('event');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedDateTime, setEditedDateTime] = useState('');
  const [editedMaxParticipants, setEditedMaxParticipants] = useState<number | ''>(6);
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(PRESET_IMAGES[0].url);

  const modalContainerRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  const handleGenerate = async (textToUse?: string) => {
    const query = (textToUse ?? prompt).trim();
    if (!query) {
      setApiError('Please enter a natural description of your idea first.');
      return;
    }

    setIsLoading(true);
    setApiError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch('/api/magic-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: query }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gemini API failed to process request.');
      }

      if (data.draft) {
        const d: MagicDraftResponse = data.draft;
        setDraft(d);
        setEditedTitle(d.title || '');
        setEditedDesc(d.shortDescription || '');
        setEditedCategory(d.category || 'Micro-Meetups');
        setEditedContentType(d.contentType || 'event');
        setEditedLocation(d.suggestedLocation || '');
        setEditedDateTime(d.dateTime || '');
        setEditedMaxParticipants(d.participantLimit || 6);
        setEditedTags(d.tags || ['peterborough', 'community']);

        // Auto-match image preset based on category
        if (d.category === 'Outdoor & Nature') setSelectedImage(PRESET_IMAGES[1].url);
        else if (d.category === 'Coffee & Food') setSelectedImage(PRESET_IMAGES[2].url);
        else if (d.category === 'Study & Crafts') setSelectedImage(PRESET_IMAGES[5].url);
        else if (d.category === 'Hobbies & Games') setSelectedImage(PRESET_IMAGES[0].url);

        onShowToast('Gemini structured your idea into an editable draft!');
      } else {
        throw new Error('Gemini did not return a valid draft.');
      }
    } catch (err: any) {
      console.error('Magic Create Error:', err);
      if (err.name === 'AbortError') {
        setApiError('Magic Create request timed out (12s limit). Please click Retry below.');
      } else {
        setApiError(
          err.message ||
            'Failed to reach Gemini API. Please make sure GEMINI_API_KEY is configured in AI Studio Secrets.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSample = (sample: string) => {
    setPrompt(sample);
    handleGenerate(sample);
  };

  const handleAddTag = () => {
    const t = newTagInput.trim().toLowerCase().replace(/^#/, '');
    if (t && !editedTags.includes(t)) {
      setEditedTags([...editedTags, t]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedTags(editedTags.filter((t) => t !== tagToRemove));
  };

  const handlePublishDraft = () => {
    if (!draft) return;

    if (!editedTitle.trim()) {
      setApiError('Please provide a title for your gathering.');
      return;
    }

    if (!editedDesc.trim()) {
      setApiError('Please provide a description.');
      return;
    }

    const newItem = buildCornerItemFromDraft(
      {
        ...draft,
        title: editedTitle,
        shortDescription: editedDesc,
        category: editedCategory,
        contentType: editedContentType,
        tags: editedTags,
        participantLimit: typeof editedMaxParticipants === 'number' ? editedMaxParticipants : 6,
      },
      {
        location: editedLocation || 'Peterborough, ON',
        dateTime: editedDateTime,
        imageUrl: selectedImage,
        maxParticipants: typeof editedMaxParticipants === 'number' ? editedMaxParticipants : 6,
      }
    );

    onPublish(newItem);
    onShowToast(`🎉 "${newItem.title}" published to the Discovery Feed!`);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setDraft(null);
    setPrompt('');
    setApiError(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="magic-create-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
    >
      <div
        ref={modalContainerRef}
        className="relative w-full max-w-2xl bg-[#FAF7F2] rounded-3xl shadow-2xl border border-[#D5C9B7] overflow-hidden my-6"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#1B3B2B] to-[#2D5A43] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F4C462]/20 flex items-center justify-center text-[#F4C462]">
              <Sparkles className="w-5 h-5 animate-spin-slow" aria-hidden="true" />
            </div>
            <div>
              <h2 id="magic-create-title" className="font-serif text-xl sm:text-2xl font-bold">
                Gemini AI Magic Create
              </h2>
              <p className="text-xs text-[#E2ECE5]">
                Turn everyday sentences into structured, transparent micro-event drafts
              </p>
            </div>
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

        {/* Modal Body */}
        <div className="p-5 sm:p-7 max-h-[75vh] overflow-y-auto space-y-6">
          {!draft ? (
            /* Step 1: Prompt Input */
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="magic-prompt-input"
                  className="block text-sm font-bold text-[#1B3B2B] mb-1.5"
                >
                  Describe your activity or discovery in your own words:
                </label>
                <p className="text-xs text-[#6C5E50] mb-2">
                  Mention whatever details you have in mind—activity, timing, vibe, or who you'd
                  like to join. Gemini will structure it and highlight what's still missing.
                </p>
                <textarea
                  id="magic-prompt-input"
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. I want to find a few students to play board games this Saturday evening at Sadleir House. Beginners welcome!"
                  className="w-full p-3.5 text-sm bg-white border border-[#DDD3C3] rounded-2xl text-[#1F2922] placeholder-[#8C7E70] focus:ring-2 focus:ring-[#1B3B2B] focus:border-transparent focus:outline-none"
                />
              </div>

              {/* Sample Prompts for Quick Demo */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7A6B5D] mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-[#E6A635]" aria-hidden="true" />
                  <span>Try a HackTrent judge demonstration idea:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_PROMPTS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSample(sample)}
                      disabled={isLoading}
                      className="text-left text-xs bg-white hover:bg-[#F2ECE3] text-[#4F4439] hover:text-[#1B3B2B] border border-[#DDD3C3] hover:border-[#1B3B2B] px-3 py-2 rounded-xl transition-all shadow-2xs focus-visible:ring-2 focus-visible:ring-[#1B3B2B]"
                    >
                      "{sample}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {apiError && (
                <div
                  role="alert"
                  className="p-4 rounded-2xl bg-[#FDEDE8] border border-[#F5C2B4] text-[#B33E1A] text-xs space-y-1"
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Gemini API Notice</span>
                  </div>
                  <div>{apiError}</div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleGenerate()}
                  disabled={isLoading || !prompt.trim()}
                  className="px-6 py-3 rounded-2xl font-bold text-sm text-white bg-[#1B3B2B] hover:bg-[#132A1F] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-[#1B3B2B]"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#F4C462]" aria-hidden="true" />
                      <span>Gemini is Architecting Your Corner...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#F4C462]" aria-hidden="true" />
                      <span>Generate Structured Draft</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Step 2: Editable AI Draft Review */
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-2xl bg-[#EBE4D8] border border-[#DCD3C3] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#1B3B2B] font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-[#1B3B2B]" aria-hidden="true" />
                  <span>Gemini AI Draft Generated · Review & Edit Before Publishing</span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-[#7A6B5D] hover:text-[#1B3B2B] underline"
                >
                  Start Over
                </button>
              </div>

              {/* Missing Details Notice generated by AI */}
              {draft.missingDetails && draft.missingDetails.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#FFF9E6] border border-[#F4DC96] text-[#7A5B15]">
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <AlertCircle className="w-4 h-4 text-[#C85A32]" aria-hidden="true" />
                    <span>Gemini Organizer Checklist · Details You Still Need to Finalize:</span>
                  </div>
                  <ul className="text-xs space-y-1 list-disc pl-5 text-[#63480B]">
                    {draft.missingDetails.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Editable Fields Form */}
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label htmlFor="edit-title" className="block text-xs font-bold text-[#1B3B2B] mb-1">
                    Gathering Title
                  </label>
                  <input
                    id="edit-title"
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#DDD3C3] rounded-xl text-[#1F2922] focus:ring-2 focus:ring-[#1B3B2B] focus:outline-none"
                  />
                </div>

                {/* Category & Content Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="edit-category"
                      className="block text-xs font-bold text-[#1B3B2B] mb-1"
                    >
                      Category
                    </label>
                    <select
                      id="edit-category"
                      value={editedCategory}
                      onChange={(e) => setEditedCategory(e.target.value as Category)}
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
                    <label
                      htmlFor="edit-content-type"
                      className="block text-xs font-bold text-[#1B3B2B] mb-1"
                    >
                      Type of Post
                    </label>
                    <select
                      id="edit-content-type"
                      value={editedContentType}
                      onChange={(e) => setEditedContentType(e.target.value as ContentType)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-[#DDD3C3] rounded-xl text-[#1F2922] focus:ring-2 focus:ring-[#1B3B2B] focus:outline-none"
                    >
                      <option value="event">Micro-Gathering (Scheduled meetup)</option>
                      <option value="lifestyle">Lifestyle Discovery (Spot recommendation)</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="edit-desc" className="block text-xs font-bold text-[#1B3B2B] mb-1">
                    Inviting Description
                  </label>
                  <textarea
                    id="edit-desc"
                    rows={3}
                    value={editedDesc}
                    onChange={(e) => setEditedDesc(e.target.value)}
                    className="w-full p-3 text-sm bg-white border border-[#DDD3C3] rounded-xl text-[#1F2922] focus:ring-2 focus:ring-[#1B3B2B] focus:outline-none"
                  />
                </div>

                {/* Date/Time and Location Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="edit-datetime"
                      className="block text-xs font-bold text-[#1B3B2B] mb-1 flex items-center gap-1"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#C85A32]" aria-hidden="true" />
                      <span>Date & Time (Organizer to confirm)</span>
                    </label>
                    <input
                      id="edit-datetime"
                      type="text"
                      value={editedDateTime}
                      onChange={(e) => setEditedDateTime(e.target.value)}
                      placeholder="e.g. Saturday, 6:30 PM - 8:30 PM"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-[#DDD3C3] rounded-xl text-[#1F2922] focus:ring-2 focus:ring-[#1B3B2B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-location"
                      className="block text-xs font-bold text-[#1B3B2B] mb-1 flex items-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#1B3B2B]" aria-hidden="true" />
                      <span>Location / Meeting Spot</span>
                    </label>
                    <input
                      id="edit-location"
                      type="text"
                      value={editedLocation}
                      onChange={(e) => setEditedLocation(e.target.value)}
                      placeholder="e.g. Sadleir House Library or Silver Bean"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-[#DDD3C3] rounded-xl text-[#1F2922] focus:ring-2 focus:ring-[#1B3B2B] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Participant limit */}
                {editedContentType === 'event' && (
                  <div>
                    <label
                      htmlFor="edit-limit"
                      className="block text-xs font-bold text-[#1B3B2B] mb-1 flex items-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5 text-[#1B3B2B]" aria-hidden="true" />
                      <span>Participant Cap (Keep it micro: 2 to 10 people)</span>
                    </label>
                    <input
                      id="edit-limit"
                      type="number"
                      min={2}
                      max={12}
                      value={editedMaxParticipants}
                      onChange={(e) =>
                        setEditedMaxParticipants(
                          e.target.value ? parseInt(e.target.value, 10) : ''
                        )
                      }
                      className="w-32 px-3.5 py-2 text-sm bg-white border border-[#DDD3C3] rounded-xl text-[#1F2922] focus:ring-2 focus:ring-[#1B3B2B] focus:outline-none"
                    />
                  </div>
                )}

                {/* Tags */}
                <div>
                  <label className="block text-xs font-bold text-[#1B3B2B] mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Interest Tags</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {editedTags.map((tag) => (
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
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
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

                {/* Image Selection Presets */}
                <div>
                  <label className="block text-xs font-bold text-[#1B3B2B] mb-1.5">
                    Select Curated Cover Photo
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

                {/* Gemini Hosting Tip Note */}
                {draft.organizerNotes && (
                  <div className="p-3.5 rounded-xl bg-[#F0EBE2] border border-[#DDD3C3] text-xs text-[#554B40]">
                    <span className="font-semibold text-[#1B3B2B] block mb-0.5">
                      💡 Gemini Host Tip:
                    </span>
                    <span>{draft.organizerNotes}</span>
                  </div>
                )}
              </div>

              {/* Publish Action Footer */}
              <div className="pt-4 border-t border-[#D5C9B7] flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-semibold text-[#6C5E50] hover:text-[#1F2922]"
                >
                  Discard & Re-type
                </button>

                <button
                  type="button"
                  onClick={handlePublishDraft}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-[#1B3B2B] hover:bg-[#132A1F] shadow-sm hover:shadow-md transition-all flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-[#1B3B2B]"
                >
                  <span>Publish to Discovery Feed</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
