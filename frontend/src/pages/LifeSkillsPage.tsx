/**
 * LifeSkillsPage — Scenario selection grid.
 *
 * Fetches active life skill scenarios from the API and renders
 * premium animated cards. Clicking a card navigates to the roleplay
 * chat page for that scenario.
 */

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import NavBar from "@/components/NavBar";
import SceneBackground from "@/components/SceneBackground";
import AdSlot from "@/components/ads/AdSlot";
import { lifeSkillsApi, type LifeSkillScenario } from "@/lib/lifeSkillsApi";
import { Sparkles, ArrowRight, MessageSquare } from "lucide-react";

// ── Animation variants ────────────────────────────────────────────

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const cardItem = {
  hidden: { y: 40, opacity: 0, scale: 0.88 },
  show: { y: 0, opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 200, damping: 22 } },
};

// ── Skeleton Card ─────────────────────────────────────────────────

const SkeletonCard = () => (
  <div
    className="relative rounded-3xl overflow-hidden border border-white/20 p-6 animate-pulse"
    style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", minHeight: 220 }}
  >
    <div className="w-16 h-16 rounded-2xl bg-white/15 mb-4" />
    <div className="h-5 w-3/4 rounded-xl bg-white/15 mb-2" />
    <div className="h-4 w-full rounded-xl bg-white/10 mb-1" />
    <div className="h-4 w-5/6 rounded-xl bg-white/10" />
  </div>
);

// ── Scenario Card ─────────────────────────────────────────────────

const ScenarioCard = ({ scenario, onClick }: { scenario: LifeSkillScenario; onClick: () => void }) => (
  <motion.button
    variants={cardItem}
    onClick={onClick}
    className="group relative w-full text-left cursor-pointer rounded-3xl overflow-hidden border border-white/30 p-6 flex flex-col"
    style={{
      background: scenario.coverGradient,
      boxShadow: "0 14px 40px -10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.35)",
      minHeight: 220,
    }}
    whileHover={{
      scale: 1.04,
      y: -6,
      boxShadow: "0 24px 56px -10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.5)",
    }}
    whileTap={{ scale: 0.97 }}
  >
    {/* Floating particles */}
    {[0, 1, 2, 3].map((i) => (
      <motion.span
        key={i}
        className="absolute pointer-events-none"
        style={{ left: `${15 + i * 22}%`, top: `${10 + (i % 2) * 25}%` }}
        animate={{ opacity: [0.2, 0.9, 0.2], y: [0, -10, 0] }}
        transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.35 }}
      >
        <Sparkles className="w-3 h-3 text-white/70" />
      </motion.span>
    ))}

    {/* Icon badge */}
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border border-white/40 text-4xl flex-shrink-0"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.35), rgba(255,255,255,0.1))",
        backdropFilter: "blur(8px)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
      }}
    >
      {scenario.icon}
    </div>

    {/* Title & description */}
    <h3 className="font-display text-xl font-bold text-white drop-shadow mb-1">
      {scenario.title}
    </h3>
    <p className="text-white/85 text-sm leading-snug flex-1">{scenario.description}</p>

    {/* CTA row */}
    <div className="mt-4 flex items-center gap-2">
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold border border-white/40 group-hover:border-white/60 transition-all"
        style={{ background: "rgba(255,255,255,0.18)" }}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Start practicing
        <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
      </div>
    </div>

    {/* Character avatar badge */}
    {scenario.characterAvatar && (
      <div className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-2xl border border-white/30"
        style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(6px)" }}>
        {scenario.characterAvatar}
      </div>
    )}
  </motion.button>
);

// ── Page ──────────────────────────────────────────────────────────

export default function LifeSkillsPage() {
  const navigate = useNavigate();

  const { data: scenarios = [], isLoading, isError } = useQuery({
    queryKey: ["life-skills-scenarios"],
    queryFn: () => lifeSkillsApi.listScenarios(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "linear-gradient(160deg, #0F1B3D 0%, #1A2A5E 40%, #2D1B4E 100%)" }}>
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[60vw] h-[60vw] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #4A90D9 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #9D6FE0 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      <NavBar />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-24">
        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center border border-white/30"
              style={{ background: "linear-gradient(135deg, #4A90D9 0%, #9D6FE0 100%)", boxShadow: "0 8px 24px rgba(74,144,217,0.45)" }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white drop-shadow">
              Life Skills Practice
            </h1>
          </div>
          <p className="text-white/70 text-base mt-1 ml-1">
            Practice real conversations with Ollie's friends. 🌟
          </p>
        </motion.div>

        {/* Life Skills Top Promo Banner */}
        <AdSlot slot="LIFE_SKILLS_TOP" className="mb-8" />

        {/* Cards grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : isError ? (
          <div className="text-center py-20">
            <p className="text-white/60 text-lg">Couldn't load scenarios. Please try again! 🦉</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {scenarios.map((s) => (
              <ScenarioCard
                key={s.id}
                scenario={s}
                onClick={() => navigate(`/life-skills/${s.slug}/practice`)}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
