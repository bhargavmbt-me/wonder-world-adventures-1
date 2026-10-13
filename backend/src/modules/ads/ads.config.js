/**
 * StoryNest Ads — Centralized Placement Configuration
 * Single source of truth for all ad slots, formats, devices, and dimension specs.
 */

const SCREENS = {
  HOME: "HOME", STORIES: "STORIES", STORY_READER: "STORY_READER",
  LESSONS: "LESSONS", LESSON_READER: "LESSON_READER", GAMES: "GAMES",
  LIFE_SKILLS: "LIFE_SKILLS", CHAT: "CHAT", PARENTS: "PARENTS",
  SUBSCRIPTION: "SUBSCRIPTION", PROFILE: "PROFILE",
};

const AD_FORMATS = {
  BANNER: "BANNER", CARD: "CARD", POPUP: "POPUP",
  BOTTOM_SHEET: "BOTTOM_SHEET", FULLSCREEN: "FULLSCREEN",
  VIDEO: "VIDEO", INLINE_CONTENT: "INLINE_CONTENT",
};

const DEVICE_TARGETS = { ALL: "ALL", MOBILE: "MOBILE", TABLET: "TABLET", DESKTOP: "DESKTOP" };
const AD_STATUS = { DRAFT: "DRAFT", ACTIVE: "ACTIVE", SCHEDULED: "SCHEDULED", EXPIRED: "EXPIRED", DISABLED: "DISABLED" };
const CTA_OPTIONS = ["Learn More","Subscribe","Explore","Play Now","Read Now","Start Learning","Get Started","Try Free","Discover"];
const ALLOWED_IMAGE_TYPES = ["image/png","image/jpeg","image/jpg","image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4","video/webm"];
const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const POPUP_TRIGGERS = { ON_PAGE_LOAD:"ON_PAGE_LOAD", AFTER_DELAY:"AFTER_DELAY", AFTER_CONTENT:"AFTER_CONTENT", ON_EXIT_INTENT:"ON_EXIT_INTENT" };

const SLOT_SPECS = {
  HOME_TOP:{ slot:"HOME_TOP", screen:SCREENS.HOME, label:"Home — Top Banner", formats:[AD_FORMATS.BANNER,AD_FORMATS.VIDEO], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:1200,height:300},tablet:{width:1024,height:260},mobile:{width:720,height:240}}, aspectRatio:"4:1", maxSizeKB:{desktop:800,tablet:600,mobile:400}, objectFit:"cover" },
  HOME_AFTER_HERO:{ slot:"HOME_AFTER_HERO", screen:SCREENS.HOME, label:"Home — After Hero Section", formats:[AD_FORMATS.BANNER,AD_FORMATS.CARD], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:1200,height:250},tablet:{width:1024,height:220},mobile:{width:720,height:200}}, aspectRatio:"5:1", maxSizeKB:{desktop:600,tablet:500,mobile:350}, objectFit:"cover" },
  HOME_BETWEEN_SECTIONS:{ slot:"HOME_BETWEEN_SECTIONS", screen:SCREENS.HOME, label:"Home — Between Sections", formats:[AD_FORMATS.BANNER,AD_FORMATS.CARD,AD_FORMATS.INLINE_CONTENT], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:1200,height:300},tablet:{width:1024,height:280},mobile:{width:720,height:240}}, aspectRatio:"4:1", maxSizeKB:{desktop:600,tablet:500,mobile:350}, objectFit:"cover" },
  HOME_BOTTOM:{ slot:"HOME_BOTTOM", screen:SCREENS.HOME, label:"Home — Bottom", formats:[AD_FORMATS.BANNER,AD_FORMATS.CARD], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:1200,height:200},tablet:{width:1024,height:180},mobile:{width:720,height:160}}, aspectRatio:"6:1", maxSizeKB:{desktop:500,tablet:400,mobile:300}, objectFit:"cover" },
  HOME_POPUP:{ slot:"HOME_POPUP", screen:SCREENS.HOME, label:"Home — Popup", formats:[AD_FORMATS.POPUP], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:800,height:600},tablet:{width:700,height:520},mobile:{width:600,height:800}}, aspectRatio:"3:4", maxSizeKB:{desktop:1000,tablet:800,mobile:600}, objectFit:"contain", triggers:["ON_PAGE_LOAD","AFTER_DELAY"] },
  STORIES_TOP:{ slot:"STORIES_TOP", screen:SCREENS.STORIES, label:"Stories — Top Banner", formats:[AD_FORMATS.BANNER,AD_FORMATS.VIDEO], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:1200,height:250},tablet:{width:1024,height:220},mobile:{width:720,height:200}}, aspectRatio:"5:1", maxSizeKB:{desktop:700,tablet:550,mobile:400}, objectFit:"cover" },
  STORIES_BETWEEN_CARDS:{ slot:"STORIES_BETWEEN_CARDS", screen:SCREENS.STORIES, label:"Stories — Between Cards", formats:[AD_FORMATS.CARD,AD_FORMATS.INLINE_CONTENT,AD_FORMATS.BANNER], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:800,height:450},tablet:{width:700,height:394},mobile:{width:640,height:360}}, aspectRatio:"16:9", maxSizeKB:{desktop:600,tablet:500,mobile:400}, objectFit:"cover" },
  STORIES_BOTTOM:{ slot:"STORIES_BOTTOM", screen:SCREENS.STORIES, label:"Stories — Bottom", formats:[AD_FORMATS.BANNER,AD_FORMATS.CARD], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:1200,height:200},tablet:{width:1024,height:180},mobile:{width:720,height:160}}, aspectRatio:"6:1", maxSizeKB:{desktop:500,tablet:400,mobile:300}, objectFit:"cover" },
  STORY_READER_BETWEEN_PAGES:{ slot:"STORY_READER_BETWEEN_PAGES", screen:SCREENS.STORY_READER, label:"Story Reader — Between Pages", formats:[AD_FORMATS.FULLSCREEN,AD_FORMATS.BANNER], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:1024,height:600},tablet:{width:768,height:576},mobile:{width:390,height:844}}, aspectRatio:"9:16", maxSizeKB:{desktop:1200,tablet:1000,mobile:800}, objectFit:"cover", triggers:["AFTER_CONTENT"] },
  STORY_READER_AFTER_STORY:{ slot:"STORY_READER_AFTER_STORY", screen:SCREENS.STORY_READER, label:"Story Reader — After Story", formats:[AD_FORMATS.FULLSCREEN,AD_FORMATS.CARD,AD_FORMATS.POPUP], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:800,height:600},tablet:{width:700,height:525},mobile:{width:390,height:844}}, aspectRatio:"9:16", maxSizeKB:{desktop:1200,tablet:1000,mobile:800}, objectFit:"contain", triggers:["AFTER_CONTENT"] },
  LESSONS_TOP:{ slot:"LESSONS_TOP", screen:SCREENS.LESSONS, label:"Lessons — Top Banner", formats:[AD_FORMATS.BANNER,AD_FORMATS.VIDEO], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:1200,height:250},tablet:{width:1024,height:220},mobile:{width:720,height:200}}, aspectRatio:"5:1", maxSizeKB:{desktop:700,tablet:550,mobile:400}, objectFit:"cover" },
  LESSONS_BETWEEN:{ slot:"LESSONS_BETWEEN", screen:SCREENS.LESSONS, label:"Lessons — Between Cards", formats:[AD_FORMATS.CARD,AD_FORMATS.INLINE_CONTENT], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:800,height:450},tablet:{width:700,height:394},mobile:{width:640,height:360}}, aspectRatio:"16:9", maxSizeKB:{desktop:600,tablet:500,mobile:400}, objectFit:"cover" },
  LESSONS_BOTTOM:{ slot:"LESSONS_BOTTOM", screen:SCREENS.LESSONS, label:"Lessons — Bottom", formats:[AD_FORMATS.BANNER,AD_FORMATS.CARD], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:1200,height:200},tablet:{width:1024,height:180},mobile:{width:720,height:160}}, aspectRatio:"6:1", maxSizeKB:{desktop:500,tablet:400,mobile:300}, objectFit:"cover" },
  LESSON_READER_AFTER_LESSON:{ slot:"LESSON_READER_AFTER_LESSON", screen:SCREENS.LESSON_READER, label:"Lesson Reader — After Lesson", formats:[AD_FORMATS.FULLSCREEN,AD_FORMATS.CARD,AD_FORMATS.POPUP], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:800,height:600},tablet:{width:700,height:525},mobile:{width:390,height:844}}, aspectRatio:"9:16", maxSizeKB:{desktop:1200,tablet:1000,mobile:800}, objectFit:"contain", triggers:["AFTER_CONTENT"] },
  GAMES_TOP:{ slot:"GAMES_TOP", screen:SCREENS.GAMES, label:"Games — Top Banner", formats:[AD_FORMATS.BANNER,AD_FORMATS.VIDEO], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:1200,height:250},tablet:{width:1024,height:220},mobile:{width:720,height:200}}, aspectRatio:"5:1", maxSizeKB:{desktop:700,tablet:550,mobile:400}, objectFit:"cover" },
  GAMES_BETWEEN:{ slot:"GAMES_BETWEEN", screen:SCREENS.GAMES, label:"Games — Between Cards", formats:[AD_FORMATS.CARD,AD_FORMATS.INLINE_CONTENT], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:800,height:450},tablet:{width:700,height:394},mobile:{width:640,height:360}}, aspectRatio:"16:9", maxSizeKB:{desktop:600,tablet:500,mobile:400}, objectFit:"cover" },
  GAMES_AFTER_GAME:{ slot:"GAMES_AFTER_GAME", screen:SCREENS.GAMES, label:"Games — After Game Completion", formats:[AD_FORMATS.FULLSCREEN,AD_FORMATS.POPUP,AD_FORMATS.CARD], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:800,height:600},tablet:{width:700,height:525},mobile:{width:390,height:844}}, aspectRatio:"9:16", maxSizeKB:{desktop:1200,tablet:1000,mobile:800}, objectFit:"contain", triggers:["AFTER_CONTENT"] },
  GAMES_BOTTOM:{ slot:"GAMES_BOTTOM", screen:SCREENS.GAMES, label:"Games — Bottom", formats:[AD_FORMATS.BANNER], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:1200,height:200},tablet:{width:1024,height:180},mobile:{width:720,height:160}}, aspectRatio:"6:1", maxSizeKB:{desktop:500,tablet:400,mobile:300}, objectFit:"cover" },
  LIFE_SKILLS_TOP:{ slot:"LIFE_SKILLS_TOP", screen:SCREENS.LIFE_SKILLS, label:"Life Skills — Top Banner", formats:[AD_FORMATS.BANNER], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:1200,height:250},tablet:{width:1024,height:220},mobile:{width:720,height:200}}, aspectRatio:"5:1", maxSizeKB:{desktop:700,tablet:550,mobile:400}, objectFit:"cover" },
  LIFE_SKILLS_BETWEEN:{ slot:"LIFE_SKILLS_BETWEEN", screen:SCREENS.LIFE_SKILLS, label:"Life Skills — Between Cards", formats:[AD_FORMATS.CARD,AD_FORMATS.INLINE_CONTENT], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:800,height:450},tablet:{width:700,height:394},mobile:{width:640,height:360}}, aspectRatio:"16:9", maxSizeKB:{desktop:600,tablet:500,mobile:400}, objectFit:"cover" },
  PARENTS_TOP:{ slot:"PARENTS_TOP", screen:SCREENS.PARENTS, label:"Parents — Top Banner", formats:[AD_FORMATS.BANNER,AD_FORMATS.CARD], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:1200,height:250},tablet:{width:1024,height:220},mobile:{width:720,height:200}}, aspectRatio:"5:1", maxSizeKB:{desktop:700,tablet:550,mobile:400}, objectFit:"cover" },
  SUBSCRIPTION_TOP:{ slot:"SUBSCRIPTION_TOP", screen:SCREENS.SUBSCRIPTION, label:"Subscription — Top Promo Banner", formats:[AD_FORMATS.BANNER,AD_FORMATS.CARD], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:1200,height:300},tablet:{width:1024,height:260},mobile:{width:720,height:240}}, aspectRatio:"4:1", maxSizeKB:{desktop:800,tablet:600,mobile:400}, objectFit:"cover" },
  CHAT_TOP:{ slot:"CHAT_TOP", screen:SCREENS.CHAT, label:"Chat — Top Banner", formats:[AD_FORMATS.BANNER], devices:[DEVICE_TARGETS.ALL], dimensions:{desktop:{width:1200,height:200},tablet:{width:1024,height:180},mobile:{width:720,height:160}}, aspectRatio:"6:1", maxSizeKB:{desktop:500,tablet:400,mobile:300}, objectFit:"cover" },
};

const getAllSlotKeys = () => Object.keys(SLOT_SPECS);
const getSlotSpec = (slot) => SLOT_SPECS[slot] || null;
const getSlotsForScreen = (screen) => Object.values(SLOT_SPECS).filter(s => s.screen === screen);
const isValidSlot = (slot) => !!SLOT_SPECS[slot];
const isValidFormat = (format) => Object.values(AD_FORMATS).includes(format);
const isValidDevice = (device) => Object.values(DEVICE_TARGETS).includes(device);
const isValidStatus = (status) => Object.values(AD_STATUS).includes(status);
const isAllowedMimeType = (mimeType) => ALLOWED_MEDIA_TYPES.includes(mimeType);
const isFormatSupportedForSlot = (format, slot) => { const spec = SLOT_SPECS[slot]; return spec ? spec.formats.includes(format) : false; };

module.exports = {
  SCREENS, AD_FORMATS, DEVICE_TARGETS, AD_STATUS, CTA_OPTIONS, SLOT_SPECS,
  POPUP_TRIGGERS, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, ALLOWED_MEDIA_TYPES,
  getAllSlotKeys, getSlotSpec, getSlotsForScreen, isValidSlot, isValidFormat,
  isValidDevice, isValidStatus, isAllowedMimeType, isFormatSupportedForSlot,
};
