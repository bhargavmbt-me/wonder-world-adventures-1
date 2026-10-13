const catchAsync = require("../../utils/catchAsync");
const service = require("./ads.service");
const { createAdSchema, updateAdSchema, listAdsSchema } = require("./ads.validation");
const { getAllSlotKeys, SLOT_SPECS, AD_FORMATS, DEVICE_TARGETS, AD_STATUS, SCREENS, CTA_OPTIONS } = require("./ads.config");
const crypto = require("crypto");

// ── Helper: hash IP for privacy-safe deduplication ───────────────────────────
const hashIp = (req) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
};

// ── Admin: List ads ───────────────────────────────────────────────────────────
const listAds = catchAsync(async (req, res) => {
  const params = listAdsSchema.parse(req.query);
  const result = await service.listAds(params);
  res.json({ success: true, ...result });
});

// ── Admin: Get single ad ──────────────────────────────────────────────────────
const getAd = catchAsync(async (req, res) => {
  const ad = await service.getAdById(req.params.id);
  res.json({ success: true, ad });
});

// ── Admin: Create ad ──────────────────────────────────────────────────────────
const createAd = catchAsync(async (req, res) => {
  const data = createAdSchema.parse(req.body);
  const ad = await service.createAd(data, req.user.id);
  res.status(201).json({ success: true, ad });
});

// ── Admin: Update ad ──────────────────────────────────────────────────────────
const updateAd = catchAsync(async (req, res) => {
  const data = updateAdSchema.parse(req.body);
  const ad = await service.updateAd(req.params.id, data, req.user.id);
  res.json({ success: true, ad });
});

// ── Admin: Delete ad ──────────────────────────────────────────────────────────
const deleteAd = catchAsync(async (req, res) => {
  await service.deleteAd(req.params.id);
  res.json({ success: true, deleted: true });
});

// ── Admin: Duplicate ad ───────────────────────────────────────────────────────
const duplicateAd = catchAsync(async (req, res) => {
  const ad = await service.duplicateAd(req.params.id, req.user.id);
  res.status(201).json({ success: true, ad });
});

// ── Admin: Enable / Disable ───────────────────────────────────────────────────
const enableAd = catchAsync(async (req, res) => {
  const ad = await service.setAdEnabled(req.params.id, true, req.user.id);
  res.json({ success: true, ad });
});

const disableAd = catchAsync(async (req, res) => {
  const ad = await service.setAdEnabled(req.params.id, false, req.user.id);
  res.json({ success: true, ad });
});

// ── Admin: Analytics ──────────────────────────────────────────────────────────
const getAnalytics = catchAsync(async (req, res) => {
  const analytics = await service.getAdAnalytics();
  res.json({ success: true, analytics });
});

// ── Admin: Global toggle ──────────────────────────────────────────────────────
const getGlobalSwitch = catchAsync(async (req, res) => {
  const enabled = await service.getGlobalAdsEnabled();
  res.json({ success: true, adsEnabled: enabled });
});

const setGlobalSwitch = catchAsync(async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ success: false, message: "enabled must be a boolean" });
  }
  await service.setGlobalAdsEnabled(enabled);
  res.json({ success: true, adsEnabled: enabled });
});

// ── Admin: Config (slots, formats, etc.) ─────────────────────────────────────
const getConfig = catchAsync(async (req, res) => {
  res.json({
    success: true,
    config: {
      slots: SLOT_SPECS,
      formats: Object.values(AD_FORMATS),
      devices: Object.values(DEVICE_TARGETS),
      statuses: Object.values(AD_STATUS),
      screens: Object.values(SCREENS),
      ctaOptions: CTA_OPTIONS,
    },
  });
});

// ── Public: Get ad for a slot ─────────────────────────────────────────────────
const getSlotAd = catchAsync(async (req, res) => {
  const { slot } = req.params;
  const device = (req.query.device || "ALL").toUpperCase();
  const ad = await service.getAdForSlot(slot, device);
  if (!ad) {
    return res.json({ success: true, ad: null });
  }
  res.json({ success: true, ad });
});

// ── Public: Track impression ──────────────────────────────────────────────────
const trackImpression = catchAsync(async (req, res) => {
  const { id } = req.params;
  const ipHash = hashIp(req);
  const counted = await service.trackImpression(id, ipHash);
  res.json({ success: true, counted });
});

// ── Public: Track click ───────────────────────────────────────────────────────
const trackClick = catchAsync(async (req, res) => {
  const { id } = req.params;
  const ipHash = hashIp(req);
  await service.trackClick(id, ipHash);
  res.json({ success: true });
});

module.exports = {
  listAds, getAd, createAd, updateAd, deleteAd, duplicateAd,
  enableAd, disableAd, getAnalytics, getGlobalSwitch, setGlobalSwitch,
  getConfig, getSlotAd, trackImpression, trackClick,
};
