/**
 * StoryWeaverSection
 *
 * StoryWeaver API Explorer UI matching the user's reference screenshots:
 * - Clean, warm off-white / light cream theme (#faf8f5)
 * - Header: "StoryWeaver API Explorer" + live test harness subtitle
 * - Filter form card: Page, Fetch size, Search, Language, Category, Search orange CTA
 * - Pills bar: [🔊 Audio] [🖼 Images] [GIF] [All], and right-aligned [▶ Start Reels Feed]
 * - Live stats summary bar
 * - 4-column card grid with badges (RECOMMENDED, EDITOR'S PICK, AUDIO, GIF)
 * - Detail view (expanded card or modal) with author, illustrator, publisher, reads/likes,
 *   award banner, collapsible raw JSON, "▶ Play as Story" button, and StoryWeaver link
 * - Opens StoryWeaverReader modal on "Play as Story" or "Start Reels Feed"
 */

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2, Image as ImageIcon, Sparkles, Play, Search,
  ExternalLink, ChevronDown, ChevronRight, X, Loader2, Award, Database,
} from "lucide-react";
import { storyweaverApi, StoryWeaverStory, StoryWeaverDbStats } from "@/lib/api";
import { StoryWeaverReader } from "./StoryWeaverReader";
import AdSlot from "@/components/ads/AdSlot";

type FilterTab = "Audio" | "Images" | "GIF" | "All";

const LANGUAGES = [
  "Any language",
  "English",
  "Hindi",
  "Urdu",
  "Malayalam",
  "Tamil",
  "Telugu",
  "Kannada",
  "Marathi",
  "Gujarati",
  "Bengali",
  "Punjabi",
  "Odia",
  "Assamese",
  "Sanskrit",
  "Arabic",
];

const CATEGORIES = [
  "Any category",
  "Fiction",
  "Non-fiction",
  "Adventure",
  "Nature",
  "Animals",
  "Family & Friends",
  "Level 1",
  "Level 2",
  "Level 3",
  "Level 4",
];

export const StoryWeaverSection = () => {
  // Input states
  const [pageInput, setPageInput]           = useState("1");
  const [fetchSizeInput, setFetchSizeInput] = useState("24");
  const [searchInput, setSearchInput]       = useState("");
  const [languageInput, setLanguageInput]   = useState("Any language");
  const [categoryInput, setCategoryInput]   = useState("Any category");

  // Active filter tab (Audio, Images, GIF, All)
  const [activeTab, setActiveTab] = useState<FilterTab>("Audio");

  // Data states
  const [stories, setStories]               = useState<StoryWeaverStory[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [totalBooks, setTotalBooks]         = useState(10000);
  const [currentPage, setCurrentPage]       = useState(1);
  const [totalPages, setTotalPages]         = useState(417);

  // Selected story for detail view
  const [selectedStory, setSelectedStory]   = useState<StoryWeaverStory | null>(null);
  const [showRawJson, setShowRawJson]       = useState(false);

  // Reader modal state
  const [activeReaderStory, setActiveReaderStory] = useState<StoryWeaverStory | null>(null);
  const [isReelsMode, setIsReelsMode]             = useState(false);

  // Database storage states (default to verified database stories)
  const [sourceMode, setSourceMode]               = useState<"all" | "database">("database");
  const [dbStats, setDbStats]                     = useState<StoryWeaverDbStats | null>(null);
  const [isSyncing, setIsSyncing]                 = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg]       = useState<string | null>(null);

  // Load database statistics
  const refreshStats = useCallback(async () => {
    try {
      const res = await storyweaverApi.getDbStats();
      if (res.success) setDbStats(res.stats);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Combine predefined languages with any synced languages present in the database
  const availableLanguages = useMemo(() => {
    const dbLangs = (dbStats?.languages || []).map((l) => l.language).filter(Boolean);
    return Array.from(new Set([...LANGUAGES, ...dbLangs]));
  }, [dbStats]);

  // Fetch stories
  const fetchStories = useCallback(async (
    page = 1,
    limit = 24,
    query = "",
    language = "Any language",
    category = "Any category",
    source = sourceMode
  ) => {
    setLoading(true);
    setError(null);

    // Map level if Category is Level 1..4
    let level: number | undefined;
    let effectiveCategory: string | undefined;

    if (category.startsWith("Level ")) {
      level = Number(category.replace("Level ", ""));
    } else if (category !== "Any category") {
      effectiveCategory = category;
    }

    try {
      const res = await storyweaverApi.listStories({
        page,
        limit,
        query:     query.trim() || undefined,
        language:  language !== "Any language" ? language : undefined,
        level,
        category:  effectiveCategory,
        source:    source === "database" ? "database" : undefined,
        audioOnly: (activeTab === "Audio" && (!language || language === "Any language")) || source === "database",
      });

      setStories(res.stories);
      setTotalBooks(res.total || (source === "database" ? res.stories.length : 10000));
      setCurrentPage(res.page || page);
      setTotalPages(res.totalPages || Math.ceil((res.total || 10000) / limit));
    } catch {
      setError("Failed to load stories. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [sourceMode, activeTab]);

  // Initial load
  useEffect(() => {
    fetchStories(1, 24, "", "Any language", "Any category", sourceMode);
  }, [fetchStories, sourceMode]);

  // Trigger on-demand sync of next 20 audio stories into DB
  const handleTriggerSync = async (count = 20) => {
    setIsSyncing(true);
    setSyncSuccessMsg(null);
    try {
      const res = await storyweaverApi.syncAudios(count);
      if (res.success) {
        setSyncSuccessMsg(`Successfully synced ${res.result.successCount} audio stories into database!`);
        await refreshStats();
        if (sourceMode === "database") {
          fetchStories(1, parseInt(fetchSizeInput, 10) || 24, searchInput, languageInput, categoryInput, "database");
        }
      }
    } catch {
      setSyncSuccessMsg("Sync encountered an issue. Please try again.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncSuccessMsg(null), 6000);
    }
  };

  // Handle Search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const pg = Math.max(1, parseInt(pageInput, 10) || 1);
    const sz = Math.min(50, Math.max(1, parseInt(fetchSizeInput, 10) || 24));
    fetchStories(pg, sz, searchInput, languageInput, categoryInput, sourceMode);
  };

  // Filter stories client-side based on activeTab
  const filteredStories = useMemo(() => {
    if (activeTab === "Audio") {
      return stories.filter((s) => s.isAudio);
    }
    if (activeTab === "GIF") {
      return stories.filter((s) => s.isGif);
    }
    if (activeTab === "Images") {
      return stories.filter((s) => Boolean(s.coverImage));
    }
    return stories;
  }, [stories, activeTab]);

  // Start reels feed
  const handleStartReels = () => {
    const pool = filteredStories.length > 0 ? filteredStories : stories;
    if (pool.length > 0) {
      setActiveReaderStory(pool[0]);
      setIsReelsMode(true);
    }
  };

  // Next story in reels feed
  const handleNextReelsStory = () => {
    if (!activeReaderStory) return;
    const pool = filteredStories.length > 0 ? filteredStories : stories;
    const idx = pool.findIndex((s) => s.id === activeReaderStory.id);
    if (idx !== -1 && idx + 1 < pool.length) {
      setActiveReaderStory(pool[idx + 1]);
    } else if (pool.length > 0) {
      setActiveReaderStory(pool[0]);
    }
  };

  return (
    <div className="w-full bg-[#faf8f5] text-[#1c1917] font-sans antialiased">
      {/* ── Active Reader Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {activeReaderStory && (
          <StoryWeaverReader
            story={activeReaderStory}
            onClose={() => {
              setActiveReaderStory(null);
              setIsReelsMode(false);
            }}
            isReelsMode={isReelsMode}
            onNextStory={handleNextReelsStory}
          />
        )}
      </AnimatePresence>

      {/* ── Selected Story Detail Modal (Screenshot 3 style) ───────────── */}
      <AnimatePresence>
        {selectedStory && (
          <motion.div
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedStory(null);
                setShowRawJson(false);
              }
            }}
          >
            <motion.div
              className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col"
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedStory(null);
                  setShowRawJson(false);
                }}
                className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5">
                {/* Cover Image + Overlaid Badges */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-stone-100">
                  {selectedStory.coverImage ? (
                    <img
                      src={selectedStory.coverImage}
                      alt={selectedStory.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-7xl">
                      📖
                    </div>
                  )}

                  {/* Overlaid Badges */}
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
                    {selectedStory.recommended && (
                      <span className="bg-white/95 text-stone-900 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full border border-stone-200 shadow-sm">
                        RECOMMENDED
                      </span>
                    )}
                    {selectedStory.editorsPick && (
                      <span className="bg-[#d9531e] text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                        EDITOR'S PICK
                      </span>
                    )}
                    {selectedStory.isAudio && (
                      <span className="bg-[#2a7a5f] text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        <Volume2 className="w-3 h-3" /> AUDIO
                      </span>
                    )}
                    {selectedStory.isGif && (
                      <span className="bg-stone-600 text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                        GIF
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Metadata Pills */}
                <div>
                  <h2 className="text-xl font-bold text-stone-900 leading-snug">
                    {selectedStory.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="bg-stone-100 text-stone-700 text-xs font-semibold px-2 py-0.5 rounded-md">
                      {selectedStory.language || "English"}
                    </span>
                    <span className="bg-stone-100 text-stone-700 text-xs font-semibold px-2 py-0.5 rounded-md">
                      Level {selectedStory.level || "1"}
                    </span>
                    <span className="bg-stone-100 text-stone-700 text-xs font-semibold px-2 py-0.5 rounded-md">
                      #{selectedStory.id}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {selectedStory.description && (
                  <p className="text-stone-700 text-xs sm:text-sm leading-relaxed">
                    {selectedStory.description}
                  </p>
                )}

                {/* Author & Illustrator */}
                <div className="text-xs text-stone-600 space-y-1 pt-1 border-t border-stone-100">
                  {selectedStory.authors?.length > 0 && (
                    <p>
                      <span className="font-semibold text-stone-900">Author:</span>{" "}
                      {selectedStory.authors.join(", ")}
                    </p>
                  )}
                  {selectedStory.illustrators?.length > 0 && (
                    <p>
                      <span className="font-semibold text-stone-900">Illustrator:</span>{" "}
                      {selectedStory.illustrators.join(", ")}
                    </p>
                  )}
                  {selectedStory.publisher && (
                    <p className="flex items-center gap-1">
                      <span>📚</span>
                      <span className="font-medium text-stone-800">
                        {selectedStory.publisher}
                      </span>
                    </p>
                  )}
                  <p className="text-stone-500 pt-0.5">
                    👁 {selectedStory.readsCount.toLocaleString()} reads · ❤️{" "}
                    {selectedStory.likesCount.toLocaleString()} likes
                  </p>
                </div>

                {/* Awards Highlight Box */}
                {selectedStory.awards && selectedStory.awards.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 flex items-start gap-2">
                    <span className="text-base">🏆</span>
                    <p className="text-xs text-amber-950 font-medium leading-snug">
                      {selectedStory.awards[0]}
                    </p>
                  </div>
                )}

                {/* Collapsible: Raw JSON */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRawJson((prev) => !prev)}
                    className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 transition font-medium"
                  >
                    {showRawJson ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    Raw JSON for this record
                  </button>
                  {showRawJson && (
                    <pre className="mt-2 p-3 bg-stone-900 text-stone-200 text-[11px] rounded-xl overflow-x-auto max-h-48">
                      {JSON.stringify(selectedStory.raw || selectedStory, null, 2)}
                    </pre>
                  )}
                </div>

                {/* Primary CTA: Play as Story */}
                <button
                  type="button"
                  id={`play-story-${selectedStory.id}`}
                  onClick={() => {
                    const storyToPlay = selectedStory;
                    setSelectedStory(null);
                    setShowRawJson(false);
                    setActiveReaderStory(storyToPlay);
                    setIsReelsMode(false);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#d9531e] hover:bg-[#b84a0d] active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Play className="w-4 h-4 fill-white" /> Play as Story
                </button>

                {/* Secondary Links: Details & StoryWeaver page */}
                <div className="flex items-center justify-between pt-1 text-xs text-stone-500 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setShowRawJson((p) => !p)}
                    className="hover:text-stone-800 transition font-medium"
                  >
                    Details ▾
                  </button>
                  <a
                    href={`https://storyweaver.org.in/stories/${selectedStory.slug || selectedStory.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-stone-800 transition font-medium"
                  >
                    StoryWeaver page <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
          Illustrated Stories &amp; Narration
        </h1>
        <p className="text-stone-500 text-xs sm:text-sm mt-1">
          Explore thousands of illustrated children's books with natural voice narration.
        </p>
      </div>

      {/* ── Top Control & Search Bar ──────────────────────────────────── */}
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-wrap items-end gap-3.5 mb-5"
      >
        {/* Page */}
        <div className="w-16 sm:w-20">
          <label className="block text-xs font-semibold text-stone-600 mb-1">
            Page
          </label>
          <input
            id="sw-form-page"
            type="number"
            min="1"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            style={{ backgroundColor: "#ffffff", color: "#1c1917" }}
            className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#d9531e]/30 focus:border-[#d9531e]"
          />
        </div>

        {/* Fetch size */}
        <div className="w-20 sm:w-24">
          <label className="block text-xs font-semibold text-stone-600 mb-1">
            Fetch size
          </label>
          <input
            id="sw-form-fetch-size"
            type="number"
            min="1"
            max="50"
            value={fetchSizeInput}
            onChange={(e) => setFetchSizeInput(e.target.value)}
            style={{ backgroundColor: "#ffffff", color: "#1c1917" }}
            className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#d9531e]/30 focus:border-[#d9531e]"
          />
        </div>

        {/* Search Input */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-semibold text-stone-600 mb-1">
            Search
          </label>
          <input
            id="sw-form-search"
            type="text"
            placeholder="title, e.g. elephant"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ backgroundColor: "#ffffff", color: "#1c1917" }}
            className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#d9531e]/30 focus:border-[#d9531e]"
          />
        </div>

        {/* Language */}
        <div className="w-36 sm:w-44">
          <label className="block text-xs font-semibold text-stone-600 mb-1">
            Language
          </label>
          <div className="relative">
            <select
              id="sw-form-language"
              value={languageInput}
              onChange={(e) => {
                const newLang = e.target.value;
                setLanguageInput(newLang);
                fetchStories(1, parseInt(fetchSizeInput, 10) || 24, searchInput, newLang, categoryInput, sourceMode);
              }}
              style={{ backgroundColor: "#ffffff", color: "#1c1917" }}
              className="w-full appearance-none px-3 py-2 pr-8 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#d9531e]/30 focus:border-[#d9531e] cursor-pointer"
            >
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          </div>
        </div>

        {/* Category */}
        <div className="w-36 sm:w-44">
          <label className="block text-xs font-semibold text-stone-600 mb-1">
            Category
          </label>
          <div className="relative">
            <select
              id="sw-form-category"
              value={categoryInput}
              onChange={(e) => {
                const newCat = e.target.value;
                setCategoryInput(newCat);
                fetchStories(1, parseInt(fetchSizeInput, 10) || 24, searchInput, languageInput, newCat, sourceMode);
              }}
              style={{ backgroundColor: "#ffffff", color: "#1c1917" }}
              className="w-full appearance-none px-3 py-2 pr-8 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#d9531e]/30 focus:border-[#d9531e] cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          </div>
        </div>

        {/* Submit Search Button */}
        <div>
          <button
            type="submit"
            id="sw-form-search-btn"
            disabled={loading}
            className="px-6 py-2 rounded-xl bg-[#c85a17] hover:bg-[#b84a0d] active:scale-95 text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-1.5 h-[38px] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Search"
            )}
          </button>
        </div>
      </form>

      {/* ── Filter Pills & Reels Action Bar ──────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Pills: Audio, Images, GIF, All */}
        <div className="flex items-center gap-2">
          {(
            [
              { key: "Audio" as FilterTab, label: "Audio", icon: Volume2 },
              { key: "Images" as FilterTab, label: "Images", icon: ImageIcon },
              { key: "GIF" as FilterTab, label: "GIF", icon: undefined },
              { key: "All" as FilterTab, label: "All", icon: undefined },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                id={`sw-tab-${tab.key.toLowerCase()}`}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                  active
                    ? "bg-stone-900 text-white shadow-sm"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Button: Start Reels Feed */}
        <button
          type="button"
          id="sw-start-reels-btn"
          onClick={handleStartReels}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#d9531e] hover:bg-[#b84a0d] active:scale-95 text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-white" /> Start Reels Feed
        </button>
      </div>

      {/* ── Summary & Match Stats ────────────────────────────────────── */}
      <div className="space-y-1 mb-5 text-xs sm:text-sm text-stone-600">
        <p>
          {loading ? (
            <span className="flex items-center gap-2 text-stone-500 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d9531e]" />
              Loading books via{" "}
              <code className="bg-stone-200/80 px-1 py-0.5 rounded text-[11px] font-mono text-stone-800">
                /api/v1/books-search
              </code>
              ...
            </span>
          ) : (
            <>
              Loaded {stories.length} book(s) via{" "}
              <code className="bg-stone-200/80 px-1 py-0.5 rounded text-[11px] font-mono text-stone-800">
                /api/v1/books-search
              </code>{" "}
              — showing {filteredStories.length} filtered as &ldquo;{activeTab}&rdquo;.
            </>
          )}
        </p>
        <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
          <span>
            {totalBooks.toLocaleString()} total books · page {currentPage} of {totalPages}
          </span>
          {!loading && (
            <span>
              {filteredStories.length} of {stories.length} fetched match &ldquo;{activeTab}&rdquo;
            </span>
          )}
        </div>
      </div>

      {/* ── Stories Card Grid ────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl overflow-hidden border border-stone-200 animate-pulse"
            >
              <div className="aspect-square bg-stone-200" />
              <div className="p-3.5 space-y-2">
                <div className="h-4 bg-stone-200 rounded w-3/4" />
                <div className="flex gap-2">
                  <div className="h-3 bg-stone-200 rounded w-12" />
                  <div className="h-3 bg-stone-200 rounded w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl p-10 border border-stone-200 text-center space-y-3">
          <p className="text-stone-700 font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => fetchStories(1, 24, searchInput, languageInput, categoryInput)}
            className="px-5 py-2 rounded-xl bg-[#d9531e] text-white font-bold text-xs"
          >
            Try Again
          </button>
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-stone-200 text-center space-y-2">
          <p className="text-lg font-bold text-stone-800">No stories found</p>
          <p className="text-xs sm:text-sm text-stone-500">
            Try adjusting your search query, language, or active filter tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredStories.map((story, index) => (
            <Fragment key={story.id}>
              <div
                id={`sw-card-${story.id}`}
                onClick={() => {
                  setSelectedStory(story);
                  setShowRawJson(false);
                }}
                className="group bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer"
              >
                {/* Cover Image + Overlaid Badges */}
                <div className="relative aspect-square w-full overflow-hidden bg-stone-100">
                  {story.coverImage ? (
                    <img
                      src={story.coverImage}
                      alt={story.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      📖
                    </div>
                  )}

                  {/* Overlaid Badges (Screenshot 1 & 3 style) */}
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
                    {story.recommended && (
                      <span className="bg-white/95 text-stone-900 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full border border-stone-200 shadow-sm">
                        RECOMMENDED
                      </span>
                    )}
                    {story.editorsPick && (
                      <span className="bg-[#d9531e] text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                        EDITOR'S PICK
                      </span>
                    )}
                    {(story.isSavedInDb || sourceMode === "database" || story.source === "database") && (
                      <span className="bg-emerald-600 text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        💾 IN DB
                      </span>
                    )}
                    {story.isAudio && (
                      <span className="bg-[#2a7a5f] text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        <Volume2 className="w-3 h-3" /> AUDIO
                      </span>
                    )}
                    {story.isGif && (
                      <span className="bg-stone-600 text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                        GIF
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer: Title & Metadata Tags */}
                <div className="p-3.5 flex flex-col gap-2">
                  <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-[#d9531e] transition-colors">
                    {story.title}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="bg-stone-100 text-stone-600 text-[11px] font-medium px-2 py-0.5 rounded">
                      {story.language || "English"}
                    </span>
                    <span className="bg-stone-100 text-stone-600 text-[11px] font-medium px-2 py-0.5 rounded">
                      Level {story.level || "1"}
                    </span>
                    <span className="bg-stone-100 text-stone-600 text-[11px] font-medium px-2 py-0.5 rounded">
                      #{story.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Between-cards advertisement slot */}
              {index === 3 && (
                <div className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 my-2">
                  <AdSlot slot="STORYWEAVER_BETWEEN_CARDS" fallbackSlot="STORIES_BETWEEN_CARDS" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      )}

      {/* ── Pagination Buttons ────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8 pt-4 border-t border-stone-200">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => {
              const prev = Math.max(1, currentPage - 1);
              setPageInput(String(prev));
              fetchStories(prev, parseInt(fetchSizeInput, 10) || 24, searchInput, languageInput, categoryInput);
            }}
            className="px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-100 disabled:opacity-40 transition"
          >
            ← Previous Page
          </button>
          <span className="text-xs text-stone-500 font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => {
              const next = Math.min(totalPages, currentPage + 1);
              setPageInput(String(next));
              fetchStories(next, parseInt(fetchSizeInput, 10) || 24, searchInput, languageInput, categoryInput);
            }}
            className="px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-100 disabled:opacity-40 transition"
          >
            Next Page →
          </button>
        </div>
      )}
    </div>
  );
};
