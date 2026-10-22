import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useChild } from "@/context/ChildContext";
import { useAuth } from "@/context/AuthContext";
import NavBar from "@/components/NavBar";
import SceneBackground from "@/components/SceneBackground";
import AmbientSoundToggle from "@/components/AmbientSoundToggle";
import QuizScreen, { QuizQuestion } from "@/components/QuizScreen";
import RewardPopup from "@/components/RewardPopup";
import StarBurst from "@/components/StarBurst";
import PremiumBadge from "@/components/PremiumBadge";
import { contentApi, ApiStory } from "@/lib/api";
import SubscribeModal from "@/components/SubscribeModal";
import AdSlot from "@/components/ads/AdSlot";
import storiesBg from "@/assets/stories-bg.jpg";
import { Star, Lock, BookMarked } from "lucide-react";
import { StoryDetails } from "@/components/story/StoryDetails";
import { StoryWeaverSection } from "@/components/story/StoryWeaverSection";

// ─── Types ────────────────────────────────────────────────────────────────────

type StoryItem = {
  id: string;
  title: string;
  author: string;
  tags: string[];
  coverEmoji: string;
  coverGradient: string;
  duration: string;
  description: string;
  content: string;
  language?: {
    id: string;
    code: string;
    name: string;
    native?: string | null;
  } | null;
  premium: boolean;
  stars: number;
  pages: string[];
  quiz: QuizQuestion[];
  thumbnailUrl?: string | null;
  backgroundUrl?: string | null;
};

const stories: StoryItem[] = [];

const normalizeApiStory = (story: ApiStory): StoryItem => {
  const pages = Array.isArray(story.pages)
    ? story.pages.filter((page): page is string => typeof page === "string")
    : story.description
    ? [story.description]
    : ["This story is ready to read."];
  const quiz = story.quiz || story.quizzes?.[0]?.questions || [];
  return {
    id: story.id,
    title: story.title,
    author: story.author || "Wonder World",
    tags: story.tags || [],
    coverEmoji: story.coverEmoji || "\u{1F4DA}\u2728",
    coverGradient: story.coverGradient || "linear-gradient(160deg, #2E2270 0%, #5B3FA6 55%, #9D6FE0 100%)",
    duration: story.duration || "8 min",
    description: story.description || pages[0],
    content: story.content || pages.join(" "),
    language: story.language,
    premium: Boolean(story.isPremium ?? story.premium),
    stars: story.starsReward ?? story.stars ?? 2,
    pages,
    quiz: quiz as QuizQuestion[],
    thumbnailUrl: story.thumbnailUrl || null,
    backgroundUrl: story.backgroundUrl || null,
  };
};

type Screen = "list" | "detail" | "read" | "quiz";
type Source = "our" | "storyweaver";

// ─── Source Selector ──────────────────────────────────────────────────────────

const SourceSelector = ({
  source,
  onSelect,
}: {
  source: Source;
  onSelect: (s: Source) => void;
}) => (
  <div
    className="flex gap-2 p-1.5 rounded-2xl mb-5"
    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
  >
    {(
      [
        { key: "our" as Source, label: "📚 Our Stories" },
        { key: "storyweaver" as Source, label: "🌍 StoryWeaver" },
      ] as const
    ).map(({ key, label }) => (
      <motion.button
        key={key}
        id={`stories-source-${key}`}
        onClick={() => onSelect(key)}
        className="flex-1 relative py-2.5 px-3 rounded-xl font-bold text-sm transition-colors"
        style={{
          color: source === key ? "#fff" : "rgba(255,255,255,0.45)",
          zIndex: 1,
        }}
        whileTap={{ scale: 0.97 }}
      >
        {source === key && (
          <motion.div
            layoutId="stories-source-pill"
            className="absolute inset-0 rounded-xl"
            style={{
              background: "linear-gradient(135deg, hsl(260,85%,58%), hsl(290,80%,64%))",
              boxShadow: "0 6px 20px rgba(124,92,191,0.5)",
              zIndex: -1,
            }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        )}
        {label}
      </motion.button>
    ))}
  </div>
);

// ─── StoriesPage ──────────────────────────────────────────────────────────────

const StoriesPage = () => {
  const { profile, addStars, addXP, addCoins, incrementStreak, completeStory, setPremium } = useChild();
  const { token } = useAuth();

  // Source tab state (default to storyweaver to showcase the explorer)
  const [source, setSource] = useState<Source>("storyweaver");

  // Our Stories state (unchanged)
  const [screen, setScreen] = useState<Screen>("list");
  const [apiStories, setApiStories] = useState<StoryItem[]>(stories);
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);
  const [showStarBurst, setShowStarBurst] = useState(false);
  const [earnedStars, setEarnedStars] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [rewardData, setRewardData] = useState({ stars: 0, xp: 0, coins: 0 });
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    contentApi
      .listStories()
      .then(({ stories }) => {
        if (mounted && stories.length) setApiStories(stories.map(normalizeApiStory));
      })
      .catch(() => {
        if (mounted) setApiStories(stories);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const openStory = (story: StoryItem) => {
    if (story.premium && !profile?.isPremium) {
      setShowSubscribeModal(true);
      return;
    }
    setActiveStory(story);
    setScreen("detail");
  };

  const goToQuiz = () => setScreen("quiz");

  const handleQuizComplete = (stars: number) => {
    if (!activeStory) return;
    const xp = stars * 20;
    const coins = stars * 8;
    if (!profile?.completedStories.includes(activeStory.id)) {
      addStars(activeStory.stars + stars);
      addXP(xp);
      addCoins(coins);
      incrementStreak();
      completeStory(activeStory.id);
      contentApi.updateProgress({
        contentType: "STORY",
        contentId: activeStory.id,
        progressPercentage: 100,
        isCompleted: true,
      }, token).catch(() => undefined);
      contentApi.claimReward({
        stars: activeStory.stars + stars,
        coins,
        xp,
        reason: `Completed story: ${activeStory.title}`,
        sourceType: "STORY",
        sourceId: activeStory.id,
      }, token).catch(() => undefined);
      setEarnedStars(activeStory.stars + stars);
      setRewardData({ stars: activeStory.stars + stars, xp, coins });
      setShowStarBurst(true);
      setTimeout(() => setShowStarBurst(false), 2500);
    }
    setShowReward(true);
  };

  // When switching source, reset Our Stories screen back to list
  const handleSourceSelect = (s: Source) => {
    setSource(s);
    if (s === "our") {
      setScreen("list");
      setActiveStory(null);
    }
  };

  // If StoryWeaver is active, render full-page clean StoryWeaver Explorer UI (no moon/ambient sound)
  if (source === "storyweaver") {
    return (
      <div className="min-h-screen bg-[#faf8f5] text-[#1c1917] font-sans antialiased">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/90 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="text-stone-600 hover:text-stone-900 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition"
              >
                ← Back to KidsPal
              </Link>
              <span className="text-stone-300">|</span>
              <span className="text-xs sm:text-sm font-bold text-stone-800 flex items-center gap-1.5">
                🌍 StoryWeaver Explorer
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="switch-to-our-stories"
                onClick={() => handleSourceSelect("our")}
                className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition flex items-center gap-1.5"
              >
                📚 Switch to Our Stories
              </button>
            </div>
          </div>
        </header>

        {/* Pure StoryWeaver Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Stories Top Ad */}
          <div className="mb-4">
            <AdSlot slot="STORYWEAVER_TOP" fallbackSlot="STORIES_TOP" />
          </div>

          <StoryWeaverSection />

          {/* Stories Bottom Ad */}
          <div className="mt-6">
            <AdSlot slot="STORYWEAVER_BOTTOM" fallbackSlot="STORIES_BOTTOM" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <SceneBackground image={storiesBg} alt="Enchanted moonlit library" variant="library" />
      <NavBar />
      <AmbientSoundToggle />
      <StarBurst show={showStarBurst} count={earnedStars} />

      <SubscribeModal
        open={showSubscribeModal}
        onClose={() => setShowSubscribeModal(false)}
        onSuccess={() => setPremium(true)}
      />

      <RewardPopup
        show={showReward}
        stars={rewardData.stars}
        xp={rewardData.xp}
        coins={rewardData.coins}
        message="Story Complete! 📚"
        onClose={() => { setShowReward(false); setScreen("list"); setActiveStory(null); }}
      />

      {/* ── Our Stories ── */}
      <AnimatePresence mode="wait">
        {screen === "list" && (
          <motion.div
            key="our-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pb-28"
          >
            {/* Header */}
            <div className="px-5 pt-20 pb-4 flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-extrabold text-white flex items-center gap-2 drop-shadow-md">
                  <BookMarked className="w-6 h-6 text-amber-300" /> Stories
                </h1>
                <p className="text-white/70 text-sm mt-1">Read, listen &amp; earn stars ⭐</p>
              </div>
              <button
                onClick={() => handleSourceSelect("storyweaver")}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition flex items-center gap-1.5"
              >
                🌍 StoryWeaver Explorer
              </button>
            </div>

            {/* Source selector */}
            <div className="px-5">
              <SourceSelector source={source} onSelect={handleSourceSelect} />
            </div>

            {/* Stories Top Promo Banner */}
            <div className="px-4 mb-4">
              <AdSlot slot="STORIES_TOP" />
            </div>

            {/* Story grid */}
            <div className="px-4 grid grid-cols-2 gap-4">
              {apiStories.map((story, i) => {
                const locked = story.premium && !profile?.isPremium;
                const completed = profile?.completedStories.includes(story.id);
                return (
                  <motion.button
                    key={story.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => openStory(story)}
                    className="relative rounded-3xl overflow-hidden text-left"
                    style={{ background: story.coverGradient, minHeight: 200 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {/* Cover image or emoji */}
                    {story.thumbnailUrl ? (
                      <img src={story.thumbnailUrl} alt={story.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="p-4 text-4xl relative z-10">{story.coverEmoji}</div>
                    )}

                    {/* Bottom info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 z-10"
                      style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)" }}>
                      <h3 className="font-display text-sm font-bold text-white leading-tight">{story.title}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
                        <span className="text-amber-300 text-xs font-bold">{story.stars}</span>
                        <span className="text-white/40 text-xs ml-1">· {story.duration}</span>
                      </div>
                    </div>

                    {/* Badges */}
                    {story.premium && <div className="absolute top-2 right-2 z-10"><PremiumBadge /></div>}
                    {completed && <div className="absolute top-2 left-2 text-sm z-10">✅</div>}
                    {locked && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-3xl z-20">
                        <Lock className="w-8 h-8 text-white/60" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Stories Bottom Ad */}
            <div className="px-4 mt-6">
              <AdSlot slot="STORIES_BOTTOM" />
            </div>
          </motion.div>
        )}

        {/* ─── Our Stories — DETAIL ─── */}
        {screen === "detail" && activeStory && (
          <StoryDetails
            key="our-detail"
            activeStory={activeStory}
            onBack={() => setScreen("list")}
            goToQuiz={goToQuiz}
          />
        )}

        {/* ─── Our Stories — QUIZ ─── */}
        {screen === "quiz" && activeStory && (
          <motion.div
            key="our-quiz"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 z-50 pb-28 px-4 pt-8 overflow-y-auto"
            style={{ background: "linear-gradient(180deg, #0d0720 0%, #1a0f3a 50%, #0d0720 100%)" }}
          >
            {/* Quiz intro banner */}
            <motion.div
              className="mb-4 p-4 rounded-2xl text-center"
              style={{ background: "linear-gradient(135deg,rgba(124,92,191,0.3),rgba(167,139,250,0.2))", border: "1px solid rgba(124,92,191,0.4)" }}
            >
              <div className="text-3xl mb-1">📝</div>
              <p className="text-white font-display font-bold">Quiz Time!</p>
              <p className="text-white/60 text-xs mt-0.5">Based on: <span className="text-violet-300">{activeStory.title}</span></p>
            </motion.div>
            <QuizScreen
              questions={activeStory.quiz}
              onComplete={handleQuizComplete}
              onBack={() => setScreen("detail")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoriesPage;
