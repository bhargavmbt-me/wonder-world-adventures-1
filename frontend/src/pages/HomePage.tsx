import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useChild } from "@/context/ChildContext";
import HomeMascot, { type HomeMascotHandle } from "@/components/common/HomeMascot";
import NavBar from "@/components/NavBar";
import SceneBackground from "@/components/SceneBackground";
import AmbientSoundToggle from "@/components/AmbientSoundToggle";
import AdSlot from "@/components/ads/AdSlot";
import homeBg from "@/assets/home-bg.jpg";
import {
  Gamepad2,
  BookOpen,
  MessageCircle,
  Crown,
  Star,
  Flame,
  Sparkles,
  TreePine,
  Moon,
  Home as HomeIcon,
  GraduationCap,
  Zap,
  MessageSquare,
  Users,
  Library,
} from "lucide-react";

type Section = {
  icon: typeof Gamepad2;
  title: string;
  desc: string;
  path: string;
  // Each card has its own mini scene gradient
  bg: string;
  glow: string;
  accent: typeof TreePine;
};

const sections: Section[] = [
  {
    icon: Gamepad2,
    title: "Play Games",
    desc: "Magical Treehouse",
    path: "/games",
    bg: "linear-gradient(160deg, #FFD68A 0%, #FF9E6E 60%, #C57BD4 100%)",
    glow: "rgba(255,160,90,0.55)",
    accent: TreePine,
  },
  {
    icon: BookOpen,
    title: "Stories",
    desc: "Glowing Library",
    path: "/stories",
    bg: "linear-gradient(160deg, #2E2270 0%, #5B3FA6 55%, #9D6FE0 100%)",
    glow: "rgba(140,90,220,0.55)",
    accent: Moon,
  },
  {
    icon: GraduationCap,
    title: "Learn",
    desc: "Lesson Path",
    path: "/learn",
    bg: "linear-gradient(160deg, #1A5F3F 0%, #2E9E6A 55%, #72D6A0 100%)",
    glow: "rgba(50,180,120,0.55)",
    accent: Sparkles,
  },
  {
    icon: MessageCircle,
    title: "Chat Bot",
    desc: "Moonlit Buddy",
    path: "/chat",
    bg: "linear-gradient(160deg, #3D2A66 0%, #7A4FB5 55%, #E89A4A 100%)",
    glow: "rgba(232,154,74,0.55)",
    accent: Sparkles,
  },
  {
    icon: Crown,
    title: "Parents",
    desc: "Cozy Cottage",
    path: "/parents",
    bg: "linear-gradient(160deg, #FFE0A8 0%, #E8A87C 55%, #8E6FAD 100%)",
    glow: "rgba(232,168,124,0.55)",
    accent: HomeIcon,
  },
  {
    icon: MessageSquare,
    title: "Life Skills",
    desc: "Real-life Practice",
    path: "/life-skills",
    bg: "linear-gradient(160deg, #1A6B5A 0%, #2E9E80 55%, #72D6B0 100%)",
    glow: "rgba(46,158,128,0.55)",
    accent: Users,
  },
  {
    icon: BookOpen,
    title: "Word Wonder",
    desc: "Dictionary Magic",
    path: "/dictionary",
    bg: "linear-gradient(160deg, #2A1A6B 0%, #4A3FD4 55%, #9B80FF 100%)",
    glow: "rgba(74,63,212,0.55)",
    accent: Library,
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { y: 40, opacity: 0, scale: 0.85 },
  show: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 200 },
  },
};

const HomePage = () => {
  const navigate = useNavigate();
  const { profile } = useChild();
  const [tapBurst, setTapBurst] = useState(0);
  const mascotRef = useRef<HomeMascotHandle>(null);

  const triggerTap = () => {
    setTapBurst((n) => n + 1);
    mascotRef.current?.play();
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Sunrise meadow background — unique to Home */}
      <SceneBackground image={homeBg} alt="Magical sunrise meadow with rolling hills" variant="meadow" />

      <NavBar />
      <AmbientSoundToggle />

      <div className="page-shell">
        {/* Top Promotional Ad */}
        <AdSlot slot="HOME_TOP" className="mb-6" />

        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-6 sm:gap-8 mb-10 sm:mb-14">
          {/* Left – greeting glass card */}
          <motion.div
            className="relative w-full max-w-xl mx-auto lg:mx-0 order-2 lg:order-1"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div
              className="relative rounded-[32px] p-6 sm:p-8 border border-white/40"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,245,225,0.35) 0%, rgba(255,220,200,0.22) 100%)",
                backdropFilter: "blur(22px)",
                WebkitBackdropFilter: "blur(22px)",
                boxShadow:
                  "0 25px 70px -15px rgba(120,60,20,0.45), 0 10px 40px -10px rgba(160,90,200,0.35), inset 0 1px 0 rgba(255,255,255,0.55)",
              }}
            >
              {/* Inner glow */}
              <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_30%_20%,rgba(255,220,150,0.35),transparent_60%)]" />

              <div className="relative text-center lg:text-left">
                <h1
                  className="font-display leading-tight text-white drop-shadow-[0_3px_12px_rgba(80,30,10,0.55)]"
                  style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.8rem)" }}
                >
                  Hey {profile?.name}!{" "}
                  <motion.span
                    className="inline-block"
                    animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      repeatDelay: 3,
                    }}
                  >
                    👋
                  </motion.span>
                </h1>
                <p className="text-amber-50/95 text-base sm:text-lg mt-3 font-body drop-shadow-[0_2px_6px_rgba(60,20,10,0.5)]">
                  Step into the magical forest — what shall we explore today?
                </p>

                {/* Stat strip */}
                <motion.div
                  className="mt-6 grid grid-cols-3 gap-2 sm:gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {[
                    {
                      icon: Star,
                      label: "Stars",
                      value: profile?.stars || 0,
                      color: "text-amber-300",
                      fill: "fill-amber-300",
                    },
                    {
                      icon: Zap,
                      label: "XP",
                      value: profile?.xp || 0,
                      color: "text-purple-300",
                    },
                    {
                      icon: Flame,
                      label: "Streak",
                      value: profile?.streak || 0,
                      color: "text-orange-300",
                    },
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      className="rounded-2xl px-3 py-3 border border-white/35 text-center"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,235,200,0.12))",
                        backdropFilter: "blur(10px)",
                      }}
                      whileHover={{ y: -3, scale: 1.04 }}
                    >
                      <s.icon
                        className={`mx-auto w-5 h-5 ${s.color} ${s.fill || ""}`}
                      />
                      <div className="font-display font-bold text-lg text-white mt-1">
                        {s.value}
                      </div>
                      <div className="text-[11px] uppercase tracking-wide text-amber-50/80">
                        {s.label}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* CTAs */}
                <div className="flex items-center gap-3 mt-7 justify-center lg:justify-start flex-wrap">
                  <motion.button
                    onClick={() => navigate("/chat")}
                    className="relative overflow-hidden px-6 py-3 rounded-2xl font-display text-base text-amber-950 border border-white/55"
                    style={{
                      background:
                        "linear-gradient(135deg, #FFE0A3 0%, #FFB870 50%, #E89A4A 100%)",
                      boxShadow:
                        "0 10px 30px -5px rgba(255,170,80,0.55), inset 0 1px 0 rgba(255,255,255,0.7)",
                    }}
                    whileHover={{
                      scale: 1.05,
                      y: -3,
                      boxShadow:
                        "0 16px 40px -5px rgba(255,200,100,0.7), inset 0 1px 0 rgba(255,255,255,0.85)",
                    }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Play with Buddy
                    </span>
                  </motion.button>

                  <motion.button
                    onClick={() => navigate("/games")}
                    className="px-6 py-3 rounded-2xl font-display text-base text-white border border-white/45"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(140,90,200,0.55), rgba(80,50,140,0.55))",
                      backdropFilter: "blur(12px)",
                      boxShadow: "0 8px 25px -5px rgba(100,60,180,0.5)",
                    }}
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Explore
                    </span>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right – 3D Buddy floating in glass orb */}
          <motion.div
            className="w-full flex justify-center order-1 lg:order-2"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 110, delay: 0.2 }}
          >
            <div className="relative w-full max-w-[560px] h-[380px] sm:h-[520px] lg:h-[580px]">
              {/* Glow halo */}
              <div className="absolute -inset-6 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(255,210,140,0.55)_0%,rgba(180,130,220,0.2)_50%,transparent_75%)] blur-2xl" />

              {/* Glass orb card */}
              <div
                className="absolute inset-0 rounded-[44px] overflow-hidden border border-white/45"
                style={{
                  background:
                    "linear-gradient(160deg, rgba(255,235,200,0.4) 0%, rgba(255,200,160,0.25) 50%, rgba(180,140,220,0.3) 100%)",
                  backdropFilter: "blur(24px)",
                  boxShadow:
                    "0 25px 70px -15px rgba(120,60,20,0.55), inset 0 1px 0 rgba(255,255,255,0.55)",
                }}
              >
                {/* Sparkle particles */}
                {Array.from({ length: 10 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    style={{
                      left: `${10 + ((i * 41) % 80)}%`,
                      top: `${10 + ((i * 27) % 75)}%`,
                    }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0.5, 1.2, 0.5],
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      duration: 3 + (i % 3),
                      repeat: Infinity,
                      delay: i * 0.4,
                    }}
                  >
                    <Sparkles className="w-3 h-3 text-amber-200" />
                  </motion.div>
                ))}

                {/* Tap burst */}
                {tapBurst > 0 &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={`burst-${tapBurst}-${i}`}
                      className="absolute left-1/2 top-1/2"
                      initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
                      animate={{
                        x: Math.cos((i / 8) * Math.PI * 2) * 120,
                        y: Math.sin((i / 8) * Math.PI * 2) * 120,
                        opacity: 0,
                        scale: 1.4,
                      }}
                      transition={{ duration: 0.8 }}
                    >
                      <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
                    </motion.div>
                  ))}
              </div>

              {/* Rive Mascot */}
              <div className="absolute inset-0 rounded-[44px] overflow-hidden">
                <HomeMascot ref={mascotRef} onTap={triggerTap} />
              </div>

              {/* Tap me pill */}
              <motion.button
                onClick={triggerTap}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full font-display text-sm text-amber-950 border border-white/55"
                style={{
                  background:
                    "linear-gradient(135deg, #FFE9C0 0%, #FFC58A 100%)",
                  boxShadow:
                    "0 8px 25px -5px rgba(255,180,90,0.6), inset 0 1px 0 rgba(255,255,255,0.7)",
                }}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
              >
                ✨ Tap me to play!
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* After Hero In-App Ad */}
        <AdSlot slot="HOME_AFTER_HERO" className="mb-8" />

        {/* Themed feature cards — horizontal snap on mobile, grid on desktop */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 sm:gap-5"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {sections.map((s) => (
            <motion.button
              key={s.path}
              variants={item}
              onClick={() => navigate(s.path)}
              className="group relative cursor-pointer p-5 sm:p-6 text-left rounded-3xl overflow-hidden border border-white/35"
              style={{
                background: s.bg,
                boxShadow: `0 14px 40px -10px ${s.glow}, inset 0 1px 0 rgba(255,255,255,0.4)`,
              }}
              whileHover={{
                scale: 1.04,
                y: -6,
                rotate: -0.5,
                boxShadow: `0 22px 55px -10px ${s.glow}, inset 0 1px 0 rgba(255,255,255,0.55)`,
              }}
              whileTap={{ scale: 0.96 }}
            >
              {/* Floating particles inside card */}
              {Array.from({ length: 4 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${15 + i * 22}%`,
                    top: `${10 + (i % 2) * 20}%`,
                  }}
                  animate={{
                    opacity: [0.2, 0.9, 0.2],
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 2.5 + i * 0.4,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                >
                  <Sparkles className="w-3 h-3 text-white/90" />
                </motion.span>
              ))}

              {/* Background accent silhouette */}
              <s.accent
                className="absolute -right-3 -bottom-3 w-24 h-24 text-white/15"
                strokeWidth={1.2}
              />

              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 border border-white/40"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.35), rgba(255,255,255,0.1))",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
                }}
              >
                <s.icon className="w-7 h-7 text-white drop-shadow" />
              </div>
              <h3 className="font-display text-xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
                {s.title}
              </h3>
              <p className="text-white/85 text-sm mt-0.5 drop-shadow">
                {s.desc}
              </p>
            </motion.button>
          ))}
        </motion.div>

        {/* Bottom Promotional Ad */}
        <AdSlot slot="HOME_BOTTOM" className="mt-8" />
      </div>

      {/* Optional Child-Safe Promo Popup */}
      <AdSlot slot="HOME_POPUP" />
    </div>
  );
};

export default HomePage;
