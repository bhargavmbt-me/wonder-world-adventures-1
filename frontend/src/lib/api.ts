const DEFAULT_SERVER_URL = "https://wonder-world-adventures.onrender.com";
const API_BASE_URL = `${import.meta.env.VITE_SERVER_URL || DEFAULT_SERVER_URL}/api`;
const apiDebug = import.meta.env.VITE_API_DEBUG === "true";
let hasLoggedBase = false;

// ── Global session-expired handler ───────────────────────────────
// AuthContext registers its logout + redirect fn here on mount.
// apiFetch calls it whenever the server returns 401.
let _onSessionExpired: (() => void) | null = null;

export const setGlobalSessionExpiredHandler = (fn: () => void) => {
  _onSessionExpired = fn;
};

export const clearGlobalSessionExpiredHandler = () => {
  _onSessionExpired = null;
};

const logApiBase = () => {
  if (hasLoggedBase) return;
  hasLoggedBase = true;
  console.log("[api] base", {
    apiBaseUrl: API_BASE_URL,
    viteServerUrl: import.meta.env.VITE_SERVER_URL || null,
  });
};

type ApiOptions = Omit<RequestInit, "body"> & { body?: Record<string, unknown> };

const maskSensitivePayload = (obj: any): any => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(maskSensitivePayload);
  const clone: Record<string, any> = { ...obj };
  const sensitiveKeys = ["password", "token", "accessToken", "refreshToken", "jwt", "secret", "code"];
  for (const k of Object.keys(clone)) {
    if (sensitiveKeys.includes(k) && typeof clone[k] === "string") {
      const val = clone[k];
      clone[k] = val.length > 8 ? `${val.slice(0, 3)}...[HIDDEN]...${val.slice(-3)}` : "••••••••";
    } else if (typeof clone[k] === "object") {
      clone[k] = maskSensitivePayload(clone[k]);
    }
  }
  return clone;
};

export const apiFetch = async <T>(path: string, options: ApiOptions = {}, token?: string | null) => {
  const url = `${API_BASE_URL}${path}`;
  if (apiDebug) {
    logApiBase();
    console.log("[api] full url", url);
  }
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (import.meta.env.DEV || apiDebug) {
    console.log("[api] request", {
      url,
      method: options.method || "GET",
      body: maskSensitivePayload(options.body) || null,
    });
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();
  if (import.meta.env.DEV || apiDebug) {
    console.log("[api] response", {
      url,
      status: response.status,
      ok: response.ok,
      data: maskSensitivePayload(data),
    });
  }
  if (!response.ok || data?.success === false) {
    let message = data?.message || "Request failed";
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      const detailed = data.errors.map((e: any) => e.field ? `${e.field}: ${e.message}` : e.message).join(", ");
      if (detailed) message = detailed;
    }
    const error = new Error(message) as Error & { code?: string; isAuthError?: boolean; errors?: any[] };
    if (data?.errors) {
      error.errors = data.errors;
    }
    if (data?.code) {
      error.code = data.code;
    }
    // ── Auto-logout on 401 (expired / invalid token) ──────────────
    if (response.status === 401) {
      error.isAuthError = true;
      // Only fire if a token was supplied — skip public endpoints
      if (token && _onSessionExpired) {
        _onSessionExpired();
      }
    }
    throw error;
  }

  return data as T;
};

export type ApiLanguage = {
  id: string;
  code: string;
  name: string;
  native?: string | null;
  flag?: string | null;
};

export type ApiLevel = {
  id: string;
  code: string;
  name: string;
  title?: string;
  description?: string | null;
};

export type ApiQuestion = {
  id?: string;
  type: "mcq" | "fill" | string;
  question: string;
  emoji?: string | null;
  options?: string[];
  answer: string;
  hint?: string | null;
};

export type ApiLesson = {
  id: string;
  lessonId?: string;
  title: string;
  intro?: string | null;
  description?: string | null;
  emoji?: string | null;
  color?: string | null;
  isPremium?: boolean;
  premium?: boolean;
  words?: Array<{
    word: string;
    translit?: string | null;
    meaning?: string | null;
    emoji?: string | null;
  }>;
  quiz?: ApiQuestion[];
  quizzes?: Array<{ id: string; questions: ApiQuestion[] }>;
};

export type ApiStory = {
  id: string;
  title: string;
  author?: string | null;
  tags?: string[];
  coverEmoji?: string | null;
  coverGradient?: string | null;
  duration?: string | null;
  description?: string | null;
  content?: string | null;
  thumbnailUrl?: string | null;
  backgroundUrl?: string | null;
  language?: {
    id: string;
    code: string;
    name: string;
    native?: string | null;
  } | null;
  premium?: boolean;
  isPremium?: boolean;
  stars?: number;
  starsReward?: number;
  pages?: string[] | unknown;
  quizzes?: Array<{ id: string; questions: ApiQuestion[] }>;
  quiz?: ApiQuestion[];
};

export type ApiGame = {
  id: string;
  slug?: string;
  title: string;
  category?: string | null;
  icon?: string | null;
  color?: string | null;
  stars?: number;
  starsReward?: number;
  premium?: boolean;
  isPremium?: boolean;
};

export type GamezopGame = {
  code: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  categories: string[];
  rating: number | null;
  playCount: number | null;
  url: string;
  isPremium?: boolean;
};

export const contentApi = {
  listLanguages: () => apiFetch<{ languages: ApiLanguage[] }>("/languages"),
  listLevelsForLanguage: (language: string) =>
    apiFetch<{ language: ApiLanguage; levels: ApiLevel[] }>(`/languages/${language}/levels`),
  listLessons: (params: { language?: string; level?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.language) search.set("language", params.language);
    if (params.level) search.set("level", params.level);
    const qs = search.toString();
    return apiFetch<{ lessons: ApiLesson[] }>(`/lessons${qs ? `?${qs}` : ""}`);
  },
  listStories: () => apiFetch<{ stories: ApiStory[] }>("/stories"),
  listGames: () => apiFetch<{ games: ApiGame[] }>("/games"),
  listGamezopGames: () => apiFetch<{ games: GamezopGame[] }>("/games/gamezop"),
  chat: (message: string, token?: string | null, sessionId?: string) =>
    apiFetch<{ reply: string; sources: Array<{ title: string; type: string; sourceId: string }>; cached: boolean }>(
      "/chatbot/message",
      { method: "POST", body: { message, sessionId } },
      token,
    ),
  claimReward: (
    body: { stars?: number; coins?: number; xp?: number; reason?: string; sourceType?: string; sourceId?: string },
    token?: string | null,
  ) => apiFetch<{ wallet: unknown }>("/rewards/claim", { method: "POST", body }, token),
  updateProgress: (
    body: {
      contentType: "LESSON" | "STORY" | "GAME" | "LANGUAGE";
      contentId: string;
      progressPercentage: number;
      isCompleted?: boolean;
      score?: number;
      metadata?: Record<string, unknown>;
    },
    token?: string | null,
  ) => apiFetch<{ progress: unknown }>("/progress/update", { method: "POST", body }, token),
  parentDashboard: (token?: string | null) =>
    apiFetch<{ dashboard: { stats?: Record<string, number>; recentActivity?: unknown[] } }>("/parents/dashboard", {}, token),
};

export type ApiPlan = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  durationDays: number;
  isActive: boolean;
};

export type ApiSubscription = {
  id: string;
  planId: string;
  status: string;
  startDate: string;
  endDate: string;
  plan?: ApiPlan;
};

export type ApiPayment = {
  id: string;
  amount: number;
  status: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string | null;
  createdAt: string;
  subscription?: { plan?: ApiPlan } | null;
};

export type CreateOrderResponse = {
  orderId: string;
  amount: number;
  currency: string;
  planId: string;
  planName: string;
  razorpayKeyId: string;
};

export const subscriptionApi = {
  listPlans: () => apiFetch<{ plans: ApiPlan[] }>("/subscriptions/plans"),
  getCurrent: (token: string | null) =>
    apiFetch<{ subscription: ApiSubscription | null }>("/subscriptions/current", {}, token),
  getStatus: (token: string | null) =>
    apiFetch<{ status: string; subscription: ApiSubscription | null }>("/subscriptions/status", {}, token),
};

export const paymentApi = {
  createOrder: (planId: string, token: string | null) =>
    apiFetch<CreateOrderResponse>(
      "/payments/create-order",
      { method: "POST", body: { planId } },
      token,
    ),
  verifyPayment: (
    body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string; planId: string },
    token: string | null,
  ) =>
    apiFetch<{ subscription: ApiSubscription; message: string }>(
      "/payments/verify",
      { method: "POST", body },
      token,
    ),
  getHistory: (token: string | null) =>
    apiFetch<{ payments: ApiPayment[] }>("/payments/history", {}, token),
};

// ─── StoryWeaver Types ────────────────────────────────────────────────────────

export type StoryWeaverStory = {
  id: string;
  title: string;
  language: string;
  level: string;
  slug: string;
  recommended: boolean;
  editorsPick: boolean;
  coverImage: string | null;
  authors: string[];
  illustrators: string[];
  description: string;
  synopsis?: string;
  publisher: string;
  readsCount: number;
  likesCount: number;
  isAudio: boolean;
  hasAudio?: boolean;
  isGif: boolean;
  awards?: string[];
  raw?: Record<string, unknown>;
  isSavedInDb?: boolean;
  source?: string;
};

export type StoryWeaverStoryPage = {
  pageId: number | string;
  position: number;
  pageType: string;
  isLastPage: boolean;
  imageUrl: string | null;
  text: string;
  startTime?: number | null;
  audioUrl?: string | null;
};

export type StoryWeaverStoryDetail = {
  id: string;
  slug: string;
  title: string;
  language: string;
  level: string;
  orientation: string;
  isAudio: boolean;
  audioPath: string | null;
  vttFilePath: string | null;
  pages: StoryWeaverStoryPage[];
  pageTimestamps?: number[];
  totalPages: number;
  isSavedInDb?: boolean;
  hasGeneratedAudio?: boolean;
  source?: string;
};

export type StoryWeaverDbStats = {
  totalSaved: number;
  totalWithAudio: number;
  latestSync: string | null;
  languages: { language: string; count: number }[];
};

export type StoryWeaverListParams = {
  page?: number;
  limit?: number;
  language?: string;
  level?: number;
  query?: string;
  category?: string;
  source?: "api" | "database" | "db";
  audioOnly?: boolean;
};

export type StoryWeaverListResponse = {
  success: boolean;
  stories: StoryWeaverStory[];
  total: number;
  page: number;
  totalPages: number;
  perPage: number;
  source?: string;
};

// ─── StoryWeaver API Helpers ──────────────────────────────────────────────────

export const storyweaverApi = {
  listStories: (params: StoryWeaverListParams = {}): Promise<StoryWeaverListResponse> => {
    const qs = new URLSearchParams();
    if (params.page  != null) qs.set("page",      String(params.page));
    if (params.limit != null) qs.set("limit",     String(params.limit));
    if (params.language)      qs.set("language",  params.language);
    if (params.level != null) qs.set("level",     String(params.level));
    if (params.query)         qs.set("query",     params.query);
    if (params.category)      qs.set("category",  params.category);
    if (params.source)        qs.set("source",    params.source);
    if (params.audioOnly)     qs.set("audioOnly", "true");
    const q = qs.toString();
    return apiFetch<StoryWeaverListResponse>(`/storyweaver/stories${q ? `?${q}` : ""}`);
  },
  getStory: (id: string): Promise<{ success: boolean; story: StoryWeaverStoryDetail }> =>
    apiFetch<{ success: boolean; story: StoryWeaverStoryDetail }>(`/storyweaver/stories/${encodeURIComponent(id)}`),
  generateAudio: (id: string): Promise<{ success: boolean; story: StoryWeaverStoryDetail }> =>
    apiFetch<{ success: boolean; story: StoryWeaverStoryDetail }>(`/storyweaver/stories/${encodeURIComponent(id)}/generate-audio`, {
      method: "POST",
      body: {},
    }),
  getDbStats: (): Promise<{ success: boolean; stats: StoryWeaverDbStats }> =>
    apiFetch<{ success: boolean; stats: StoryWeaverDbStats }>("/storyweaver/stories/stats"),
  syncAudios: (limit = 20): Promise<{ success: boolean; result: { totalProcessed: number; successCount: number; failCount: number } }> =>
    apiFetch<{ success: boolean; result: { totalProcessed: number; successCount: number; failCount: number } }>("/storyweaver/stories/sync", {
      method: "POST",
      body: { limit },
    }),
};


