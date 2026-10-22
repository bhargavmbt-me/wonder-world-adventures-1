// StoryNest Ads — Frontend Placement Config (mirrors backend ads.config.js)
// This is the frontend copy of the single source of truth.

export const AD_FORMATS = {
  BANNER: "BANNER", CARD: "CARD", POPUP: "POPUP",
  BOTTOM_SHEET: "BOTTOM_SHEET", FULLSCREEN: "FULLSCREEN",
  VIDEO: "VIDEO", INLINE_CONTENT: "INLINE_CONTENT",
} as const;

export const DEVICE_TARGETS = { ALL: "ALL", MOBILE: "MOBILE", TABLET: "TABLET", DESKTOP: "DESKTOP" } as const;
export const AD_STATUS = { DRAFT: "DRAFT", ACTIVE: "ACTIVE", SCHEDULED: "SCHEDULED", EXPIRED: "EXPIRED", DISABLED: "DISABLED" } as const;
export const SCREENS = { HOME: "HOME", STORIES: "STORIES", STORY_READER: "STORY_READER", STORYWEAVER: "STORYWEAVER", LESSONS: "LESSONS", LESSON_READER: "LESSON_READER", GAMES: "GAMES", LIFE_SKILLS: "LIFE_SKILLS", CHAT: "CHAT", PARENTS: "PARENTS", SUBSCRIPTION: "SUBSCRIPTION", PROFILE: "PROFILE" } as const;
export const POPUP_TRIGGERS = { ON_PAGE_LOAD: "ON_PAGE_LOAD", AFTER_DELAY: "AFTER_DELAY", AFTER_CONTENT: "AFTER_CONTENT", ON_EXIT_INTENT: "ON_EXIT_INTENT" } as const;
export const CTA_OPTIONS = ["Learn More","Subscribe","Explore","Play Now","Read Now","Start Learning","Get Started","Try Free","Discover"];
export const ALLOWED_IMAGE_TYPES = ["image/png","image/jpeg","image/jpg","image/webp"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4","video/webm"];

export type AdFormat = keyof typeof AD_FORMATS;
export type DeviceTarget = keyof typeof DEVICE_TARGETS;
export type AdStatus = keyof typeof AD_STATUS;
export type Screen = keyof typeof SCREENS;
export type PopupTrigger = keyof typeof POPUP_TRIGGERS;

export interface SlotDimensions { width: number; height: number; }
export interface SlotSpec {
  slot: string;
  screen: string;
  label: string;
  formats: AdFormat[];
  devices: DeviceTarget[];
  dimensions: { desktop: SlotDimensions; tablet: SlotDimensions; mobile: SlotDimensions; };
  aspectRatio: string;
  maxSizeKB: { desktop: number; tablet: number; mobile: number; };
  objectFit: "cover" | "contain";
  triggers?: string[];
}

export const SLOT_SPECS: Record<string, SlotSpec> = {
  HOME_TOP:{ slot:"HOME_TOP", screen:"HOME", label:"Home — Top Banner", formats:["BANNER","VIDEO"], devices:["ALL"], dimensions:{desktop:{width:1200,height:300},tablet:{width:1024,height:260},mobile:{width:720,height:240}}, aspectRatio:"4:1", maxSizeKB:{desktop:800,tablet:600,mobile:400}, objectFit:"cover" },
  HOME_AFTER_HERO:{ slot:"HOME_AFTER_HERO", screen:"HOME", label:"Home — After Hero Section", formats:["BANNER","CARD"], devices:["ALL"], dimensions:{desktop:{width:1200,height:250},tablet:{width:1024,height:220},mobile:{width:720,height:200}}, aspectRatio:"5:1", maxSizeKB:{desktop:600,tablet:500,mobile:350}, objectFit:"cover" },
  HOME_BETWEEN_SECTIONS:{ slot:"HOME_BETWEEN_SECTIONS", screen:"HOME", label:"Home — Between Sections", formats:["BANNER","CARD","INLINE_CONTENT"], devices:["ALL"], dimensions:{desktop:{width:1200,height:300},tablet:{width:1024,height:280},mobile:{width:720,height:240}}, aspectRatio:"4:1", maxSizeKB:{desktop:600,tablet:500,mobile:350}, objectFit:"cover" },
  HOME_BOTTOM:{ slot:"HOME_BOTTOM", screen:"HOME", label:"Home — Bottom", formats:["BANNER","CARD"], devices:["ALL"], dimensions:{desktop:{width:1200,height:200},tablet:{width:1024,height:180},mobile:{width:720,height:160}}, aspectRatio:"6:1", maxSizeKB:{desktop:500,tablet:400,mobile:300}, objectFit:"cover" },
  HOME_POPUP:{ slot:"HOME_POPUP", screen:"HOME", label:"Home — Popup", formats:["POPUP"], devices:["ALL"], dimensions:{desktop:{width:800,height:600},tablet:{width:700,height:520},mobile:{width:600,height:800}}, aspectRatio:"3:4", maxSizeKB:{desktop:1000,tablet:800,mobile:600}, objectFit:"contain", triggers:["ON_PAGE_LOAD","AFTER_DELAY"] },
  STORIES_TOP:{ slot:"STORIES_TOP", screen:"STORIES", label:"Stories — Top Banner", formats:["BANNER","VIDEO"], devices:["ALL"], dimensions:{desktop:{width:1200,height:250},tablet:{width:1024,height:220},mobile:{width:720,height:200}}, aspectRatio:"5:1", maxSizeKB:{desktop:700,tablet:550,mobile:400}, objectFit:"cover" },
  STORIES_BETWEEN_CARDS:{ slot:"STORIES_BETWEEN_CARDS", screen:"STORIES", label:"Stories — Between Cards", formats:["CARD","INLINE_CONTENT","BANNER"], devices:["ALL"], dimensions:{desktop:{width:800,height:450},tablet:{width:700,height:394},mobile:{width:640,height:360}}, aspectRatio:"16:9", maxSizeKB:{desktop:600,tablet:500,mobile:400}, objectFit:"cover" },
  STORIES_BOTTOM:{ slot:"STORIES_BOTTOM", screen:"STORIES", label:"Stories — Bottom", formats:["BANNER","CARD"], devices:["ALL"], dimensions:{desktop:{width:1200,height:200},tablet:{width:1024,height:180},mobile:{width:720,height:160}}, aspectRatio:"6:1", maxSizeKB:{desktop:500,tablet:400,mobile:300}, objectFit:"cover" },
  STORYWEAVER_TOP:{ slot:"STORYWEAVER_TOP", screen:"STORYWEAVER", label:"StoryWeaver — Top Banner", formats:["BANNER","VIDEO"], devices:["ALL"], dimensions:{desktop:{width:1200,height:250},tablet:{width:1024,height:220},mobile:{width:720,height:200}}, aspectRatio:"5:1", maxSizeKB:{desktop:700,tablet:550,mobile:400}, objectFit:"cover" },
  STORYWEAVER_BETWEEN_CARDS:{ slot:"STORYWEAVER_BETWEEN_CARDS", screen:"STORYWEAVER", label:"StoryWeaver — Between Story Cards", formats:["CARD","INLINE_CONTENT","BANNER"], devices:["ALL"], dimensions:{desktop:{width:800,height:450},tablet:{width:700,height:394},mobile:{width:640,height:360}}, aspectRatio:"16:9", maxSizeKB:{desktop:600,tablet:500,mobile:400}, objectFit:"cover" },
  STORYWEAVER_BOTTOM:{ slot:"STORYWEAVER_BOTTOM", screen:"STORYWEAVER", label:"StoryWeaver — Bottom", formats:["BANNER","CARD"], devices:["ALL"], dimensions:{desktop:{width:1200,height:200},tablet:{width:1024,height:180},mobile:{width:720,height:160}}, aspectRatio:"6:1", maxSizeKB:{desktop:500,tablet:400,mobile:300}, objectFit:"cover" },
  STORY_READER_BETWEEN_PAGES:{ slot:"STORY_READER_BETWEEN_PAGES", screen:"STORY_READER", label:"Story Reader — Between Pages", formats:["FULLSCREEN","BANNER"], devices:["ALL"], dimensions:{desktop:{width:1024,height:600},tablet:{width:768,height:576},mobile:{width:390,height:844}}, aspectRatio:"9:16", maxSizeKB:{desktop:1200,tablet:1000,mobile:800}, objectFit:"cover", triggers:["AFTER_CONTENT"] },
  STORY_READER_AFTER_STORY:{ slot:"STORY_READER_AFTER_STORY", screen:"STORY_READER", label:"Story Reader — After Story", formats:["FULLSCREEN","CARD","POPUP"], devices:["ALL"], dimensions:{desktop:{width:800,height:600},tablet:{width:700,height:525},mobile:{width:390,height:844}}, aspectRatio:"9:16", maxSizeKB:{desktop:1200,tablet:1000,mobile:800}, objectFit:"contain", triggers:["AFTER_CONTENT"] },
  LESSONS_TOP:{ slot:"LESSONS_TOP", screen:"LESSONS", label:"Lessons — Top Banner", formats:["BANNER","VIDEO"], devices:["ALL"], dimensions:{desktop:{width:1200,height:250},tablet:{width:1024,height:220},mobile:{width:720,height:200}}, aspectRatio:"5:1", maxSizeKB:{desktop:700,tablet:550,mobile:400}, objectFit:"cover" },
  LESSONS_BETWEEN:{ slot:"LESSONS_BETWEEN", screen:"LESSONS", label:"Lessons — Between Cards", formats:["CARD","INLINE_CONTENT"], devices:["ALL"], dimensions:{desktop:{width:800,height:450},tablet:{width:700,height:394},mobile:{width:640,height:360}}, aspectRatio:"16:9", maxSizeKB:{desktop:600,tablet:500,mobile:400}, objectFit:"cover" },
  LESSONS_BOTTOM:{ slot:"LESSONS_BOTTOM", screen:"LESSONS", label:"Lessons — Bottom", formats:["BANNER","CARD"], devices:["ALL"], dimensions:{desktop:{width:1200,height:200},tablet:{width:1024,height:180},mobile:{width:720,height:160}}, aspectRatio:"6:1", maxSizeKB:{desktop:500,tablet:400,mobile:300}, objectFit:"cover" },
  LESSON_READER_AFTER_LESSON:{ slot:"LESSON_READER_AFTER_LESSON", screen:"LESSON_READER", label:"Lesson Reader — After Lesson", formats:["FULLSCREEN","CARD","POPUP"], devices:["ALL"], dimensions:{desktop:{width:800,height:600},tablet:{width:700,height:525},mobile:{width:390,height:844}}, aspectRatio:"9:16", maxSizeKB:{desktop:1200,tablet:1000,mobile:800}, objectFit:"contain", triggers:["AFTER_CONTENT"] },
  GAMES_TOP:{ slot:"GAMES_TOP", screen:"GAMES", label:"Games — Top Banner", formats:["BANNER","VIDEO"], devices:["ALL"], dimensions:{desktop:{width:1200,height:250},tablet:{width:1024,height:220},mobile:{width:720,height:200}}, aspectRatio:"5:1", maxSizeKB:{desktop:700,tablet:550,mobile:400}, objectFit:"cover" },
  GAMES_BETWEEN:{ slot:"GAMES_BETWEEN", screen:"GAMES", label:"Games — Between Cards", formats:["CARD","INLINE_CONTENT"], devices:["ALL"], dimensions:{desktop:{width:800,height:450},tablet:{width:700,height:394},mobile:{width:640,height:360}}, aspectRatio:"16:9", maxSizeKB:{desktop:600,tablet:500,mobile:400}, objectFit:"cover" },
  GAMES_AFTER_GAME:{ slot:"GAMES_AFTER_GAME", screen:"GAMES", label:"Games — After Game Completion", formats:["FULLSCREEN","POPUP","CARD"], devices:["ALL"], dimensions:{desktop:{width:800,height:600},tablet:{width:700,height:525},mobile:{width:390,height:844}}, aspectRatio:"9:16", maxSizeKB:{desktop:1200,tablet:1000,mobile:800}, objectFit:"contain", triggers:["AFTER_CONTENT"] },
  GAMES_BOTTOM:{ slot:"GAMES_BOTTOM", screen:"GAMES", label:"Games — Bottom", formats:["BANNER"], devices:["ALL"], dimensions:{desktop:{width:1200,height:200},tablet:{width:1024,height:180},mobile:{width:720,height:160}}, aspectRatio:"6:1", maxSizeKB:{desktop:500,tablet:400,mobile:300}, objectFit:"cover" },
  LIFE_SKILLS_TOP:{ slot:"LIFE_SKILLS_TOP", screen:"LIFE_SKILLS", label:"Life Skills — Top Banner", formats:["BANNER"], devices:["ALL"], dimensions:{desktop:{width:1200,height:250},tablet:{width:1024,height:220},mobile:{width:720,height:200}}, aspectRatio:"5:1", maxSizeKB:{desktop:700,tablet:550,mobile:400}, objectFit:"cover" },
  LIFE_SKILLS_BETWEEN:{ slot:"LIFE_SKILLS_BETWEEN", screen:"LIFE_SKILLS", label:"Life Skills — Between Cards", formats:["CARD","INLINE_CONTENT"], devices:["ALL"], dimensions:{desktop:{width:800,height:450},tablet:{width:700,height:394},mobile:{width:640,height:360}}, aspectRatio:"16:9", maxSizeKB:{desktop:600,tablet:500,mobile:400}, objectFit:"cover" },
  PARENTS_TOP:{ slot:"PARENTS_TOP", screen:"PARENTS", label:"Parents — Top Banner", formats:["BANNER","CARD"], devices:["ALL"], dimensions:{desktop:{width:1200,height:250},tablet:{width:1024,height:220},mobile:{width:720,height:200}}, aspectRatio:"5:1", maxSizeKB:{desktop:700,tablet:550,mobile:400}, objectFit:"cover" },
  SUBSCRIPTION_TOP:{ slot:"SUBSCRIPTION_TOP", screen:"SUBSCRIPTION", label:"Subscription — Top Promo Banner", formats:["BANNER","CARD"], devices:["ALL"], dimensions:{desktop:{width:1200,height:300},tablet:{width:1024,height:260},mobile:{width:720,height:240}}, aspectRatio:"4:1", maxSizeKB:{desktop:800,tablet:600,mobile:400}, objectFit:"cover" },
  CHAT_TOP:{ slot:"CHAT_TOP", screen:"CHAT", label:"Chat — Top Banner", formats:["BANNER"], devices:["ALL"], dimensions:{desktop:{width:1200,height:200},tablet:{width:1024,height:180},mobile:{width:720,height:160}}, aspectRatio:"6:1", maxSizeKB:{desktop:500,tablet:400,mobile:300}, objectFit:"cover" },
};

export const getAllSlotKeys = (): string[] => Object.keys(SLOT_SPECS);
export const getSlotSpec = (slot: string): SlotSpec | null => SLOT_SPECS[slot] || null;
export const getSlotsForScreen = (screen: string): SlotSpec[] => Object.values(SLOT_SPECS).filter(s => s.screen === screen);
export const isValidSlot = (slot: string): boolean => !!SLOT_SPECS[slot];
export const isFormatSupportedForSlot = (format: string, slot: string): boolean => {
  const spec = SLOT_SPECS[slot];
  return spec ? (spec.formats as string[]).includes(format) : false;
};
