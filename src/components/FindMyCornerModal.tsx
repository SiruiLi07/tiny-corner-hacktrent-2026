import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Compass,
  Sparkles,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Heart,
  Calendar,
  MapPin,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { CornerItem } from '../types/index.ts';
import {
  enrichAndValidateMatches,
  getClientCachedResult,
  setClientCachedResult,
  EnrichedMatch,
  FindMyCornerResponse,
  FindMyCornerTiming,
} from '../utils/findMyCorner.ts';
import {
  extractUserConstraints,
  filterCandidatesByHardConstraints,
  prepareTop10CompactPayload,
  formatLocalDateISO,
  UserConstraints,
} from '../utils/constraintExtractor.ts';
import { useFocusTrap } from '../utils/useFocusTrap.ts';

interface FindMyCornerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CornerItem[];
  onSelectCorner: (item: CornerItem) => void;
  onToggleInterest: (itemId: string) => void;
  onOpenMagicCreateWithPrompt: (initialPrompt: string) => void;
  onShowToast: (message: string) => void;
}

const SAMPLE_QUERIES = [
  "I'm new in town, I don't have a car, I love photography, and I want to meet a few people this weekend.",
  "Looking for a quiet spot to study and have tea near water without spending a lot.",
  "I want to play casual board games this weekend as a complete beginner.",
  "Looking for a morning walk in nature with cedar trees and songbirds.",
  "Looking for an acoustic jam session to play folk guitar or listen along.",
  "I want to do a beginner disc golf game or outdoor sport on a Saturday afternoon.",
];

export const FindMyCornerModal: React.FC<FindMyCornerModalProps> = ({
  isOpen,
  onClose,
  items,
  onSelectCorner,
  onToggleInterest,
  onOpenMagicCreateWithPrompt,
  onShowToast,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [apiError, setApiError] = useState<string | null>(null);

  // Results state
  const [enrichedMatches, setEnrichedMatches] = useState<EnrichedMatch[] | null>(null);
  const [noMatchExplanation, setNoMatchExplanation] = useState<string | null>(null);
  const [preferenceSummary, setPreferenceSummary] = useState<string | null>(null);
  const [activeConstraints, setActiveConstraints] = useState<UserConstraints | null>(null);
  const [timingMetrics, setTimingMetrics] = useState<FindMyCornerTiming | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modalContainerRef = useFocusTrap(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (textToSearch?: string) => {
    const q = (textToSearch ?? query).trim();
    if (!q) {
      setApiError('Please describe what you are looking for first.');
      return;
    }

    const tStart = performance.now();
    setIsLoading(true);
    setLoadingStep('Resolving dates & hard constraints...');
    setApiError(null);
    setEnrichedMatches(null);
    setNoMatchExplanation(null);
    setPreferenceSummary(null);
    setTimingMetrics(null);

    try {
      const now = new Date();
      const constraints = extractUserConstraints(q, now);
      setActiveConstraints(constraints);

      // 1. Check client-side cache for instant hit (uses item fingerprint & date to guarantee freshness)
      const cached = getClientCachedResult(q, items, now);
      if (cached) {
        const validated = enrichAndValidateMatches(cached.matches || [], items, constraints);
        setEnrichedMatches(validated);
        setPreferenceSummary(cached.userPreferencesSummary || null);
        setTimingMetrics({
          localFilterMs: 0,
          apiCallMs: 0,
          totalMs: Math.round(performance.now() - tStart),
          cacheHit: true,
        });
        if (validated.length > 0) {
          onShowToast(`Instant match: found ${validated.length} verified corners!`);
        } else {
          setNoMatchExplanation(
            cached.noMatchExplanation ||
              'No corners in Peterborough matched these specific constraints.'
          );
        }
        setIsLoading(false);
        return;
      }

      // 2. Fast local filtering
      const tLocalStart = performance.now();
      const qualifyingCandidates = filterCandidatesByHardConstraints(items, constraints);
      const localFilterMs = Math.round(performance.now() - tLocalStart);

      // If hard constraints eliminate all candidates (e.g. searching for board games this weekend when none are scheduled)
      if (qualifyingCandidates.length === 0) {
        setLoadingStep('Evaluating alternative dates...');
        let explanation = 'No corners match all your constraints.';
        if (constraints.hasDateConstraint && constraints.dateLabel) {
          explanation = `No events or micro-gatherings are currently scheduled for ${constraints.dateLabel} (${constraints.allowedDates?.join(', ')}).`;
          // Helpful suggestion if an event exists on another date
          const futureEvent = items.find((i) =>
            constraints.interestKeywords.some((k) =>
              (i.title + ' ' + i.tags.join(' ')).toLowerCase().includes(k)
            )
          );
          if (futureEvent && futureEvent.dateDisplay) {
            explanation += ` The next ${futureEvent.title} is coming up on ${futureEvent.dateDisplay}.`;
          }
        } else if (constraints.freeOnly || constraints.maxCost === 'Free') {
          explanation = 'No confirmed free activities matched your requested niche.';
        } else if (typeof constraints.numericMaxBudget === 'number') {
          explanation = `No activities within your budget of $${constraints.numericMaxBudget} matched your constraints.`;
        }

        setEnrichedMatches([]);
        setNoMatchExplanation(explanation);
        setTimingMetrics({
          localFilterMs,
          apiCallMs: 0,
          totalMs: Math.round(performance.now() - tStart),
          cacheHit: false,
        });
        setIsLoading(false);
        return;
      }

      // 3. Compact Top 10 payload for Gemini
      setLoadingStep(`Ranking top ${Math.min(10, qualifyingCandidates.length)} candidates with Gemini AI...`);
      const compactPayload = prepareTop10CompactPayload(items, constraints);

      // 15-second client-side network timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const res = await fetch('/api/find-my-corner', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: q,
            candidateItems: compactPayload,
            clientDate: formatLocalDateISO(now),
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to match corners via Gemini API.');
        }

        if (data.result) {
          const result: FindMyCornerResponse = data.result;
          setPreferenceSummary(result.userPreferencesSummary || null);

          // 4. Validate & enrich (strictly enforcing hard constraints defense-in-depth)
          const validated = enrichAndValidateMatches(result.matches || [], items, constraints);
          setEnrichedMatches(validated);

          // Cache on client using item attributes fingerprint & reference date
          setClientCachedResult(q, items, result, now);

          const totalMs = Math.round(performance.now() - tStart);
          setTimingMetrics({
            localFilterMs,
            apiCallMs: data.timing?.apiCallMs || Math.max(1, totalMs - localFilterMs),
            totalMs,
            cacheHit: Boolean(data.timing?.cacheHit),
          });

          if (validated.length > 0) {
            onShowToast(`Found ${validated.length} matching corners for you!`);
          } else {
            setNoMatchExplanation(
              result.noMatchExplanation ||
                'None of the current Peterborough corners met all your criteria.'
            );
          }
        } else {
          throw new Error('Gemini API returned an invalid response structure.');
        }
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          throw new Error('AI recommendation request timed out (15s network limit). Please click Retry Request.');
        }
        throw fetchErr;
      }
    } catch (err: any) {
      console.error('Find My Corner Error:', err);
      setApiError(
        err.message ||
          'Failed to reach Gemini API. Please make sure GEMINI_API_KEY is configured in AI Studio Secrets.'
      );
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleSelectSample = (sample: string) => {
    setQuery(sample);
    handleSearch(sample);
  };

  const handleReset = () => {
    setEnrichedMatches(null);
    setNoMatchExplanation(null);
    setPreferenceSummary(null);
    setApiError(null);
    setTimingMetrics(null);
    setActiveConstraints(null);
    setQuery('');
  };

  const handleStartCornerFromQuery = () => {
    const q = query;
    onClose();
    onOpenMagicCreateWithPrompt(q);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="find-my-corner-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
    >
      <div
        ref={modalContainerRef}
        className="relative w-full max-w-2xl bg-[#FAF7F2] rounded-3xl shadow-2xl border border-[#D5C9B7] overflow-hidden my-6"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#1B3B2B] via-[#234B36] to-[#2D5A43] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F4C462]/20 flex items-center justify-center text-[#F4C462]">
              <Compass className="w-5 h-5 animate-pulse" aria-hidden="true" />
            </div>
            <div>
              <h2 id="find-my-corner-title" className="font-serif text-xl sm:text-2xl font-bold">
                Find My Corner
              </h2>
              <p className="text-xs text-[#D8E4DC]">
                Hyperlocal AI Matchmaker: Fast constraint-verified matches in Peterborough
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
          {/* Step 1: Input section */}
          {!enrichedMatches ? (
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="find-corner-input"
                  className="block text-sm font-bold text-[#1B3B2B] mb-1.5"
                >
                  What kind of experience or gathering are you looking for?
                </label>
                <p className="text-xs text-[#6C5E50] mb-2 leading-relaxed">
                  Mention your situation, niche interests, schedule, or transportation constraints.
                  Gemini ranks only corners that actually exist in Peterborough.
                </p>
                <textarea
                  id="find-corner-input"
                  ref={inputRef}
                  rows={3}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. I'm new in town, I don't have a car, I love photography, and I want to meet a few people this weekend."
                  className="w-full p-3.5 text-sm bg-white border border-[#DDD3C3] rounded-2xl text-[#1F2922] placeholder-[#8C7E70] focus:ring-2 focus:ring-[#1B3B2B] focus:border-transparent focus:outline-none"
                  aria-label="Natural language search description"
                />
              </div>

              {/* Sample Prompts */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7A6B5D] mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-[#E6A635]" aria-hidden="true" />
                  <span>Try one of these examples:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_QUERIES.map((sample, idx) => (
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

              {/* Responsive Loading State */}
              {isLoading && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-4 rounded-2xl bg-[#EBE4D8] border border-[#D5C9B7] text-[#1B3B2B] space-y-2 animate-in fade-in duration-100"
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#1B3B2B]" aria-hidden="true" />
                    <span>{loadingStep || 'Matching with Gemini AI...'}</span>
                  </div>
                  <div className="w-full bg-[#DDD3C3] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#1B3B2B] h-full w-2/3 animate-pulse rounded-full" />
                  </div>
                </div>
              )}

              {/* Error Callout */}
              {apiError && (
                <div
                  role="alert"
                  className="p-4 rounded-2xl bg-[#FDEDE8] border border-[#F5C2B4] text-[#B33E1A] text-xs space-y-2"
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Recommendation Notice</span>
                  </div>
                  <div>{apiError}</div>
                  <button
                    type="button"
                    onClick={() => handleSearch()}
                    className="mt-1 px-3 py-1 bg-[#B33E1A] text-white rounded-lg text-xs font-bold hover:bg-[#962F11] transition-colors"
                  >
                    Retry Request
                  </button>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSearch()}
                  disabled={isLoading || !query.trim()}
                  className="px-6 py-3 rounded-2xl font-bold text-sm text-white bg-[#1B3B2B] hover:bg-[#132A1F] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-[#1B3B2B]"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw
                        className="w-4 h-4 animate-spin text-[#F4C462]"
                        aria-hidden="true"
                      />
                      <span>Searching Peterborough Corners...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#F4C462]" aria-hidden="true" />
                      <span>Find Matching Corners</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Step 2: Results Display */
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header summary of results */}
              <div className="p-4 rounded-2xl bg-[#EBE4D8] border border-[#DCD3C3] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1B3B2B]">
                    <CheckCircle2 className="w-4 h-4 text-[#1B3B2B]" aria-hidden="true" />
                    <span>Gemini AI Match Results</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs font-semibold text-[#7A6B5D] hover:text-[#1B3B2B] underline"
                  >
                    Try Another Request
                  </button>
                </div>

                <div className="text-xs text-[#554B40] italic">
                  "{query}"
                </div>

                {preferenceSummary && (
                  <div className="text-xs text-[#1B3B2B] font-medium pt-1 border-t border-[#DDD3C3]/60">
                    <strong>Understood Preferences:</strong> {preferenceSummary}
                  </div>
                )}

                {/* Timing & Constraint Performance Badge */}
                {timingMetrics && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#DDD3C3]/60 text-[11px] text-[#6C5E50]">
                    <span className="flex items-center gap-1 font-semibold text-[#1B3B2B] bg-white/70 px-2 py-0.5 rounded-md">
                      <Zap className="w-3 h-3 text-[#E6A635]" aria-hidden="true" />
                      {timingMetrics.cacheHit
                        ? `Instant Cache Hit (${timingMetrics.totalMs}ms)`
                        : `Matched in ${timingMetrics.apiCallMs}ms (Gemini Flash-Lite)`}
                    </span>
                    <span className="flex items-center gap-1 text-[#234B36] bg-[#D8E4DC] px-2 py-0.5 rounded-md">
                      <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                      Hard Constraints Verified
                    </span>
                    {activeConstraints?.allowedDates && (
                      <span className="text-[#7A6B5D]">
                        Date window: {activeConstraints.allowedDates.join(', ')}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Case A: Matches Found */}
              {enrichedMatches.length > 0 ? (
                <div
                  className="space-y-4"
                  role="feed"
                  aria-label={`${enrichedMatches.length} matched corners`}
                >
                  <div className="text-xs font-bold text-[#6C5E50] uppercase tracking-wider">
                    {enrichedMatches.length === 1
                      ? '1 qualifying corner found'
                      : `${enrichedMatches.length} qualifying corners found`}
                  </div>

                  {enrichedMatches.map((match) => {
                    const item = match.item;
                    const isEvent = item.contentType === 'event';

                    return (
                      <article
                        key={item.id}
                        className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E0D7C9] shadow-xs hover:border-[#1B3B2B] transition-all flex flex-col gap-3.5"
                      >
                        {/* Match Rank & Score Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-[#F2ECE3] pb-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                match.rank === 1
                                  ? 'bg-[#1B3B2B] text-white'
                                  : match.rank === 2
                                  ? 'bg-[#C85A32] text-white'
                                  : 'bg-[#EAE2D5] text-[#1B3B2B]'
                              }`}
                            >
                              #{match.rank} Match
                            </span>
                            <span
                              className="text-xs font-semibold text-[#1B3B2B] bg-[#F2ECE3] px-2 py-0.5 rounded-md"
                              title="Calculated from verified date, topic, and transportation criteria"
                            >
                              {match.relevanceScore} / 100 criteria score
                            </span>
                          </div>

                          <span className="text-xs text-[#7A6B5D] font-medium">
                            {item.category} · {item.area}
                          </span>
                        </div>

                        {/* Verified Criteria Met Chips */}
                        {match.criteriaMet && match.criteriaMet.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {match.criteriaMet.map((crit, cIdx) => (
                              <span
                                key={cIdx}
                                className="text-[11px] font-medium bg-[#E8EFEA] text-[#1B3B2B] px-2 py-0.5 rounded-md flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3 text-[#2D5A43]" aria-hidden="true" />
                                {crit}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Gemini Tailored Explanation */}
                        <div className="bg-[#FAF7F2] p-3 rounded-xl border-l-3 border-[#1B3B2B] text-xs text-[#3E352B] leading-relaxed">
                          <span className="font-bold text-[#1B3B2B] block mb-0.5">
                            Why this fits your corner:
                          </span>
                          <p>{match.matchReason}</p>
                        </div>

                        {/* Item Card Preview */}
                        <div className="flex flex-col sm:flex-row gap-3.5 items-start sm:items-center">
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="w-full sm:w-28 h-24 rounded-xl object-cover shrink-0 border border-[#EAE2D5]"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-serif font-bold text-base text-[#1B3B2B] leading-snug truncate">
                              {item.title}
                            </h3>
                            <p className="text-xs text-[#6C5E50] line-clamp-2 mt-1">
                              {item.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px]">
                              {isEvent && (
                                <span className="flex items-center gap-1 font-semibold text-[#C85A32] bg-[#FDEDE8] px-2 py-0.5 rounded-md">
                                  <Calendar className="w-3 h-3" aria-hidden="true" />
                                  <span>{match.verifiedFacts.dateTime}</span>
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-[#6C5E50] bg-[#F2ECE3] px-2 py-0.5 rounded-md truncate">
                                <MapPin className="w-3 h-3" aria-hidden="true" />
                                <span>{item.location}</span>
                              </span>
                              <span className="text-[#6C5E50] bg-[#F2ECE3] px-2 py-0.5 rounded-md">
                                Transit:{' '}
                                {match.verifiedFacts.transit === 'Not confirmed' && activeConstraints?.carFreeRequired
                                  ? 'Not confirmed (verify route)'
                                  : match.verifiedFacts.transit}
                              </span>
                              <span className="text-[#6C5E50] bg-[#F2ECE3] px-2 py-0.5 rounded-md">
                                Wheelchair:{' '}
                                {match.verifiedFacts.wheelchair === 'Not confirmed' && activeConstraints?.wheelchairRequired
                                  ? 'Not confirmed (verify with host)'
                                  : match.verifiedFacts.wheelchair}
                              </span>
                              <span className="text-[#6C5E50] bg-[#F2ECE3] px-2 py-0.5 rounded-md">
                                Cost:{' '}
                                {match.verifiedFacts.costStatus === 'not_confirmed' ||
                                match.verifiedFacts.cost === 'Not confirmed'
                                  ? 'Not confirmed (verify with host)'
                                  : match.verifiedFacts.cost}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#F2ECE3]">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectCorner(item);
                            }}
                            className="text-xs font-bold text-[#1B3B2B] hover:text-[#C85A32] transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#1B3B2B] rounded-lg p-1"
                          >
                            <span>View Full Details</span>
                            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>

                          {isEvent && (
                            <button
                              type="button"
                              onClick={() => onToggleInterest(item.id)}
                              aria-pressed={Boolean(item.userIsInterested)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-[#1B3B2B] ${
                                item.userIsInterested
                                  ? 'bg-[#C85A32] text-white shadow-xs'
                                  : 'bg-[#F2ECE3] text-[#4A4036] hover:bg-[#E7DFD2] border border-[#DDD4C7]'
                              }`}
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${
                                  item.userIsInterested ? 'fill-current scale-110' : ''
                                }`}
                                aria-hidden="true"
                              />
                              <span>
                                {item.userIsInterested ? 'Going' : 'Interested'} (
                                {item.currentInterested})
                              </span>
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                /* Case B: No matches found */
                <div className="bg-white rounded-2xl p-6 text-center border border-[#E0D7C9] space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#FFF9E6] text-[#C85A32] flex items-center justify-center mx-auto">
                    <HelpCircle className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#1B3B2B]">
                      No Direct Matches Found
                    </h3>
                    <p className="text-xs sm:text-sm text-[#6C5E50] mt-2 max-w-md mx-auto leading-relaxed">
                      {noMatchExplanation ||
                        'None of the current micro-gatherings or lifestyle posts fit these exact constraints. Because Tiny Corner is powered by our student community, you can organize it yourself!'}
                    </p>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 text-xs font-bold text-[#1B3B2B] bg-[#EAE2D5] hover:bg-[#DDD3C3] rounded-xl transition-colors"
                    >
                      Refine Request
                    </button>

                    <button
                      type="button"
                      onClick={handleStartCornerFromQuery}
                      className="px-4 py-2 text-xs font-bold text-white bg-[#1B3B2B] hover:bg-[#132A1F] rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#F4C462]" aria-hidden="true" />
                      <span>Create This Corner with Gemini AI</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Footer action */}
              <div className="pt-3 border-t border-[#D5C9B7] flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-[#7A6B5D] hover:text-[#1F2922]"
                >
                  ← Search something else
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold text-[#3E352B] bg-[#EAE2D5] hover:bg-[#DDD3C3] rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
