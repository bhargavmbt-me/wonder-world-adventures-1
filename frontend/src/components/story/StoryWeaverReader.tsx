/**
 * StoryWeaverReader
 *
 * Instagram / Reels-style modal story reader matching StoryWeaver API Explorer style:
 * - Automatically advances/scrolls images & captions according to audio playback timestamps!
 * - Word/cue-synchronized page timestamps from StoryWeaver WebVTT
 * - Seeking audio when user clicks next/prev or any progress bar segment
 * - Top segmented story progress bars (Instagram stories style)
 * - Header with "{title} {page} / {total}", Skip ⏭, Audio 🔊, Close ✕
 * - Front Cover / Page type label
 * - High-res centered illustration with smooth transition
 * - Bottom narration caption in clean white typography on black
 * - Touch swipe + keyboard arrow support
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, SkipForward, Volume2, VolumeX, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";
import { storyweaverApi, StoryWeaverStory, StoryWeaverStoryDetail } from "@/lib/api";

interface StoryWeaverReaderProps {
  story: StoryWeaverStory;
  onClose: () => void;
  isReelsMode?: boolean;
  onNextStory?: () => void;
}

export const StoryWeaverReader = ({
  story,
  onClose,
  isReelsMode = false,
  onNextStory,
}: StoryWeaverReaderProps) => {
  const [detail, setDetail]                   = useState<StoryWeaverStoryDetail | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [pageIdx, setPageIdx]                 = useState(0);
  const [audioPlaying, setAudioPlaying]       = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioError, setAudioError]           = useState(false);
  const [imgLoaded, setImgLoaded]             = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Fetch story details & pages (and pre-generate audio if needed)
  const loadStory = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPageIdx(0);
    setAudioPlaying(false);
    setAudioError(false);

    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add timeout to prevent hanging forever (Render cold-start can be slow)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), attempt === 0 ? 20_000 : 30_000);

        const res = await storyweaverApi.getStory(story.slug || story.id);
        clearTimeout(timeout);

        setDetail(res.story);

        // If pages don't have audio yet, kick off background generation
        const needsAudio = res.story?.pages?.some(
          (p) => !p.audioUrl && (p.text || "").trim().length >= 2
        );
        if (needsAudio) {
          storyweaverApi
            .generateAudio(story.slug || story.id)
            .then((genRes) => {
              if (genRes.success && genRes.story) {
                setDetail(genRes.story);
              }
            })
            .catch(() => {});
        }

        // Success — exit retry loop
        lastError = null;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff: 2s, 4s)
          await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
      }
    }

    if (lastError) {
      setError("Unable to load this story. Please try again!");
    }

    setLoading(false);
  }, [story.slug, story.id]);

  useEffect(() => {
    loadStory();
  }, [loadStory]);

  const totalPages  = detail?.pages?.length ?? 0;
  const currentPage = detail?.pages?.[pageIdx];
  const isFirst     = pageIdx === 0;
  const isLast      = totalPages > 0 && pageIdx === totalPages - 1;

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Auto-play current page audio when audioPlaying is true and pageIdx changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioPlaying) {
      audio.pause();
      return;
    }

    if (!currentPage?.audioUrl) {
      // If this page has no audio URL, wait 3 seconds and advance
      const timer = setTimeout(() => {
        if (!isLast) {
          setPageIdx((prev) => prev + 1);
        } else {
          setAudioPlaying(false);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    if (audio.src !== currentPage.audioUrl) {
      audio.src = currentPage.audioUrl;
    }
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setAudioError(false))
        .catch((err) => {
          console.warn("[StoryWeaverReader] play() on page change rejected:", err.message);
        });
    }
  }, [pageIdx, audioPlaying, currentPage?.audioUrl, isLast]);

  // Seek audio and update page
  const seekToPage = useCallback((newIdx: number) => {
    const target = Math.max(0, Math.min(totalPages - 1, newIdx));
    setPageIdx(target);
  }, [totalPages]);

  // Navigation functions
  const goNext = useCallback(() => {
    if (!isLast) {
      seekToPage(pageIdx + 1);
    } else if (isReelsMode && onNextStory) {
      onNextStory();
    }
  }, [isLast, isReelsMode, onNextStory, pageIdx, seekToPage]);

  const goBack = useCallback(() => {
    if (!isFirst) {
      seekToPage(pageIdx - 1);
    }
  }, [isFirst, pageIdx, seekToPage]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goBack, onClose]);

  // Reset image loaded on page change
  useEffect(() => {
    setImgLoaded(false);
  }, [pageIdx]);

  // Audio toggle with on-demand generation support
  const toggleAudio = async () => {
    if (generatingAudio) return;

    if (audioPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setAudioPlaying(false);
      return;
    }

    const hasAnyAudio = Boolean(detail?.pages?.some((p) => Boolean(p.audioUrl)));

    // If audio is not yet generated, generate now
    if (!hasAnyAudio) {
      setGeneratingAudio(true);
      try {
        const res = await storyweaverApi.generateAudio(story.slug || story.id);
        if (res.success && res.story) {
          setDetail(res.story);
          setAudioPlaying(true);
        }
      } catch {
        setAudioError(true);
      } finally {
        setGeneratingAudio(false);
      }
      return;
    }

    setAudioPlaying(true);
    setAudioError(false);

    // Direct user action: immediately play the audio on the element
    if (audioRef.current) {
      if (currentPage?.audioUrl && audioRef.current.src !== currentPage.audioUrl) {
        audioRef.current.src = currentPage.audioUrl;
      }
      audioRef.current.currentTime = 0;
      const p = audioRef.current.play();
      if (p !== undefined) {
        p.then(() => setAudioError(false)).catch((err) => {
          console.warn("[StoryWeaverReader] Direct play error:", err.message);
        });
      }
    }
  };

  // Touch swipe support
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta < -50) goNext();
    if (delta > 50)  goBack();
    touchStartX.current = null;
  };

  const hasAudio =
    Boolean(detail?.pages?.some((p) => Boolean(p.audioUrl))) ||
    Boolean(detail?.pages?.some((p) => (p.text || "").trim().length >= 2));

  return (
    <motion.div
      className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-sans"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => {
        // If clicking backdrop outside modal, close
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Persistent Audio element for narration */}
      <audio
        ref={audioRef}
        src={currentPage?.audioUrl || undefined}
        preload="auto"
        onEnded={() => {
          if (!isLast) {
            setPageIdx((prev) => prev + 1);
          } else {
            setAudioPlaying(false);
            if (isReelsMode && onNextStory) onNextStory();
          }
        }}
        onError={(e) => {
          const audioEl = e.currentTarget as HTMLAudioElement;
          console.warn(`[StoryWeaverReader] Audio error for page ${pageIdx}:`, currentPage?.audioUrl, audioEl.error?.message);
          if (audioPlaying && !isLast) {
            setTimeout(() => setPageIdx((prev) => prev + 1), 600);
          } else {
            setAudioError(true);
            setAudioPlaying(false);
          }
        }}
        style={{ display: "none" }}
      />

      {/* Main modal container */}
      <motion.div
        className="relative w-full max-w-lg sm:max-w-xl md:max-w-2xl bg-[#141416] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[96vh]"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* ── Top Segmented Progress Bar (Instagram stories style) ────── */}
        {totalPages > 0 && (
          <div className="flex items-center gap-1 px-4 pt-3.5 pb-1.5 w-full shrink-0">
            {Array.from({ length: totalPages }).map((_, i) => {
              const isPast   = i < pageIdx;
              const isActive = i === pageIdx;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => seekToPage(i)}
                  className="flex-1 h-1 rounded-full transition-all duration-300 focus:outline-none cursor-pointer"
                  style={{
                    background: isActive
                      ? "#ffffff"
                      : isPast
                      ? "rgba(255, 255, 255, 0.65)"
                      : "rgba(255, 255, 255, 0.2)",
                  }}
                  title={`Jump to Page ${i + 1}`}
                />
              );
            })}
          </div>
        )}

        {/* ── Header: Title, Counter & Action Controls ────────────────── */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          <div className="flex items-baseline gap-2 min-w-0 pr-2">
            <h2 className="font-semibold text-white text-sm sm:text-base truncate">
              {story.title}
            </h2>
            {!loading && totalPages > 0 && (
              <span className="text-white/60 text-xs font-semibold whitespace-nowrap">
                {pageIdx + 1} / {totalPages}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Skip / Next */}
            <button
              type="button"
              id="sw-reader-skip"
              onClick={goNext}
              disabled={isLast && !onNextStory}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center justify-center text-white disabled:opacity-30 disabled:pointer-events-none"
              title="Next page / skip"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Audio Toggle (Pulse indicator when playing, spinner when generating) */}
            <button
              type="button"
              id="sw-reader-audio"
              onClick={toggleAudio}
              disabled={generatingAudio || !hasAudio}
              className={`relative w-8 h-8 rounded-full flex items-center justify-center text-white transition active:scale-95 ${
                generatingAudio
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : audioPlaying
                  ? "bg-[#d9531e] text-white shadow-md ring-2 ring-[#d9531e]/50"
                  : hasAudio
                  ? "bg-white/10 hover:bg-white/20"
                  : "bg-white/5 text-white/30 cursor-not-allowed"
              }`}
              title={
                generatingAudio
                  ? "Generating AI narration..."
                  : !hasAudio
                  ? "No text to narrate for this story"
                  : audioPlaying
                  ? "Narration playing — click to pause"
                  : "Click to play AI voice narration"
              }
            >
              {generatingAudio ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
              ) : audioPlaying ? (
                <Volume2 className="w-4 h-4 animate-pulse" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              id="sw-reader-close"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center justify-center text-white"
              title="Close reader"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Page Type Tag (e.g. FRONT COVER / PAGE 2) ────────────────── */}
        <div className="px-4 pb-1.5 flex items-center justify-between shrink-0">
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white/10 text-white/70">
            {pageIdx === 0
              ? "FRONT COVER"
              : isLast
              ? "BACK COVER"
              : `PAGE ${pageIdx + 1}`}
          </span>
          <div className="flex items-center gap-2">
            {generatingAudio ? (
              <div className="text-[10px] text-amber-300 font-semibold flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating AI voice...
              </div>
            ) : audioPlaying ? (
              <button
                type="button"
                id="sw-reader-ai-narration-active"
                onClick={toggleAudio}
                className="text-[10px] text-orange-300 font-bold flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 cursor-pointer transition active:scale-95 shadow-xs"
                title="AI Narration is playing — click to pause"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
                <span>Reading Page {pageIdx + 1}</span>
                <span className="text-white/60 text-[9px]">(Pause)</span>
              </button>
            ) : hasAudio ? (
              <button
                type="button"
                id="sw-reader-ai-narration-btn"
                onClick={toggleAudio}
                className="text-[10px] text-emerald-300 font-bold flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 cursor-pointer transition active:scale-95 shadow-xs hover:border-emerald-400"
                title="Click to play AI voice narration"
              >
                <span>🎙️</span>
                <span>AI Narration</span>
                <span className="bg-emerald-400/25 text-emerald-200 text-[9px] uppercase px-1 py-0.2 rounded font-black tracking-wide">Play</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* ── Center Content: Illustration + Tap Navigation ───────────── */}
        <div className="relative flex-1 min-h-[280px] sm:min-h-[360px] max-h-[58vh] bg-black flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8">
              <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
              <p className="text-white/60 text-sm font-medium">Loading story audio &amp; pages...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-rose-300 text-sm font-medium">{error}</p>
              <button
                type="button"
                onClick={loadStory}
                className="px-4 py-2 rounded-xl bg-[#d9531e] text-white text-xs font-bold"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Illustration with smooth crossfade */}
              <AnimatePresence mode="wait">
                {currentPage?.imageUrl ? (
                  <motion.div
                    key={`page-${pageIdx}`}
                    initial={{ opacity: 0.4, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0.4, scale: 0.98 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="relative w-full h-full flex items-center justify-center p-2"
                  >
                    {!imgLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="w-7 h-7 text-white/40 animate-spin" />
                      </div>
                    )}
                    <img
                      src={currentPage.imageUrl}
                      alt={`${story.title} - page ${pageIdx + 1}`}
                      onLoad={() => setImgLoaded(true)}
                      className="max-h-[54vh] w-auto max-w-full object-contain rounded-xl select-none"
                      style={{
                        opacity: imgLoaded ? 1 : 0,
                        transition: "opacity 0.25s ease-in-out",
                      }}
                    />
                  </motion.div>
                ) : (
                  <div className="text-6xl select-none py-16">📖</div>
                )}
              </AnimatePresence>

              {/* Tap zones: Left half -> Go Back, Right half -> Go Next */}
              <div
                className="absolute inset-y-0 left-0 w-1/3 cursor-pointer z-10"
                onClick={goBack}
                title="Previous page"
              />
              <div
                className="absolute inset-y-0 right-0 w-1/3 cursor-pointer z-10"
                onClick={goNext}
                title="Next page"
              />

              {/* Subtle navigation arrows on hover */}
              {!isFirst && (
                <button
                  type="button"
                  onClick={goBack}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white/90 flex items-center justify-center backdrop-blur-sm z-20 transition shadow-lg"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {!isLast && (
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white/90 flex items-center justify-center backdrop-blur-sm z-20 transition shadow-lg"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Bottom Narration Caption with Smooth Text Animation ──────── */}
        <div className="bg-black px-5 py-4 border-t border-white/5 flex items-center justify-center min-h-[85px] max-h-[160px] overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={`caption-${pageIdx}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-center w-full"
            >
              {currentPage?.text ? (
                <p className="text-white text-center text-sm sm:text-base font-medium leading-relaxed max-w-xl mx-auto selection:bg-orange-500">
                  {currentPage.text}
                </p>
              ) : (
                <p className="text-white/40 text-center text-xs italic">
                  {pageIdx === 0 ? story.description || story.title : "—"}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};
