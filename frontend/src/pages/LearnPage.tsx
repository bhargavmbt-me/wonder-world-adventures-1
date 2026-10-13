import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChild } from "@/context/ChildContext";
import { useAuth } from "@/context/AuthContext";
import NavBar from "@/components/NavBar";
import SceneBackground from "@/components/SceneBackground";
import AmbientSoundToggle from "@/components/AmbientSoundToggle";
import QuizScreen, { QuizQuestion } from "@/components/QuizScreen";
import RewardPopup from "@/components/RewardPopup";
import VoiceInteraction from "@/components/VoiceInteraction";
import AdSlot from "@/components/ads/AdSlot";
import { contentApi, ApiLesson } from "@/lib/api";
import storiesBg from "@/assets/stories-bg.jpg";
import {
  Star,
  Lock,
  ChevronRight,
  Mic,
  Volume2,
  CheckCircle,
  Flame,
  ArrowLeft,
  Languages,
  GraduationCap,
} from "lucide-react";

/* ---------------- Types ---------------- */

type LangCode = "en" | "te" | "hi" | "ta";
type Level = "beginner" | "intermediate" | "expert";

interface LangInfo {
  code: LangCode;
  name: string;
  native: string;
  flag: string;
  gradient: string;
}

interface WordCard {
  word: string;       // shown big (target language)
  translit?: string;  // pronunciation hint
  meaning?: string;   // English meaning / explanation
  emoji: string;
}

interface Lesson {
  id: string;          // unique per language+level+lesson
  title: string;
  emoji: string;
  color: string;
  intro: string;       // short topic intro line
  words: WordCard[];
  quiz: QuizQuestion[];
  nextId?: string;
}

/* ---------------- Languages ---------------- */

const LANGUAGES: LangInfo[] = [
  { code: "en", name: "English",  native: "English", flag: "🇬🇧", gradient: "from-sky-400 to-indigo-500" },
  { code: "te", name: "Telugu",   native: "తెలుగు",  flag: "🇮🇳", gradient: "from-amber-400 to-rose-500" },
  { code: "hi", name: "Hindi",    native: "हिन्दी",   flag: "🇮🇳", gradient: "from-orange-400 to-red-500" },
  { code: "ta", name: "Tamil",    native: "தமிழ்",   flag: "🇮🇳", gradient: "from-emerald-400 to-teal-500" },
];

const LEVELS: { code: Level; title: string; desc: string; emoji: string; gradient: string }[] = [
  { code: "beginner",     title: "Beginner",     desc: "Alphabets, basic words & sounds",  emoji: "🌱", gradient: "from-emerald-400 to-teal-500" },
  { code: "intermediate", title: "Intermediate", desc: "Small sentences & easy grammar",   emoji: "🌿", gradient: "from-amber-400 to-orange-500" },
  { code: "expert",       title: "Expert",       desc: "Reading, meaning & corrections",   emoji: "🌳", gradient: "from-fuchsia-500 to-purple-600" },
];

/* ---------------- Lesson Content ---------------- */
/* Each language has 3 lessons per level. Kept small but fully playable. */

const buildLessons = (lang: LangCode, level: Level): Lesson[] => {
  const prefix = `${lang}-${level}`;
  // Helper to wire next-lesson chain
  const chain = (arr: Omit<Lesson, "nextId">[]): Lesson[] =>
    arr.map((l, i) => ({ ...l, nextId: arr[i + 1]?.id }));

  /* ---------- ENGLISH ---------- */
  if (lang === "en" && level === "beginner") {
    return chain([
      {
        id: `${prefix}-1`, title: "Alphabets A–E", emoji: "🔤",
        color: "from-sky-400 to-indigo-500",
        intro: "Learn your first letters and the words they make.",
        words: [
          { word: "A", meaning: "Apple", emoji: "🍎" },
          { word: "B", meaning: "Ball",  emoji: "⚽" },
          { word: "C", meaning: "Cat",   emoji: "🐱" },
          { word: "D", meaning: "Dog",   emoji: "🐶" },
          { word: "E", meaning: "Egg",   emoji: "🥚" },
        ],
        quiz: [
          { type: "mcq", emoji: "🍎", question: "Which letter does Apple start with?", options: ["A","B","C","D"], answer: "A" },
          { type: "mcq", emoji: "🐶", question: "Dog starts with?", options: ["B","D","E","C"], answer: "D" },
          { type: "fill", emoji: "🥚", question: "Egg starts with the letter ___", answer: "E" },
          { type: "mcq", emoji: "🐱", question: "Cat starts with?", options: ["A","B","C","D"], answer: "C" },
        ],
      },
      {
        id: `${prefix}-2`, title: "Numbers 1–10", emoji: "🔢",
        color: "from-amber-400 to-orange-500",
        intro: "Count from one to ten with friendly numbers.",
        words: [
          { word: "One",   emoji: "1️⃣" },
          { word: "Three", emoji: "3️⃣" },
          { word: "Five",  emoji: "5️⃣" },
          { word: "Seven", emoji: "7️⃣" },
          { word: "Ten",   emoji: "🔟" },
        ],
        quiz: [
          { type: "mcq", emoji: "🔢", question: "Number after 9?", options: ["Eight","Eleven","Ten","Six"], answer: "Ten" },
          { type: "mcq", emoji: "➕", question: "3 + 2 = ?", options: ["Five","Four","Six","Seven"], answer: "Five" },
          { type: "fill", emoji: "7️⃣", question: "Type the number after six:", answer: "Seven" },
          { type: "mcq", emoji: "1️⃣", question: "First counting number?", options: ["Zero","One","Two","Three"], answer: "One" },
        ],
      },
      {
        id: `${prefix}-3`, title: "Fruits & Animals", emoji: "🍎",
        color: "from-rose-400 to-pink-500",
        intro: "Tasty fruits and friendly animals.",
        words: [
          { word: "Apple",   emoji: "🍎" },
          { word: "Banana",  emoji: "🍌" },
          { word: "Lion",    emoji: "🦁" },
          { word: "Rabbit",  emoji: "🐰" },
        ],
        quiz: [
          { type: "mcq", emoji: "🍌", question: "Yellow curved fruit?", options: ["Apple","Banana","Mango","Grape"], answer: "Banana" },
          { type: "fill", emoji: "🦁", question: "King of the jungle:", answer: "Lion" },
          { type: "mcq", emoji: "🐰", question: "Long ears, hops around?", options: ["Lion","Rabbit","Dog","Cat"], answer: "Rabbit" },
          { type: "mcq", emoji: "🍎", question: "What color is an apple?", options: ["Blue","Red","Purple","Black"], answer: "Red" },
        ],
      },
    ]);
  }

  if (lang === "en" && level === "intermediate") {
    return chain([
      {
        id: `${prefix}-1`, title: "Easy Sentences", emoji: "💬",
        color: "from-sky-400 to-cyan-500",
        intro: "Build your first simple sentences.",
        words: [
          { word: "This is a cat.", emoji: "🐱" },
          { word: "I like apples.", emoji: "🍎" },
          { word: "She is happy.",  emoji: "😊" },
          { word: "We play ball.",  emoji: "⚽" },
        ],
        quiz: [
          { type: "fill", emoji: "🐱", question: "This is ___ cat.", answer: "a", hint: "Singular article" },
          { type: "mcq", emoji: "🍎", question: "Pick the correct sentence", options: ["I like apples.","I likes apple.","Me like apple.","Apple I like."], answer: "I like apples." },
          { type: "mcq", emoji: "😊", question: "She ___ happy.", options: ["am","is","are","be"], answer: "is" },
          { type: "fill", emoji: "⚽", question: "We ___ ball.", answer: "play" },
        ],
      },
      {
        id: `${prefix}-2`, title: "Word Combos", emoji: "🧩",
        color: "from-purple-400 to-fuchsia-500",
        intro: "Match words that go together.",
        words: [
          { word: "Big elephant", emoji: "🐘" },
          { word: "Red apple",    emoji: "🍎" },
          { word: "Tall tree",    emoji: "🌳" },
          { word: "Cute puppy",   emoji: "🐶" },
        ],
        quiz: [
          { type: "mcq", emoji: "🐘", question: "Best word for elephant?", options: ["Tiny","Big","Thin","Short"], answer: "Big" },
          { type: "mcq", emoji: "🌳", question: "A tree is usually…", options: ["Tall","Salty","Loud","Wet"], answer: "Tall" },
          { type: "fill", emoji: "🐶", question: "Cute ___ (baby dog)", answer: "puppy" },
          { type: "mcq", emoji: "🍎", question: "Apples are often…", options: ["Blue","Red","Black","Grey"], answer: "Red" },
        ],
      },
      {
        id: `${prefix}-3`, title: "Tiny Grammar", emoji: "✏️",
        color: "from-amber-400 to-yellow-500",
        intro: "A / an / is / are.",
        words: [
          { word: "An apple", emoji: "🍎" },
          { word: "A ball",   emoji: "⚽" },
          { word: "They are happy", emoji: "🥳" },
          { word: "He is kind",     emoji: "💖" },
        ],
        quiz: [
          { type: "mcq", emoji: "🍎", question: "___ apple", options: ["A","An","The","Is"], answer: "An" },
          { type: "mcq", emoji: "⚽", question: "___ ball",  options: ["A","An","Is","Are"], answer: "A" },
          { type: "fill", emoji: "🥳", question: "They ___ happy.", answer: "are" },
          { type: "fill", emoji: "💖", question: "He ___ kind.", answer: "is" },
        ],
      },
    ]);
  }

  if (lang === "en" && level === "expert") {
    return chain([
      {
        id: `${prefix}-1`, title: "Reading Time", emoji: "📖",
        color: "from-indigo-500 to-purple-600",
        intro: "Read short lines and understand them.",
        words: [
          { word: "The sun is bright today.", emoji: "☀️" },
          { word: "Birds fly in the sky.",   emoji: "🐦" },
          { word: "Mia loves her red bike.", emoji: "🚲" },
        ],
        quiz: [
          { type: "mcq", emoji: "☀️", question: "What is bright today?", options: ["The moon","The sun","The lamp","The star"], answer: "The sun" },
          { type: "mcq", emoji: "🐦", question: "Where do birds fly?", options: ["Underground","In the sky","In the sea","In a box"], answer: "In the sky" },
          { type: "fill", emoji: "🚲", question: "Mia loves her ___ bike.", answer: "red" },
        ],
      },
      {
        id: `${prefix}-2`, title: "Sentence Fix", emoji: "🛠️",
        color: "from-rose-500 to-pink-600",
        intro: "Spot and fix small mistakes.",
        words: [
          { word: "She go to school. ➜ She goes to school.", emoji: "🏫" },
          { word: "I has a pen. ➜ I have a pen.",            emoji: "🖊️" },
          { word: "We was happy. ➜ We were happy.",          emoji: "😄" },
        ],
        quiz: [
          { type: "mcq", emoji: "🏫", question: "Which is correct?", options: ["She go to school.","She goes to school.","She going school.","She go school."], answer: "She goes to school." },
          { type: "mcq", emoji: "🖊️", question: "Pick the right one", options: ["I has a pen.","I have a pen.","I haves pen.","I having pen."], answer: "I have a pen." },
          { type: "fill", emoji: "😄", question: "We ___ happy. (was/were)", answer: "were" },
        ],
      },
      {
        id: `${prefix}-3`, title: "Listen & Choose", emoji: "🎧",
        color: "from-cyan-500 to-blue-600",
        intro: "Pretend to listen and pick the right answer.",
        words: [
          { word: "Listen: 'The cat sat on the mat.'", emoji: "🐱" },
          { word: "Listen: 'Stars shine at night.'",   emoji: "⭐" },
        ],
        quiz: [
          { type: "mcq", emoji: "🐱", question: "Where did the cat sit?", options: ["On the bed","On the mat","On the chair","On the box"], answer: "On the mat" },
          { type: "mcq", emoji: "⭐", question: "When do stars shine?", options: ["Morning","Noon","Night","Evening sun"], answer: "Night" },
          { type: "fill", emoji: "🎧", question: "Stars shine at ___.", answer: "night" },
        ],
      },
    ]);
  }

  /* ---------- TELUGU ---------- */
  if (lang === "te" && level === "beginner") {
    return chain([
      {
        id: `${prefix}-1`, title: "Alphabets అ–ఈ", emoji: "🔤",
        color: "from-amber-400 to-rose-500",
        intro: "First Telugu vowels and the words they make.",
        words: [
          { word: "అ", translit: "a", meaning: "Ammama (Grandma)", emoji: "👵" },
          { word: "ఆ", translit: "aa", meaning: "Aavu (Cow)",      emoji: "🐄" },
          { word: "ఇ", translit: "i",  meaning: "Illu (House)",    emoji: "🏠" },
          { word: "ఈ", translit: "ee", meaning: "Eega (Fly)",      emoji: "🪰" },
        ],
        quiz: [
          { type: "mcq", emoji: "🐄", question: "Which letter for Aavu (Cow)?", options: ["అ","ఆ","ఇ","ఈ"], answer: "ఆ" },
          { type: "mcq", emoji: "🏠", question: "Illu starts with?",            options: ["అ","ఆ","ఇ","ఈ"], answer: "ఇ" },
          { type: "fill", emoji: "👵", question: "First Telugu vowel (type letter):", answer: "అ" },
        ],
      },
      {
        id: `${prefix}-2`, title: "Numbers 1–5", emoji: "🔢",
        color: "from-orange-400 to-amber-500",
        intro: "Count one to five in Telugu.",
        words: [
          { word: "ఒకటి", translit: "okati",  meaning: "One",   emoji: "1️⃣" },
          { word: "రెండు", translit: "rendu", meaning: "Two",   emoji: "2️⃣" },
          { word: "మూడు", translit: "moodu", meaning: "Three", emoji: "3️⃣" },
          { word: "నాలుగు", translit: "naalugu", meaning: "Four", emoji: "4️⃣" },
          { word: "ఐదు",  translit: "aidu",  meaning: "Five",  emoji: "5️⃣" },
        ],
        quiz: [
          { type: "mcq", emoji: "3️⃣", question: "Three in Telugu?", options: ["ఒకటి","రెండు","మూడు","ఐదు"], answer: "మూడు" },
          { type: "mcq", emoji: "5️⃣", question: "Aidu means?",      options: ["Two","Three","Four","Five"], answer: "Five" },
          { type: "fill", emoji: "1️⃣", question: "Type 'One' in English (meaning of ఒకటి):", answer: "One" },
        ],
      },
      {
        id: `${prefix}-3`, title: "Fruits & Animals", emoji: "🍎",
        color: "from-rose-400 to-fuchsia-500",
        intro: "పండ్లు మరియు జంతువులు",
        words: [
          { word: "ఆపిల్", translit: "aapil",  meaning: "Apple",  emoji: "🍎" },
          { word: "అరటి",  translit: "arati",  meaning: "Banana", emoji: "🍌" },
          { word: "కుక్క", translit: "kukka",  meaning: "Dog",    emoji: "🐶" },
          { word: "పిల్లి", translit: "pilli",  meaning: "Cat",   emoji: "🐱" },
        ],
        quiz: [
          { type: "mcq", emoji: "🐶", question: "Kukka means?", options: ["Cat","Dog","Cow","Lion"], answer: "Dog" },
          { type: "mcq", emoji: "🍌", question: "Banana in Telugu?", options: ["ఆపిల్","అరటి","కుక్క","పిల్లి"], answer: "అరటి" },
          { type: "fill", emoji: "🐱", question: "Type meaning of పిల్లి:", answer: "Cat" },
        ],
      },
    ]);
  }

  if (lang === "te" && level === "intermediate") {
    return chain([
      {
        id: `${prefix}-1`, title: "Small Sentences", emoji: "💬",
        color: "from-amber-400 to-orange-500",
        intro: "Easy daily sentences in Telugu.",
        words: [
          { word: "ఇది పిల్లి.", translit: "Idi pilli.", meaning: "This is a cat.", emoji: "🐱" },
          { word: "నాకు ఆపిల్ ఇష్టం.", translit: "Naaku aapil ishtam.", meaning: "I like apple.", emoji: "🍎" },
          { word: "ఆమె సంతోషంగా ఉంది.", translit: "Aame santhoshamga undhi.", meaning: "She is happy.", emoji: "😊" },
        ],
        quiz: [
          { type: "mcq", emoji: "🐱", question: "Idi pilli means?", options: ["This is a dog.","This is a cat.","I am a cat.","She is a cat."], answer: "This is a cat." },
          { type: "mcq", emoji: "🍎", question: "Ishtam means?", options: ["Hate","Like","Eat","Drink"], answer: "Like" },
          { type: "fill", emoji: "😊", question: "She is happy → Aame santhoshamga ___.", answer: "undhi" },
        ],
      },
      {
        id: `${prefix}-2`, title: "Common Words", emoji: "🧩",
        color: "from-rose-400 to-pink-500",
        intro: "Useful everyday words.",
        words: [
          { word: "నీరు", translit: "neeru", meaning: "Water", emoji: "💧" },
          { word: "అన్నం", translit: "annam", meaning: "Rice / Food", emoji: "🍚" },
          { word: "ఇల్లు", translit: "illu", meaning: "House", emoji: "🏠" },
        ],
        quiz: [
          { type: "mcq", emoji: "💧", question: "Neeru means?", options: ["Fire","Water","Wind","Stone"], answer: "Water" },
          { type: "fill", emoji: "🏠", question: "House in Telugu (translit):", answer: "illu" },
          { type: "mcq", emoji: "🍚", question: "Annam means?", options: ["Bread","Rice","Milk","Tea"], answer: "Rice" },
        ],
      },
    ]);
  }

  if (lang === "te" && level === "expert") {
    return chain([
      {
        id: `${prefix}-1`, title: "Reading Lines", emoji: "📖",
        color: "from-fuchsia-500 to-purple-600",
        intro: "Read and understand short Telugu lines.",
        words: [
          { word: "సూర్యుడు ప్రకాశిస్తున్నాడు.", translit: "Sooryudu prakaashistunnaadu.", meaning: "The sun is shining.", emoji: "☀️" },
          { word: "పక్షులు ఎగురుతున్నాయి.", translit: "Pakshulu egurutunnaayi.", meaning: "Birds are flying.", emoji: "🐦" },
        ],
        quiz: [
          { type: "mcq", emoji: "☀️", question: "What is shining?", options: ["Moon","Sun","Lamp","Star"], answer: "Sun" },
          { type: "mcq", emoji: "🐦", question: "What are birds doing?", options: ["Sleeping","Flying","Eating","Walking"], answer: "Flying" },
        ],
      },
    ]);
  }

  /* ---------- HINDI ---------- */
  if (lang === "hi" && level === "beginner") {
    return chain([
      {
        id: `${prefix}-1`, title: "Vowels अ–ई", emoji: "🔤",
        color: "from-orange-400 to-red-500",
        intro: "Start with the first Hindi vowels.",
        words: [
          { word: "अ", translit: "a",  meaning: "Anaar (Pomegranate)", emoji: "🍎" },
          { word: "आ", translit: "aa", meaning: "Aam (Mango)",         emoji: "🥭" },
          { word: "इ", translit: "i",  meaning: "Imli (Tamarind)",     emoji: "🌰" },
          { word: "ई", translit: "ee", meaning: "Eekh (Sugarcane)",    emoji: "🎋" },
        ],
        quiz: [
          { type: "mcq", emoji: "🥭", question: "Aam starts with?", options: ["अ","आ","इ","ई"], answer: "आ" },
          { type: "fill", emoji: "🍎", question: "First vowel of Hindi (type the letter):", answer: "अ" },
          { type: "mcq", emoji: "🌰", question: "Imli starts with?", options: ["अ","आ","इ","ई"], answer: "इ" },
        ],
      },
      {
        id: `${prefix}-2`, title: "Numbers 1–5", emoji: "🔢",
        color: "from-amber-400 to-orange-500",
        intro: "Count from one to five in Hindi.",
        words: [
          { word: "एक",  translit: "ek",   meaning: "One",   emoji: "1️⃣" },
          { word: "दो",  translit: "do",   meaning: "Two",   emoji: "2️⃣" },
          { word: "तीन", translit: "teen", meaning: "Three", emoji: "3️⃣" },
          { word: "चार", translit: "chaar",meaning: "Four",  emoji: "4️⃣" },
          { word: "पाँच",translit: "paanch",meaning:"Five",  emoji: "5️⃣" },
        ],
        quiz: [
          { type: "mcq", emoji: "3️⃣", question: "Three in Hindi?", options: ["एक","दो","तीन","चार"], answer: "तीन" },
          { type: "mcq", emoji: "5️⃣", question: "Paanch means?", options: ["Two","Three","Four","Five"], answer: "Five" },
          { type: "fill", emoji: "1️⃣", question: "Meaning of एक (in English):", answer: "One" },
        ],
      },
      {
        id: `${prefix}-3`, title: "Fruits & Animals", emoji: "🍎",
        color: "from-rose-500 to-pink-500",
        intro: "फल और जानवर",
        words: [
          { word: "सेब",  translit: "seb",  meaning: "Apple",  emoji: "🍎" },
          { word: "केला", translit: "kela", meaning: "Banana", emoji: "🍌" },
          { word: "कुत्ता",translit: "kutta",meaning: "Dog",   emoji: "🐶" },
          { word: "बिल्ली",translit:"billi", meaning: "Cat",   emoji: "🐱" },
        ],
        quiz: [
          { type: "mcq", emoji: "🐶", question: "Kutta means?", options: ["Cat","Cow","Dog","Lion"], answer: "Dog" },
          { type: "mcq", emoji: "🍌", question: "Banana in Hindi?", options: ["सेब","केला","कुत्ता","बिल्ली"], answer: "केला" },
          { type: "fill", emoji: "🐱", question: "Meaning of बिल्ली:", answer: "Cat" },
        ],
      },
    ]);
  }

  if (lang === "hi" && level === "intermediate") {
    return chain([
      {
        id: `${prefix}-1`, title: "Easy Sentences", emoji: "💬",
        color: "from-orange-400 to-amber-500",
        intro: "रोज़ के छोटे वाक्य",
        words: [
          { word: "यह बिल्ली है।", translit: "Yeh billi hai.", meaning: "This is a cat.", emoji: "🐱" },
          { word: "मुझे सेब पसंद है।", translit: "Mujhe seb pasand hai.", meaning: "I like apple.", emoji: "🍎" },
          { word: "वह खुश है।", translit: "Vah khush hai.", meaning: "He/She is happy.", emoji: "😊" },
        ],
        quiz: [
          { type: "mcq", emoji: "🐱", question: "Yeh billi hai means?", options: ["This is a dog","This is a cat","She is a cat","I am a cat"], answer: "This is a cat" },
          { type: "fill", emoji: "🍎", question: "I like apple → Mujhe seb ___ hai.", answer: "pasand" },
          { type: "mcq", emoji: "😊", question: "Khush means?", options: ["Sad","Angry","Happy","Tired"], answer: "Happy" },
        ],
      },
      {
        id: `${prefix}-2`, title: "Common Words", emoji: "🧩",
        color: "from-red-400 to-rose-500",
        intro: "रोज़मर्रा के शब्द",
        words: [
          { word: "पानी", translit: "paani", meaning: "Water", emoji: "💧" },
          { word: "घर",   translit: "ghar",  meaning: "House", emoji: "🏠" },
          { word: "खाना", translit: "khana", meaning: "Food",  emoji: "🍚" },
        ],
        quiz: [
          { type: "mcq", emoji: "💧", question: "Paani means?", options: ["Fire","Water","Air","Sand"], answer: "Water" },
          { type: "fill", emoji: "🏠", question: "House in Hindi (translit):", answer: "ghar" },
          { type: "mcq", emoji: "🍚", question: "Khana means?", options: ["Food","Drink","Sleep","Play"], answer: "Food" },
        ],
      },
    ]);
  }

  if (lang === "hi" && level === "expert") {
    return chain([
      {
        id: `${prefix}-1`, title: "Reading Time", emoji: "📖",
        color: "from-fuchsia-500 to-purple-600",
        intro: "छोटी पंक्तियाँ पढ़ें।",
        words: [
          { word: "सूरज चमक रहा है।", translit: "Sooraj chamak raha hai.", meaning: "The sun is shining.", emoji: "☀️" },
          { word: "पक्षी आसमान में उड़ते हैं।", translit: "Pakshi aasmaan mein udte hain.", meaning: "Birds fly in the sky.", emoji: "🐦" },
        ],
        quiz: [
          { type: "mcq", emoji: "☀️", question: "Sooraj means?", options: ["Moon","Sun","Star","Cloud"], answer: "Sun" },
          { type: "mcq", emoji: "🐦", question: "Where do birds fly?", options: ["In water","In sky","Underground","Inside house"], answer: "In sky" },
        ],
      },
    ]);
  }

  /* ---------- TAMIL ---------- */
  if (lang === "ta" && level === "beginner") {
    return chain([
      {
        id: `${prefix}-1`, title: "Vowels அ–ஈ", emoji: "🔤",
        color: "from-emerald-400 to-teal-500",
        intro: "Start with the first Tamil vowels.",
        words: [
          { word: "அ", translit: "a",  meaning: "Annan (Brother)", emoji: "👦" },
          { word: "ஆ", translit: "aa", meaning: "Aadu (Goat)",     emoji: "🐐" },
          { word: "இ", translit: "i",  meaning: "Idli",             emoji: "🍥" },
          { word: "ஈ", translit: "ee", meaning: "Eecham (Fly)",    emoji: "🪰" },
        ],
        quiz: [
          { type: "mcq", emoji: "🐐", question: "Aadu starts with?", options: ["அ","ஆ","இ","ஈ"], answer: "ஆ" },
          { type: "fill", emoji: "👦", question: "First Tamil vowel (type letter):", answer: "அ" },
          { type: "mcq", emoji: "🍥", question: "Idli starts with?", options: ["அ","ஆ","இ","ஈ"], answer: "இ" },
        ],
      },
      {
        id: `${prefix}-2`, title: "Numbers 1–5", emoji: "🔢",
        color: "from-teal-400 to-cyan-500",
        intro: "Count one to five in Tamil.",
        words: [
          { word: "ஒன்று",  translit: "ondru",  meaning: "One",   emoji: "1️⃣" },
          { word: "இரண்டு", translit: "irandu", meaning: "Two",   emoji: "2️⃣" },
          { word: "மூன்று",  translit: "moondru",meaning: "Three", emoji: "3️⃣" },
          { word: "நான்கு",  translit: "naangu", meaning: "Four",  emoji: "4️⃣" },
          { word: "ஐந்து",   translit: "ainthu", meaning: "Five",  emoji: "5️⃣" },
        ],
        quiz: [
          { type: "mcq", emoji: "3️⃣", question: "Three in Tamil?", options: ["ஒன்று","இரண்டு","மூன்று","ஐந்து"], answer: "மூன்று" },
          { type: "mcq", emoji: "5️⃣", question: "Ainthu means?", options: ["Two","Three","Four","Five"], answer: "Five" },
          { type: "fill", emoji: "1️⃣", question: "Meaning of ஒன்று:", answer: "One" },
        ],
      },
      {
        id: `${prefix}-3`, title: "Fruits & Animals", emoji: "🍎",
        color: "from-emerald-500 to-green-600",
        intro: "பழங்கள் மற்றும் விலங்குகள்",
        words: [
          { word: "ஆப்பிள்",  translit: "aappil", meaning: "Apple", emoji: "🍎" },
          { word: "வாழைப்பழம்", translit: "vaazhaipazham", meaning: "Banana", emoji: "🍌" },
          { word: "நாய்",     translit: "naai",   meaning: "Dog",   emoji: "🐶" },
          { word: "பூனை",    translit: "poonai", meaning: "Cat",   emoji: "🐱" },
        ],
        quiz: [
          { type: "mcq", emoji: "🐶", question: "Naai means?", options: ["Cat","Dog","Cow","Lion"], answer: "Dog" },
          { type: "mcq", emoji: "🍌", question: "Banana in Tamil?", options: ["ஆப்பிள்","வாழைப்பழம்","நாய்","பூனை"], answer: "வாழைப்பழம்" },
          { type: "fill", emoji: "🐱", question: "Meaning of பூனை:", answer: "Cat" },
        ],
      },
    ]);
  }

  if (lang === "ta" && level === "intermediate") {
    return chain([
      {
        id: `${prefix}-1`, title: "Easy Sentences", emoji: "💬",
        color: "from-teal-400 to-emerald-500",
        intro: "எளிய தினசரி வாக்கியங்கள்",
        words: [
          { word: "இது பூனை.", translit: "Idhu poonai.", meaning: "This is a cat.", emoji: "🐱" },
          { word: "எனக்கு ஆப்பிள் பிடிக்கும்.", translit: "Enakku aappil pidikkum.", meaning: "I like apple.", emoji: "🍎" },
          { word: "அவள் மகிழ்ச்சி.", translit: "Aval magizhchi.", meaning: "She is happy.", emoji: "😊" },
        ],
        quiz: [
          { type: "mcq", emoji: "🐱", question: "Idhu poonai means?", options: ["This is a dog","This is a cat","She is a cat","I am a cat"], answer: "This is a cat" },
          { type: "fill", emoji: "🍎", question: "I like apple → Enakku aappil ___.", answer: "pidikkum" },
          { type: "mcq", emoji: "😊", question: "Magizhchi means?", options: ["Sad","Tired","Happy","Angry"], answer: "Happy" },
        ],
      },
    ]);
  }

  if (lang === "ta" && level === "expert") {
    return chain([
      {
        id: `${prefix}-1`, title: "Reading Time", emoji: "📖",
        color: "from-fuchsia-500 to-purple-600",
        intro: "சிறு வரிகளை படியுங்கள்.",
        words: [
          { word: "சூரியன் பிரகாசிக்கிறது.", translit: "Sooriyan pirakaasikkirathu.", meaning: "The sun is shining.", emoji: "☀️" },
          { word: "பறவைகள் பறக்கின்றன.", translit: "Paravaigal parakkindrana.", meaning: "Birds are flying.", emoji: "🐦" },
        ],
        quiz: [
          { type: "mcq", emoji: "☀️", question: "Sooriyan means?", options: ["Moon","Sun","Star","Cloud"], answer: "Sun" },
          { type: "mcq", emoji: "🐦", question: "What are birds doing?", options: ["Sleeping","Flying","Eating","Sitting"], answer: "Flying" },
        ],
      },
    ]);
  }

  return [];
};

/* ---------------- Streak helper (UI-only, localStorage) ---------------- */

const STREAK_KEY = "kidspal_streak_days_v1";
const dayShort = ["S","M","T","W","T","F","S"]; // Sun..Sat
const todayKey = () => new Date().toISOString().slice(0, 10);

const getStreakDays = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) || "[]");
  } catch { return []; }
};
const markTodayActive = () => {
  const today = todayKey();
  const days = getStreakDays();
  if (!days.includes(today)) {
    days.push(today);
    localStorage.setItem(STREAK_KEY, JSON.stringify(days.slice(-30)));
  }
};
// returns array of 7 booleans Sun..Sat for current week
const weekActivity = (): boolean[] => {
  const set = new Set(getStreakDays());
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return set.has(d.toISOString().slice(0, 10));
  });
};

/* ---------------- Component ---------------- */

type Screen = "language" | "level" | "list" | "topic" | "quiz";

const normalizeApiLesson = (lesson: ApiLesson, nextId?: string): Lesson => ({
  id: lesson.id,
  title: lesson.title,
  emoji: lesson.emoji || "\u{1F4D8}",
  color: lesson.color || "from-sky-400 to-indigo-500",
  intro: lesson.intro || lesson.description || "Practice these cards, then take the quiz.",
  words: (lesson.words || []).map((word) => ({
    word: word.word,
    translit: word.translit || undefined,
    meaning: word.meaning || undefined,
    emoji: word.emoji || "\u2728",
  })),
  quiz: (lesson.quiz || lesson.quizzes?.[0]?.questions || []) as QuizQuestion[],
  nextId,
});

const LearnPage = () => {
  const { profile, addStars, addXP, addCoins, incrementStreak, completeLesson } = useChild();
  const { token } = useAuth();

  const [screen, setScreen] = useState<Screen>("language");
  const [lang, setLang] = useState<LangCode | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [showVoice, setShowVoice] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [rewardData, setRewardData] = useState({ stars: 0, xp: 0, coins: 0 });
  const [week, setWeek] = useState<boolean[]>(() => weekActivity());
  const [remoteLessons, setRemoteLessons] = useState<Lesson[] | null>(null);

  const fallbackLessons = useMemo<Lesson[]>(
    () => (lang && level ? buildLessons(lang, level) : []),
    [lang, level]
  );

  useEffect(() => {
    if (!lang || !level) {
      setRemoteLessons(null);
      return;
    }
    let mounted = true;
    setRemoteLessons(null);
    contentApi
      .listLessons({ language: lang, level })
      .then(({ lessons }) => {
        if (!mounted) return;
        const normalized = lessons.map((lesson, index) => normalizeApiLesson(lesson, lessons[index + 1]?.id));
        setRemoteLessons(normalized.length ? normalized : null);
      })
      .catch(() => {
        if (mounted) setRemoteLessons(null);
      });
    return () => {
      mounted = false;
    };
  }, [lang, level]);

  const lessons = remoteLessons || fallbackLessons;

  // First lesson is always unlocked
  const firstLessonId = lessons[0]?.id;
  const isUnlocked = (id: string) =>
    id === firstLessonId || (profile?.unlockedLessons ?? []).includes(id);
  const isCompleted = (id: string) => (profile?.completedLessons ?? []).includes(id);

  const langInfo = LANGUAGES.find(l => l.code === lang);
  const levelInfo = LEVELS.find(l => l.code === level);

  /* --- handlers --- */
  const openLesson = (lesson: Lesson) => {
    if (!isUnlocked(lesson.id)) return;
    setActiveLesson(lesson);
    setWordIndex(0);
    setScreen("topic");
  };

  const handleQuizComplete = (stars: number) => {
    if (!activeLesson) return;
    const xpGained = stars * 15;
    const coinsGained = stars * 5;
    addStars(stars);
    addXP(xpGained);
    addCoins(coinsGained);

    // Streak: only increment if first lesson completed today
    const today = todayKey();
    const days = getStreakDays();
    if (!days.includes(today)) {
      incrementStreak();
      markTodayActive();
      setWeek(weekActivity());
    }

    completeLesson(activeLesson.id, activeLesson.nextId);
    contentApi.updateProgress({
      contentType: "LESSON",
      contentId: activeLesson.id,
      progressPercentage: 100,
      isCompleted: true,
    }, token).catch(() => undefined);
    contentApi.claimReward({
      stars,
      coins: coinsGained,
      xp: xpGained,
      reason: `Completed lesson: ${activeLesson.title}`,
      sourceType: "LESSON",
      sourceId: activeLesson.id,
    }, token).catch(() => undefined);
    setRewardData({ stars, xp: xpGained, coins: coinsGained });
    setShowReward(true);
    setScreen("list");
    setActiveLesson(null);
  };

  const currentWord = activeLesson?.words[wordIndex];

  // Reset deeper state when going back to root
  const goLanguageHome = () => {
    setLang(null); setLevel(null); setActiveLesson(null); setScreen("language");
  };
  const goLevelHome = () => {
    setLevel(null); setActiveLesson(null); setScreen("level");
  };
  const goLessonList = () => {
    setActiveLesson(null); setScreen("list");
  };

  useEffect(() => { setWeek(weekActivity()); }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <SceneBackground image={storiesBg} alt="Enchanted learning library" variant="library" />
      <NavBar />

      <RewardPopup
        show={showReward}
        stars={rewardData.stars}
        xp={rewardData.xp}
        coins={rewardData.coins}
        message="Lesson Complete! 🎓"
        onClose={() => setShowReward(false)}
      />

      <AnimatePresence>
        {showVoice && currentWord && (
          <VoiceInteraction word={currentWord.word.split(" ")[0]} onClose={() => setShowVoice(false)} />
        )}
      </AnimatePresence>

      <div className="page-shell max-w-2xl">
        {/* ---------- Header ---------- */}
        <motion.div
          className="page-header"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h1 className="page-heading flex items-center justify-center gap-2 sm:gap-3">
            🎓 Language Learning
          </h1>
          <p className="text-muted-foreground mt-1">
            {screen === "language" && "Pick a language to start your adventure!"}
            {screen === "level"    && langInfo && `Choose difficulty for ${langInfo.name}`}
            {screen === "list"     && langInfo && levelInfo && `${langInfo.name} • ${levelInfo.title}`}
            {(screen === "topic" || screen === "quiz") && activeLesson && activeLesson.title}
          </p>
        </motion.div>

        {/* ---------- Stats / Streak ---------- */}
        {profile && (
          <motion.div
            className="mb-6 p-4 rounded-2xl border border-white/30 backdrop-blur-xl"
            style={{ background: "rgba(255,255,255,0.1)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">Level {profile.level}</span>
                <span className="text-white/60 text-xs">• {profile.xp} / {profile.level * 100} XP</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/30 border border-orange-300/40">
                <Flame className="w-3.5 h-3.5 text-orange-300" />
                <span className="text-orange-100 text-xs font-bold">{profile.streak} day streak</span>
              </div>
            </div>

            <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden mb-3">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 via-pink-400 to-purple-400 rounded-full"
                animate={{ width: `${Math.min(100, profile.xp % 100)}%` }}
                transition={{ type: "spring", stiffness: 80 }}
              />
            </div>

            {/* Weekly streak Sun..Sat */}
            <div className="flex items-center justify-between">
              {week.map((active, i) => {
                const isToday = i === new Date().getDay();
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className={`text-[10px] font-bold ${isToday ? "text-amber-200" : "text-white/60"}`}>
                      {dayShort[i]}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center border ${
                        active
                          ? "bg-gradient-to-br from-orange-400 to-rose-500 border-orange-200 shadow-[0_0_12px_rgba(255,140,80,0.6)]"
                          : isToday
                          ? "bg-white/10 border-amber-300/60"
                          : "bg-white/5 border-white/20"
                      }`}
                    >
                      {active ? (
                        <Flame className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <span className="text-[10px] text-white/40">·</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-white/70">
              <span>⭐ {profile.stars} stars</span>
              <span>🪙 {profile.coins} coins</span>
            </div>
          </motion.div>
        )}

        {/* ---------- SCREEN: LANGUAGE ---------- */}
        {screen === "language" && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          >
            <div className="flex items-center gap-2 mb-3 text-white/80">
              <Languages className="w-4 h-4" />
              <span className="text-sm font-bold">Choose your language</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {LANGUAGES.map(L => (
                <motion.button
                  key={L.code}
                  variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
                  onClick={() => { setLang(L.code); setScreen("level"); }}
                  whileHover={{ scale: 1.04, y: -4 }}
                  whileTap={{ scale: 0.96 }}
                  className={`relative p-5 sm:p-6 rounded-3xl border border-white/40 text-left overflow-hidden bg-gradient-to-br ${L.gradient} shadow-xl`}
                  style={{ boxShadow: "0 14px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.4)" }}
                >
                  <div className="absolute -top-6 -right-6 text-7xl opacity-25 select-none">{L.flag}</div>
                  <div className="text-3xl mb-2">{L.flag}</div>
                  <div className="font-display text-xl font-extrabold text-white drop-shadow">
                    {L.name}
                  </div>
                  <div className="text-white/85 text-sm font-semibold mt-0.5">
                    {L.native}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ---------- SCREEN: LEVEL ---------- */}
        {screen === "level" && langInfo && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={goLanguageHome}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-bold mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Change language
            </button>

            <div className="flex items-center gap-2 mb-3 text-white/80">
              <GraduationCap className="w-4 h-4" />
              <span className="text-sm font-bold">Pick your level for {langInfo.name}</span>
            </div>

            <div className="space-y-3">
              {LEVELS.map(L => (
                <motion.button
                  key={L.code}
                  onClick={() => { setLevel(L.code); setScreen("list"); }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center gap-4 p-4 sm:p-5 rounded-3xl border border-white/40 text-left bg-gradient-to-r ${L.gradient} shadow-xl`}
                  style={{ boxShadow: "0 12px 30px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.4)" }}
                >
                  <div className="text-4xl flex-shrink-0">{L.emoji}</div>
                  <div className="flex-1">
                    <div className="font-display text-lg sm:text-xl font-extrabold text-white drop-shadow">
                      {L.title}
                    </div>
                    <div className="text-white/90 text-xs sm:text-sm">{L.desc}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/90" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ---------- SCREEN: LESSON LIST ---------- */}
        {screen === "list" && langInfo && levelInfo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button
              onClick={goLevelHome}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-bold mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Change level
            </button>

            <div
              className="mb-4 p-3 rounded-2xl border border-white/30 flex items-center gap-3"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br ${langInfo.gradient}`}>
                {langInfo.flag}
              </div>
              <div className="flex-1">
                <div className="text-white font-bold">{langInfo.name} <span className="text-white/60 font-normal">• {levelInfo.title}</span></div>
                <div className="text-white/60 text-xs">{levelInfo.desc}</div>
              </div>
            </div>

            {/* Lessons Top Promo Ad */}
            <AdSlot slot="LESSONS_TOP" className="mb-4" />

            {lessons.length === 0 && (
              <div className="text-center text-white/70 py-12">More lessons coming soon for this level! 🌟</div>
            )}

            <motion.div
              className="space-y-3"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            >
              {lessons.map((lesson) => {
                const unlocked = isUnlocked(lesson.id);
                const completed = isCompleted(lesson.id);
                return (
                  <motion.button
                    key={lesson.id}
                    variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
                    onClick={() => openLesson(lesson)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                      unlocked ? "border-white/40 hover:border-white/60" : "border-white/20 opacity-60 cursor-not-allowed"
                    }`}
                    style={{
                      background: unlocked
                        ? "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 100%)"
                        : "rgba(0,0,0,0.2)",
                      backdropFilter: "blur(16px)",
                    }}
                    whileHover={unlocked ? { scale: 1.02, x: 4 } : {}}
                    whileTap={unlocked ? { scale: 0.98 } : {}}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 bg-gradient-to-br ${lesson.color} shadow-lg ${!unlocked ? "grayscale" : ""}`}
                    >
                      {!unlocked ? <Lock className="w-6 h-6 text-white" /> : lesson.emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-base font-extrabold text-white drop-shadow-md truncate">
                        {lesson.title}
                      </h3>
                      <p className="text-white/60 text-xs mt-0.5">
                        {lesson.words.length} cards • {lesson.quiz.length} questions
                      </p>
                      {completed && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-green-400 text-xs font-bold">Completed!</span>
                        </div>
                      )}
                      {!unlocked && (
                        <p className="text-white/40 text-xs mt-0.5">Finish previous lesson to unlock</p>
                      )}
                    </div>

                    {unlocked && <ChevronRight className="w-5 h-5 text-white/60 flex-shrink-0" />}
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Lessons Bottom Promo Ad */}
            <AdSlot slot="LESSONS_BOTTOM" className="mt-6" />
          </motion.div>
        )}

        {/* ---------- SCREEN: TOPIC ---------- */}
        {screen === "topic" && activeLesson && (
          <motion.div
            className="max-w-sm mx-auto"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <button
              onClick={goLessonList}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-bold mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Lessons
            </button>

            <div
              className="p-6 sm:p-8 rounded-[32px] border border-white/40 shadow-2xl backdrop-blur-2xl text-center"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)" }}
            >
              {/* Progress */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
                    animate={{ width: `${((wordIndex + 1) / activeLesson.words.length) * 100}%` }}
                  />
                </div>
                <span className="text-white/70 text-xs font-bold">{wordIndex + 1}/{activeLesson.words.length}</span>
              </div>

              <h2 className="font-display text-xl font-extrabold text-white drop-shadow-md mb-1">
                {activeLesson.title}
              </h2>
              <p className="text-white/70 text-xs mb-4">{activeLesson.intro}</p>

              <AnimatePresence mode="wait">
                <motion.div
                  key={wordIndex}
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -40, opacity: 0 }}
                >
                  <div className="text-7xl mb-3">{currentWord?.emoji}</div>
                  <h3 className="font-display text-3xl font-extrabold text-white drop-shadow-lg mb-1">
                    {currentWord?.word}
                  </h3>
                  {currentWord?.translit && (
                    <p className="text-amber-200 text-sm italic">/{currentWord.translit}/</p>
                  )}
                  {currentWord?.meaning && (
                    <p className="text-white/80 text-sm mt-1">{currentWord.meaning}</p>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Voice buttons */}
              <div className="flex items-center justify-center gap-3 mt-6 mb-6">
                <motion.button
                  onClick={() => setShowVoice(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-white border border-white/30"
                  style={{ background: "linear-gradient(135deg, rgba(130,60,220,0.7), rgba(200,80,180,0.7))" }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Mic className="w-4 h-4" /> Repeat
                </motion.button>
                <motion.button
                  onClick={() => setShowVoice(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-white border border-white/30 bg-white/10"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Volume2 className="w-4 h-4" /> Listen
                </motion.button>
              </div>

              {/* Navigation */}
              <div className="flex gap-3 justify-between">
                <button
                  onClick={() => setWordIndex(i => Math.max(0, i - 1))}
                  disabled={wordIndex === 0}
                  className="px-5 py-2.5 rounded-2xl font-bold text-white border border-white/30 bg-white/10 disabled:opacity-30"
                >
                  ← Back
                </button>

                {wordIndex < activeLesson.words.length - 1 ? (
                  <motion.button
                    onClick={() => setWordIndex(i => i + 1)}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl font-display font-bold text-amber-950"
                    style={{ background: "linear-gradient(135deg, #FFE0A3 0%, #E89A4A 100%)" }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={() => setScreen("quiz")}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl font-display font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg, rgba(80,200,80,0.7), rgba(40,160,100,0.7))",
                      border: "1px solid rgba(255,255,255,0.3)",
                    }}
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    whileHover={{ scale: 1.07 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Star className="w-4 h-4 text-amber-300 fill-amber-300" /> Take Quiz!
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ---------- SCREEN: QUIZ ---------- */}
        {screen === "quiz" && activeLesson && (
          <QuizScreen
            questions={activeLesson.quiz}
            onComplete={handleQuizComplete}
            onBack={() => setScreen("topic")}
          />
        )}
      </div>
    </div>
  );
};

export default LearnPage;
