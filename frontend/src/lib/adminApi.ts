import { apiFetch } from "./api";

const API_BASE = import.meta.env.VITE_SERVER_URL || "https://wonder-world-adventures.onrender.com";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  premiumUsers: number;
  activeSubscriptions: number;
  totalSubscriptions: number;
  totalStories: number;
  totalLessons: number;
  totalRevenue: number;
  monthlyRevenue: number;
  paymentsToday: number;
  totalPayments: number;
  revenueTrend: { date: string; revenue: number }[];
  userGrowth: { date: string; users: number }[];
  activity: ActivityItem[];
}

export interface ActivityItem {
  type: "new_user" | "payment" | "subscription";
  name: string;
  detail: string;
  at: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  provider: string[];
  isVerified: boolean;
  createdAt: string;
  profileImage?: string | null;
  subscriptions: Array<{ plan: { name: string }; status: string; endDate: string }>;
}

export interface AdminSubscription {
  id: string;
  userId: string;
  planId: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING";
  startDate: string;
  endDate: string;
  createdAt: string;
  user: { name: string; email: string };
  plan: { name: string; price: number };
  payments: Array<{ id: string; razorpayOrderId: string; razorpayPaymentId?: string; amount: number; status: string }>;
}

export interface AdminPayment {
  id: string;
  userId: string;
  amount: number;
  status: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string | null;
  createdAt: string;
  user: { name: string; email: string };
  subscription?: { plan?: { name: string } } | null;
}

export interface AdminStory {
  id: string;
  storyId?: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  content: string;
  author?: string | null;
  category?: string | null;
  ageGroup?: string | null;
  difficulty?: string | null;
  thumbnail?: string | null;
  thumbnailUrl?: string | null;
  backgroundUrl?: string | null;
  coverImage?: string | null;
  coverEmoji?: string | null;
  coverGradient?: string | null;
  audioUrl?: string | null;
  readingTime?: number | null;
  listeningTime?: number | null;
  duration?: string | null;
  isPremium: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  isRecommended: boolean;
  readAloudEnabled: boolean;
  narratorVoice?: string | null;
  xpReward: number;
  starsReward: number;
  likesCount: number;
  readsCount: number;
  favoritesCount: number;
  tags: string[];
  sortOrder: number;
  language?: { id: string; code: string; name: string; native?: string | null } | null;
  languageId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLanguage {
  id: string;
  code: string;
  name: string;
  native?: string | null;
  flag?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface AdminLesson {
  id: string;
  lessonCode?: string | null;
  slug: string;
  title: string;
  description?: string | null;
  intro?: string | null;
  emoji?: string | null;
  color?: string | null;
  category?: string | null;
  tags?: string[];
  status?: string;
  isPremium: boolean;
  isPublished: boolean;
  sortOrder?: number;
  archivedAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  language: { id?: string; name: string; code: string };
  level: { id?: string; name: string; code: string };
  _count?: { cards: number; quizQuestions?: number };
}

export interface AdminLessonFull extends AdminLesson {
  languageId?: string;
  levelId?: string;
  cards: AdminLessonCard[];
  quizzes: AdminQuizFull[];
  versions?: LessonVersion[];
}

export interface AdminLessonCard {
  id: string;
  word: string;
  translit?: string | null;
  meaning?: string | null;
  emoji?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
}

export interface AdminQuizFull {
  id: string;
  title: string;
  questions: AdminQuizQuestion[];
}

export interface AdminQuizQuestion {
  id: string;
  question: string;
  options?: string[] | null;
  answer: string;
  explanation?: string | null;
  emoji?: string | null;
  hint?: string | null;
  type: string;
  points: number;
  sortOrder: number;
}

export interface LessonVersion {
  id: string;
  version: number;
  changeNote?: string | null;
  createdBy?: string | null;
  createdAt: string;
  snapshot?: unknown;
}

export interface ImportAuditEntry {
  id: string;
  importType: string;
  fileName?: string | null;
  importedBy: string;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  errors?: unknown[] | null;
  status: string;
  createdAt: string;
}

export interface ContentAnalytics {
  totalLessons: number;
  totalCards: number;
  totalQuizQuestions: number;
  draftLessons: number;
  publishedLessons: number;
  archivedLessons: number;
  premiumLessons: number;
  freeLessons: number;
  byLanguage: { code: string; name: string; count: number }[];
  byLevel: { code: string; name: string; count: number }[];
}

export interface MediaItem {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  provider: string;
  folder?: string | null;
  altText?: string | null;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  durationDays: number;
  isActive: boolean;
  createdAt: string;
}

export interface AiModel {
  id: string;
  displayName: string;
  modelName: string;
  apiKeyMasked?: string | null;
  hasCustomApiKey?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Admin API Helper ─────────────────────────────────────────────────────────

const adminFetch = async <T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> => {
  const url = `${API_BASE}/api${path}`;
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || "Request failed");
  }
  return data as T;
};

// ─── Admin API ────────────────────────────────────────────────────────────────

export const adminApi = {
  // Stats
  getStats: async (token: string | null): Promise<AdminStats> => {
    const data = await adminFetch<AdminStats & { success: boolean }>("/admin/stats", {}, token);
    return data;
  },

  // Users
  getUsers: async (token: string | null, params: { page?: number; search?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.search) qs.set("search", params.search);
    const data = await adminFetch<{ users: AdminUser[]; total: number }>(`/admin/users?${qs}`, {}, token);
    return data;
  },

  // Subscriptions
  getSubscriptions: async (token: string | null, params: { page?: number; status?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.status) qs.set("status", params.status);
    const data = await adminFetch<{ subscriptions: AdminSubscription[]; total: number }>(`/admin/subscriptions?${qs}`, {}, token);
    return data;
  },

  updateSubscriptionStatus: async (id: string, status: string, token: string | null) => {
    return adminFetch(`/admin/subscriptions/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, token);
  },

  grantPremium: async (userId: string, token: string | null, durationDays = 30) => {
    return adminFetch(`/admin/users/${userId}/grant-premium`, { method: "POST", body: JSON.stringify({ durationDays }) }, token);
  },

  // Payments
  getPayments: async (token: string | null, params: { page?: number; status?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.status) qs.set("status", params.status);
    const data = await adminFetch<{ payments: AdminPayment[]; total: number }>(`/admin/payments?${qs}`, {}, token);
    return data;
  },

  // Stories (real API)
  getStories: async (params: {
    search?: string; category?: string; language?: string;
    ageGroup?: string; difficulty?: string; isPremium?: boolean;
    isPublished?: boolean; isFeatured?: boolean; isTrending?: boolean;
    page?: number; limit?: number; sortBy?: string; sortOrder?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.search)                qs.set("search",     params.search);
    if (params.category)              qs.set("category",   params.category);
    if (params.language)              qs.set("language",   params.language);
    if (params.ageGroup)              qs.set("ageGroup",   params.ageGroup);
    if (params.difficulty)            qs.set("difficulty", params.difficulty);
    if (params.isPremium  !== undefined) qs.set("isPremium",   String(params.isPremium));
    if (params.isPublished!== undefined) qs.set("isPublished",  String(params.isPublished));
    if (params.isFeatured !== undefined) qs.set("isFeatured",   String(params.isFeatured));
    if (params.isTrending !== undefined) qs.set("isTrending",   String(params.isTrending));
    if (params.page)                  qs.set("page",  String(params.page));
    if (params.limit)                 qs.set("limit", String(params.limit));
    if (params.sortBy)                qs.set("sortBy",    params.sortBy);
    if (params.sortOrder)             qs.set("sortOrder", params.sortOrder);
    const data = await apiFetch<{ stories: AdminStory[] }>(`/stories?${qs}`);
    return data.stories;
  },

  createStory: async (body: Partial<AdminStory>, token: string | null) =>
    adminFetch<{ story: AdminStory }>("/stories", { method: "POST", body: JSON.stringify(body) }, token),

  updateStory: async (id: string, body: Partial<AdminStory>, token: string | null) =>
    adminFetch<{ story: AdminStory }>(`/stories/${id}`, { method: "PUT", body: JSON.stringify(body) }, token),

  deleteStory: async (id: string, token: string | null) =>
    adminFetch<{ success: boolean }>(`/stories/${id}`, { method: "DELETE" }, token),

  duplicateStory: async (id: string, token: string | null) =>
    adminFetch<{ story: AdminStory }>(`/stories/${id}/duplicate`, { method: "POST" }, token),

  importStoriesExcel: async (file: File, token: string | null) => {
    const formData = new FormData();
    formData.append("file", file);
    const url     = `${API_BASE}/api/stories/import/excel`;
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(url, { method: "POST", body: formData, headers });
    const data = await response.json();
    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || "Excel import failed");
    }
    return data as {
      success: boolean;
      total: number;
      success_list: Array<{ id: string; title: string; slug: string }>;
      errors: Array<{ rowNum?: number; title?: string; errors?: string[]; error?: string }>;
    };
  },

  downloadStoriesTemplateUrl: (token: string | null) => {
    const qs = new URLSearchParams();
    if (token) qs.set("token", token);
    return `${API_BASE}/api/stories/template/excel?${qs}`;
  },

  exportStoriesExcelUrl: (token: string | null, filters: Record<string, string> = {}) => {
    const qs = new URLSearchParams(filters);
    if (token) qs.set("token", token);
    return `${API_BASE}/api/stories/export/excel?${qs}`;
  },


  // Languages (real API)
  getLanguages: async () => {
    const data = await apiFetch<{ languages: AdminLanguage[] }>("/languages");
    return data.languages;
  },

  getLevelsForLanguage: async (langId: string) => {
    const data = await apiFetch<{ language: any; levels: any[] }>(`/languages/${langId}/levels`);
    return data;
  },

  // Lessons (real API)
  getLessons: async () => {
    const data = await apiFetch<{ lessons: AdminLesson[] }>("/lessons");
    return data.lessons;
  },

  // Lesson CMS
  getAdminLessons: async (token: string | null, params: { page?: number; limit?: number; search?: string; language?: string; level?: string; status?: string; premium?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    if (params.language) qs.set("language", params.language);
    if (params.level) qs.set("level", params.level);
    if (params.status) qs.set("status", params.status);
    if (params.premium !== undefined) qs.set("premium", String(params.premium));
    return adminFetch<{ lessons: AdminLesson[]; total: number; pages: number }>(`/admin/lessons?${qs}`, {}, token);
  },

  getAdminLesson: async (id: string, token: string | null) => {
    return adminFetch<{ lesson: AdminLessonFull }>(`/admin/lessons/${id}`, {}, token);
  },

  createLesson: async (body: Partial<AdminLessonFull>, token: string | null) => {
    return adminFetch<{ lesson: AdminLessonFull }>("/admin/lessons", { method: "POST", body: JSON.stringify(body) }, token);
  },

  updateLesson: async (id: string, body: Partial<AdminLessonFull>, token: string | null) => {
    return adminFetch<{ lesson: AdminLessonFull }>(`/admin/lessons/${id}`, { method: "PUT", body: JSON.stringify(body) }, token);
  },

  deleteLesson: async (id: string, token: string | null) => {
    return adminFetch<{ success: boolean; message: string }>(`/admin/lessons/${id}`, { method: "DELETE" }, token);
  },

  duplicateLesson: async (id: string, token: string | null) => {
    return adminFetch<{ lesson: AdminLessonFull }>(`/admin/lessons/${id}/duplicate`, { method: "POST" }, token);
  },

  archiveLesson: async (id: string, token: string | null) => {
    return adminFetch<{ lesson: AdminLessonFull }>(`/admin/lessons/${id}/archive`, { method: "POST" }, token);
  },

  restoreLesson: async (id: string, token: string | null) => {
    return adminFetch<{ lesson: AdminLessonFull }>(`/admin/lessons/${id}/restore`, { method: "POST" }, token);
  },

  publishLesson: async (id: string, token: string | null) => {
    return adminFetch<{ lesson: AdminLessonFull }>(`/admin/lessons/${id}/publish`, { method: "POST" }, token);
  },

  // Cards
  addCard: async (lessonId: string, card: Omit<AdminLessonCard, "id">, token: string | null) => {
    return adminFetch<{ card: AdminLessonCard }>(`/admin/lessons/${lessonId}/cards`, { method: "POST", body: JSON.stringify(card) }, token);
  },

  updateCard: async (lessonId: string, cardId: string, card: Partial<AdminLessonCard>, token: string | null) => {
    return adminFetch<{ card: AdminLessonCard }>(`/admin/lessons/${lessonId}/cards/${cardId}`, { method: "PUT", body: JSON.stringify(card) }, token);
  },

  deleteCard: async (lessonId: string, cardId: string, token: string | null) => {
    return adminFetch<{ success: boolean; message: string }>(`/admin/lessons/${lessonId}/cards/${cardId}`, { method: "DELETE" }, token);
  },

  reorderCards: async (lessonId: string, items: { id: string; sortOrder: number }[], token: string | null) => {
    return adminFetch<{ success: boolean; message: string }>(`/admin/lessons/${lessonId}/cards-reorder`, { method: "PUT", body: JSON.stringify({ items }) }, token);
  },

  // Quiz
  addQuizQuestion: async (lessonId: string, question: Omit<AdminQuizQuestion, "id" | "sortOrder"> & { sortOrder?: number }, token: string | null) => {
    return adminFetch<{ question: AdminQuizQuestion }>(`/admin/lessons/${lessonId}/quiz`, { method: "POST", body: JSON.stringify(question) }, token);
  },

  updateQuizQuestion: async (lessonId: string, qId: string, question: Partial<AdminQuizQuestion>, token: string | null) => {
    return adminFetch<{ question: AdminQuizQuestion }>(`/admin/lessons/${lessonId}/quiz/${qId}`, { method: "PUT", body: JSON.stringify(question) }, token);
  },

  deleteQuizQuestion: async (lessonId: string, qId: string, token: string | null) => {
    return adminFetch<{ success: boolean; message: string }>(`/admin/lessons/${lessonId}/quiz/${qId}`, { method: "DELETE" }, token);
  },

  // Import / Export
  importJson: async (data: unknown, token: string | null) => {
    return adminFetch<{ success: boolean; totalRecords: number; successCount: number; failureCount: number; errors?: any[] }>("/admin/lessons/import/json", { method: "POST", body: JSON.stringify(data) }, token);
  },

  importExcel: async (file: File, token: string | null) => {
    const formData = new FormData();
    formData.append("file", file);
    const url = `${API_BASE}/api/admin/lessons/import/excel`;
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(url, { method: "POST", body: formData, headers });
    const data = await response.json();
    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || "Excel import failed");
    }
    return data;
  },

  exportJson: async (params: { language?: string; level?: string; lessonId?: string } = {}, token: string | null) => {
    const qs = new URLSearchParams();
    if (params.language) qs.set("language", params.language);
    if (params.level) qs.set("level", params.level);
    if (params.lessonId) qs.set("lessonId", params.lessonId);
    return adminFetch<{ success: boolean; data: any }>(`/admin/lessons/export/json?${qs}`, {}, token);
  },

  exportExcelUrl: (params: { language?: string; level?: string; lessonId?: string } = {}, token: string | null) => {
    const qs = new URLSearchParams();
    if (params.language) qs.set("language", params.language);
    if (params.level) qs.set("level", params.level);
    if (params.lessonId) qs.set("lessonId", params.lessonId);
    if (token) qs.set("token", token);
    return `${API_BASE}/api/admin/lessons/export/excel?${qs}`;
  },

  downloadExcelTemplateUrl: (token: string | null) => {
    const qs = new URLSearchParams();
    if (token) qs.set("token", token);
    return `${API_BASE}/api/admin/lessons/template/excel?${qs}`;
  },

  // Versioning
  getLessonVersions: async (lessonId: string, token: string | null) => {
    return adminFetch<{ versions: LessonVersion[] }>(`/admin/lessons/${lessonId}/versions`, {}, token);
  },

  getLessonVersion: async (lessonId: string, version: number, token: string | null) => {
    return adminFetch<{ version: LessonVersion }>(`/admin/lessons/${lessonId}/versions/${version}`, {}, token);
  },

  restoreLessonVersion: async (lessonId: string, version: number, token: string | null) => {
    return adminFetch<{ lesson: AdminLessonFull }>(`/admin/lessons/${lessonId}/versions/${version}/restore`, { method: "POST" }, token);
  },

  // Analytics
  getContentAnalytics: async (token: string | null) => {
    return adminFetch<ContentAnalytics & { success: boolean }>("/admin/lessons/analytics", {}, token);
  },

  // Audit
  getImportHistory: async (token: string | null, params: { page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    return adminFetch<{ imports: ImportAuditEntry[]; total: number; pages: number }>(`/admin/imports?${qs}`, {}, token);
  },

  // Media
  listMedia: async (token: string | null, params: { page?: number; limit?: number; search?: string; folder?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    if (params.folder) qs.set("folder", params.folder);
    return adminFetch<{ media: MediaItem[]; total: number; pages: number }>(`/admin/media?${qs}`, {}, token);
  },

  uploadMedia: async (file: File, token: string | null) => {
    const formData = new FormData();
    formData.append("file", file);
    const url = `${API_BASE}/api/admin/media`;
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(url, { method: "POST", body: formData, headers });
    const data = await response.json();
    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || "Media upload failed");
    }
    return data as { success: boolean; media: MediaItem };
  },

  deleteMedia: async (id: string, token: string | null) => {
    return adminFetch<{ success: boolean; message: string }>(`/admin/media/${id}`, { method: "DELETE" }, token);
  },

  updateMedia: async (id: string, data: { altText?: string; folder?: string }, token: string | null) => {
    return adminFetch<{ success: boolean; media: MediaItem }>(`/admin/media/${id}`, { method: "PUT", body: JSON.stringify(data) }, token);
  },

  // Plans (real API)
  getPlans: async () => {
    const data = await apiFetch<{ plans: SubscriptionPlan[] }>("/subscriptions/plans");
    return data.plans;
  },

  // Admin login
  login: async (email: string, password: string) => {
    const data = await apiFetch<{ user: { id: string; name: string; email: string; isVerified: boolean; provider: string[]; createdAt: string }; token: string }>(
      "/auth/login",
      { method: "POST", body: { email, password } as never }
    );
    if (data.user.email !== "admin@storynest.com") {
      throw new Error("Not an admin account");
    }
    return data;
  },

  // AI Models
  getAiModels: async (token: string | null) => {
    const data = await adminFetch<{ success: boolean; models: AiModel[] }>("/admin/ai-models", {}, token);
    return data.models;
  },

  createAiModel: async (data: { displayName: string; modelName: string; apiKey?: string; isActive?: boolean }, token: string | null) => {
    return adminFetch<{ success: boolean; model: AiModel; message: string }>("/admin/ai-models", { method: "POST", body: JSON.stringify(data) }, token);
  },

  updateAiModel: async (id: string, data: { displayName?: string; modelName?: string; apiKey?: string; isActive?: boolean }, token: string | null) => {
    return adminFetch<{ success: boolean; model: AiModel; message: string }>(`/admin/ai-models/${id}`, { method: "PUT", body: JSON.stringify(data) }, token);
  },

  deleteAiModel: async (id: string, token: string | null) => {
    return adminFetch<{ success: boolean; message: string }>(`/admin/ai-models/${id}`, { method: "DELETE" }, token);
  },

  activateAiModel: async (id: string, token: string | null) => {
    return adminFetch<{ success: boolean; model: AiModel; message: string }>(`/admin/ai-models/${id}/activate`, { method: "PATCH" }, token);
  },

  testAiModel: async (id: string, token: string | null) => {
    // Use direct fetch — a "Connection Failed" test result has success:false
    // which is a VALID response, not an API error. adminFetch would throw on it.
    const url = `${API_BASE}/api/admin/ai-models/${id}/test`;
    const headers = new Headers({ "Content-Type": "application/json" });
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(url, { method: "POST", headers });
    const data = await response.json();
    return data as { success: boolean; status: string; error?: string; message?: string };
  },

  // AI Prompt Limitations
  getAiPromptSettings: async (token: string | null) => {
    return adminFetch<{ success: boolean; settings: AiPromptSettings; previewPrompt: string }>("/admin/ai-prompt-settings", {}, token);
  },

  updateAiPromptSettings: async (data: Partial<AiPromptSettings>, token: string | null) => {
    return adminFetch<{ success: boolean; settings: AiPromptSettings; previewPrompt: string; message: string }>("/admin/ai-prompt-settings", { method: "PUT", body: JSON.stringify(data) }, token);
  },

  resetAiPromptSettings: async (token: string | null) => {
    return adminFetch<{ success: boolean; settings: AiPromptSettings; previewPrompt: string; message: string }>("/admin/ai-prompt-settings/reset", { method: "POST" }, token);
  },

  previewAiPrompt: async (data: Partial<AiPromptSettings>, token: string | null) => {
    return adminFetch<{ success: boolean; previewPrompt: string }>("/admin/ai-prompt-settings/preview", { method: "POST", body: JSON.stringify(data) }, token);
  },

  // StoryWeaver Management
  getStoryWeaverStories: async (params: StoryWeaverListParams, token: string | null) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.language && params.language !== "all") qs.set("language", params.language);
    if (params.level && params.level !== "all") qs.set("level", params.level);
    if (params.query) qs.set("query", params.query);
    if (params.audioStatus) qs.set("audioStatus", params.audioStatus);
    if (params.visibility) qs.set("visibility", params.visibility);
    if (params.sortBy) qs.set("sortBy", params.sortBy);

    return adminFetch<{
      success: boolean;
      stories: StoryWeaverAdminStory[];
      total: number;
      page: number;
      totalPages: number;
      perPage: number;
    }>(`/admin/storyweaver/stories?${qs.toString()}`, {}, token);
  },

  getStoryWeaverStats: async (token: string | null) => {
    return adminFetch<{ success: boolean; stats: StoryWeaverAdminStats }>("/admin/storyweaver/stats", {}, token);
  },

  toggleStoryWeaverHide: async (id: string, isHidden: boolean, token: string | null) => {
    return adminFetch<{ success: boolean; story: StoryWeaverAdminStory }>(
      `/admin/storyweaver/stories/${id}/hide`,
      { method: "PATCH", body: JSON.stringify({ isHidden }) },
      token
    );
  },

  bulkStoryWeaverHide: async (
    action: "hide_non_audio" | "unhide_non_audio" | "hide_all" | "unhide_all" | "hide_selected" | "unhide_selected",
    storyIds: string[] = [],
    token: string | null
  ) => {
    return adminFetch<{ success: boolean; action: string; count: number; message: string }>(
      "/admin/storyweaver/bulk",
      { method: "POST", body: JSON.stringify({ action, storyIds }) },
      token
    );
  },

  generateStoryWeaverAudio: async (id: string, token: string | null) => {
    return adminFetch<{ success: boolean; story: any }>(
      `/admin/storyweaver/stories/${id}/generate-audio`,
      { method: "POST" },
      token
    );
  },
};

export interface StoryWeaverAdminStory {
  id: string;
  swId: string;
  title: string;
  language: string;
  level: string;
  slug: string;
  coverImage?: string | null;
  authors: string[];
  illustrators: string[];
  description: string;
  synopsis: string;
  publisher: string;
  readsCount: number;
  likesCount: number;
  isAudio: boolean;
  hasAudio: boolean;
  isHidden: boolean;
  totalPages: number;
  orientation?: string;
  pages?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface StoryWeaverAdminStats {
  total: number;
  withAudio: number;
  withoutAudio: number;
  hidden: number;
  visible: number;
  hiddenWithoutAudio: number;
  languages: Array<{ language: string; count: number }>;
}

export interface StoryWeaverListParams {
  page?: number;
  limit?: number;
  language?: string;
  level?: string;
  query?: string;
  audioStatus?: "all" | "audio_only" | "no_audio";
  visibility?: "all" | "visible" | "hidden";
  sortBy?: "reads" | "newest" | "title" | "audio";
}

export interface AiPromptSettings {
  id?: string;
  ageGroup: string;
  maxResponseWords: number;
  language: string;
  difficulty: string;
  allowedTopics: string[];
  safetyRules: string[];
  customInstructions?: string | null;
  responseTone?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const ADMIN_EMAIL = "admin@storynest.com";
export const isAdminUser = (email?: string | null) => email === ADMIN_EMAIL;

