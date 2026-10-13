import { apiFetch } from "@/lib/api";

const API_BASE = import.meta.env.VITE_SERVER_URL || "https://wonder-world-adventures.onrender.com";

export interface Ad {
  id: string;
  name: string;
  title: string;
  description?: string | null;
  format: string;
  status: string;
  slot: string;
  deviceTarget: string;

  mediaId?: string | null;
  mobileMediaId?: string | null;
  tabletMediaId?: string | null;
  desktopMediaId?: string | null;
  media?: { id: string; url: string; mimeType: string; size: number } | null;
  mobileMedia?: { id: string; url: string; mimeType: string } | null;
  tabletMedia?: { id: string; url: string; mimeType: string } | null;
  desktopMedia?: { id: string; url: string; mimeType: string } | null;
  clickUrl?: string | null;
  internalRoute?: string | null;
  ctaText?: string | null;
  priority: number;
  startAt?: string | null;
  endAt?: string | null;
  frequencyLimit?: number | null;
  maxDisplaysPerDay?: number | null;
  minTimeBetweenDisplays?: number | null;
  popupTrigger?: string | null;
  popupDelay?: number | null;
  isActive: boolean;
  impressionCount: number;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: { name: string; email: string } | null;
}

export interface PublicAd {
  id: string;
  title: string;
  description?: string | null;
  format: string;
  slot: string;
  deviceTarget: string;
  mediaUrl?: string | null;
  mimeType?: string | null;
  clickUrl?: string | null;
  internalRoute?: string | null;
  ctaText?: string | null;
  priority: number;
  frequencyLimit?: number | null;
  maxDisplaysPerDay?: number | null;
  minTimeBetweenDisplays?: number | null;
  popupTrigger?: string | null;
  popupDelay?: number | null;
}

export interface AdListResult {
  ads: Ad[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AdAnalytics {
  total: number;
  active: number;
  scheduled: number;
  expired: number;
  disabled: number;
  totalImpressions: number;
  totalClicks: number;
  ctr: string;
  perSlot: Array<{ slot: string; _sum: { impressionCount: number; clickCount: number } }>;
}

export interface AdListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  format?: string;
  slot?: string;
  deviceTarget?: string;
  startDate?: string;
  endDate?: string;
}

const adsApi = {
  // ── Admin ─────────────────────────────────────────────────────────
  listAds: async (params: AdListParams, token: string): Promise<AdListResult> => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.search) q.set("search", params.search);
    if (params.status) q.set("status", params.status);
    if (params.format) q.set("format", params.format);
    if (params.slot) q.set("slot", params.slot);
    if (params.deviceTarget) q.set("deviceTarget", params.deviceTarget);
    if (params.startDate) q.set("startDate", params.startDate);
    if (params.endDate) q.set("endDate", params.endDate);
    const data = await apiFetch<AdListResult>(`/ads?${q}`, {}, token);
    return data;
  },

  getAd: async (id: string, token: string): Promise<Ad> => {
    const data = await apiFetch<{ ad: Ad }>(`/ads/${id}`, {}, token);
    return data.ad;
  },

  createAd: async (payload: Partial<Ad>, token: string): Promise<Ad> => {
    const data = await apiFetch<{ ad: Ad }>("/ads", { method: "POST", body: payload as any }, token);
    return data.ad;
  },

  updateAd: async (id: string, payload: Partial<Ad>, token: string): Promise<Ad> => {
    const data = await apiFetch<{ ad: Ad }>(`/ads/${id}`, { method: "PUT", body: payload as any }, token);
    return data.ad;
  },

  deleteAd: async (id: string, token: string): Promise<void> => {
    await apiFetch(`/ads/${id}`, { method: "DELETE" }, token);
  },

  duplicateAd: async (id: string, token: string): Promise<Ad> => {
    const data = await apiFetch<{ ad: Ad }>(`/ads/${id}/duplicate`, { method: "POST" }, token);
    return data.ad;
  },

  enableAd: async (id: string, token: string): Promise<Ad> => {
    const data = await apiFetch<{ ad: Ad }>(`/ads/${id}/enable`, { method: "POST" }, token);
    return data.ad;
  },

  disableAd: async (id: string, token: string): Promise<Ad> => {
    const data = await apiFetch<{ ad: Ad }>(`/ads/${id}/disable`, { method: "POST" }, token);
    return data.ad;
  },

  getAnalytics: async (token: string): Promise<AdAnalytics> => {
    const data = await apiFetch<{ analytics: AdAnalytics }>("/ads/analytics", {}, token);
    return data.analytics;
  },

  getConfig: async (token: string) => {
    const data = await apiFetch<{ config: any }>("/ads/config", {}, token);
    return data.config;
  },

  getGlobalSwitch: async (token: string): Promise<boolean> => {
    const data = await apiFetch<{ adsEnabled: boolean }>("/ads/global", {}, token);
    return data.adsEnabled;
  },

  setGlobalSwitch: async (enabled: boolean, token: string): Promise<void> => {
    await apiFetch("/ads/global", { method: "PATCH", body: { enabled } as any }, token);
  },

  // ── Public ─────────────────────────────────────────────────────────
  getSlotAd: async (slot: string, device?: string): Promise<PublicAd | null> => {
    const q = device ? `?device=${device}` : "";
    const data = await apiFetch<{ ad: PublicAd | null }>(`/ads/slot/${slot}${q}`);
    return data.ad;
  },

  trackImpression: async (adId: string): Promise<void> => {
    try {
      await apiFetch(`/ads/${adId}/impression`, { method: "POST" });
    } catch {
      // Silently fail — impression tracking should never break the page
    }
  },

  trackClick: async (adId: string): Promise<void> => {
    try {
      await apiFetch(`/ads/${adId}/click`, { method: "POST" });
    } catch { }
  },

  uploadAdMedia: async (file: File, token: string): Promise<{ id: string; url: string; mimeType: string; size: number }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/api/admin/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Upload failed");
    return json.media;
  },
};

export default adsApi;
