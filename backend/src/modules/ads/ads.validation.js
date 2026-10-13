const { z } = require("zod");
const {
  AD_FORMATS, DEVICE_TARGETS, AD_STATUS, isValidSlot, isFormatSupportedForSlot,
} = require("./ads.config");

const baseAdSchema = z.object({
  name: z.string().min(1, "Ad Name is required").max(100),
  title: z.string().min(1, "Ad Title is required").max(200),
  description: z.string().max(500).optional().nullable().transform(v => v || null),
  format: z.enum(Object.values(AD_FORMATS)),
  status: z.enum(Object.values(AD_STATUS)).default("DRAFT"),
  slot: z.string().refine(isValidSlot, { message: "Invalid placement slot" }),
  deviceTarget: z.enum(Object.values(DEVICE_TARGETS)).default("ALL"),
  mediaId: z.string().optional().nullable().transform(v => v || null),
  mobileMediaId: z.string().optional().nullable().transform(v => v || null),
  tabletMediaId: z.string().optional().nullable().transform(v => v || null),
  desktopMediaId: z.string().optional().nullable().transform(v => v || null),
  clickUrl: z.string().max(500).optional().nullable().transform(v => {
    if (!v || !v.trim()) return null;
    const trimmed = v.trim();
    return trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
  }),
  internalRoute: z.string().max(200).optional().nullable().transform(v => (v && v.trim() ? v.trim() : null)),
  ctaText: z.string().max(50).optional().nullable().transform(v => (v && v.trim() ? v.trim() : null)),
  priority: z.preprocess(v => {
    if (v === "" || v === null || v === undefined) return 5;
    const n = Number(v);
    return isNaN(n) ? 5 : Math.max(1, Math.min(10, Math.floor(n)));
  }, z.number().int().min(1).max(10).default(5)),
  startAt: z.preprocess(v => {
    if (!v || v === "") return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }, z.date().nullable().optional()),
  endAt: z.preprocess(v => {
    if (!v || v === "") return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }, z.date().nullable().optional()),
  frequencyLimit: z.preprocess(v => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }, z.number().int().min(0).max(100).nullable().optional()),
  maxDisplaysPerDay: z.preprocess(v => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }, z.number().int().min(0).max(100).nullable().optional()),
  minTimeBetweenDisplays: z.preprocess(v => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }, z.number().int().min(0).max(86400).nullable().optional()),
  popupTrigger: z.string().optional().nullable().transform(v => v || null),
  popupDelay: z.preprocess(v => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }, z.number().int().min(0).max(60).nullable().optional()),
  isActive: z.preprocess(v => (typeof v === "boolean" ? v : v === "true" || v === 1), z.boolean().default(true)),
});

// Normalize mutually exclusive destinations automatically
const normalizeDestination = (data) => {
  if (data.clickUrl) {
    data.internalRoute = null;
  }
  return data;
};

const createAdSchema = baseAdSchema
  .transform(normalizeDestination)
  .refine(data => {
    return isFormatSupportedForSlot(data.format, data.slot);
  }, { message: "Format not supported for selected slot" });

const updateAdSchema = baseAdSchema
  .partial()
  .transform(normalizeDestination)
  .refine(data => {
    if (data.slot && data.format) {
      return isFormatSupportedForSlot(data.format, data.slot);
    }
    return true;
  }, { message: "Format not supported for selected slot" });

const listAdsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  status: z.enum(Object.values(AD_STATUS)).optional(),
  format: z.enum(Object.values(AD_FORMATS)).optional(),
  slot: z.string().optional(),
  deviceTarget: z.enum(Object.values(DEVICE_TARGETS)).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

module.exports = { baseAdSchema, createAdSchema, updateAdSchema, listAdsSchema };
