const prisma = require("../../prisma/prismaClient");
const cache = require("../../utils/cache");
const redis = require("../../utils/redis");
const logger = require("../../utils/logger");
const { AD_STATUS, DEVICE_TARGETS } = require("./ads.config");

const AD_CACHE_TTL = 120; // 2 minutes

// ── Cache key builders ────────────────────────────────────────────────────────

const slotCacheKey = (slot, device = "ALL") => `ads:slot:${slot}:${device}`;
const listCachePattern = "ads:list:*";
const statsCacheKey = "ads:stats";
const globalSwitchKey = "ads:global:enabled";

// ── Cache invalidation ────────────────────────────────────────────────────────

const invalidateAdCaches = async (slotKeys = []) => {
  try {
    await redis.delPattern("ads:slot:*");
    await redis.delPattern("ads:list:*");
    await redis.del(statsCacheKey);
    logger.info("[ads-service] cache invalidated", { slotKeys });
  } catch (err) {
    logger.warn("[ads-service] cache invalidation failed", { error: err.message });
  }
};

// ── Global ads switch ─────────────────────────────────────────────────────────

const getGlobalAdsEnabled = async () => {
  try {
    const cached = await redis.get(globalSwitchKey);
    if (cached !== null) return cached === "true";
    const setting = await prisma.appSetting.findUnique({ where: { key: "ADS_ENABLED" } });
    const val = setting ? setting.value === "true" : true;
    await redis.set(globalSwitchKey, String(val), 300);
    return val;
  } catch {
    return true; // fail open
  }
};

const setGlobalAdsEnabled = async (enabled) => {
  await prisma.appSetting.upsert({
    where: { key: "ADS_ENABLED" },
    create: { key: "ADS_ENABLED", value: String(enabled) },
    update: { value: String(enabled) },
  });
  await redis.set(globalSwitchKey, String(enabled), 300);
  await invalidateAdCaches();
};

// ── List / Search ads (admin) ─────────────────────────────────────────────────

const listAds = async ({ page, limit, search, status, format, slot, deviceTarget, startDate, endDate }) => {
  const skip = (page - 1) * limit;
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;
  if (format) where.format = format;
  if (slot) where.slot = slot;
  if (deviceTarget) where.deviceTarget = deviceTarget;
  if (startDate) where.startAt = { gte: new Date(startDate) };
  if (endDate) where.endAt = { lte: new Date(endDate) };

  const [ads, total] = await Promise.all([
    prisma.ad.findMany({
      where,
      include: {
        media: { select: { id: true, url: true, mimeType: true, size: true } },
        mobileMedia: { select: { id: true, url: true, mimeType: true } },
        tabletMedia: { select: { id: true, url: true, mimeType: true } },
        desktopMedia: { select: { id: true, url: true, mimeType: true } },
        createdBy: { select: { name: true, email: true } },
      },
      skip,
      take: limit,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),
    prisma.ad.count({ where }),
  ]);
  return { ads, total, page, limit, pages: Math.ceil(total / limit) };
};

// ── Get single ad ─────────────────────────────────────────────────────────────

const getAdById = async (id) => {
  return prisma.ad.findUniqueOrThrow({
    where: { id },
    include: {
      media: true,
      mobileMedia: true,
      tabletMedia: true,
      desktopMedia: true,
      createdBy: { select: { name: true, email: true } },
    },
  });
};

// ── Create ad ─────────────────────────────────────────────────────────────────

const createAd = async (data, userId) => {
  const ad = await prisma.ad.create({
    data: {
      name: data.name,
      title: data.title,
      description: data.description || null,
      format: data.format,
      status: data.status || AD_STATUS.DRAFT,
      slot: data.slot,
      deviceTarget: data.deviceTarget || DEVICE_TARGETS.ALL,
      mediaId: data.mediaId || null,
      mobileMediaId: data.mobileMediaId || null,
      tabletMediaId: data.tabletMediaId || null,
      desktopMediaId: data.desktopMediaId || null,
      clickUrl: data.clickUrl || null,
      internalRoute: data.internalRoute || null,
      ctaText: data.ctaText || null,
      priority: data.priority || 5,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
      frequencyLimit: data.frequencyLimit ?? null,
      maxDisplaysPerDay: data.maxDisplaysPerDay ?? null,
      minTimeBetweenDisplays: data.minTimeBetweenDisplays ?? null,
      popupTrigger: data.popupTrigger || null,
      popupDelay: data.popupDelay ?? null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdById: userId,
    },
  });
  await invalidateAdCaches([data.slot]);
  return ad;
};

// ── Update ad ─────────────────────────────────────────────────────────────────

const updateAd = async (id, data, userId) => {
  const current = await prisma.ad.findUniqueOrThrow({ where: { id } });
  const updateData = { updatedById: userId };
  const allowedFields = [
    "name","title","description","format","status","slot","deviceTarget",
    "mediaId","mobileMediaId","tabletMediaId","desktopMediaId","clickUrl",
    "internalRoute","ctaText","priority","frequencyLimit","maxDisplaysPerDay",
    "minTimeBetweenDisplays","popupTrigger","popupDelay","isActive",
  ];
  for (const field of allowedFields) {
    if (data[field] !== undefined) updateData[field] = data[field];
  }
  if (data.startAt !== undefined) updateData.startAt = data.startAt ? new Date(data.startAt) : null;
  if (data.endAt !== undefined) updateData.endAt = data.endAt ? new Date(data.endAt) : null;

  const ad = await prisma.ad.update({ where: { id }, data: updateData });
  await invalidateAdCaches([current.slot, ad.slot]);
  return ad;
};

// ── Delete ad ─────────────────────────────────────────────────────────────────

const deleteAd = async (id) => {
  const ad = await prisma.ad.findUniqueOrThrow({ where: { id } });
  await prisma.adEvent.deleteMany({ where: { adId: id } });
  await prisma.ad.delete({ where: { id } });
  await invalidateAdCaches([ad.slot]);
};

// ── Duplicate ad ──────────────────────────────────────────────────────────────

const duplicateAd = async (id, userId) => {
  const original = await prisma.ad.findUniqueOrThrow({ where: { id } });
  const { id: _id, createdAt, updatedAt, impressionCount, clickCount, ...fields } = original;
  const ad = await prisma.ad.create({
    data: {
      ...fields,
      name: `${original.name} (Copy)`,
      status: AD_STATUS.DRAFT,
      impressionCount: 0,
      clickCount: 0,
      createdById: userId,
      updatedById: null,
    },
  });
  await invalidateAdCaches([ad.slot]);
  return ad;
};

// ── Enable / Disable ──────────────────────────────────────────────────────────

const setAdEnabled = async (id, enabled, userId) => {
  const ad = await prisma.ad.update({
    where: { id },
    data: {
      isActive: enabled,
      status: !enabled ? AD_STATUS.DISABLED : undefined,
      updatedById: userId,
    },
  });
  await invalidateAdCaches([ad.slot]);
  return ad;
};

// ── Public: Get eligible ad for a slot ──────────────────────────────────────

const getAdForSlot = async (slot, device = "ALL") => {
  // Check global switch
  const globalEnabled = await getGlobalAdsEnabled();
  if (!globalEnabled) return null;

  const cacheKey = slotCacheKey(slot, device);
  const { data: cached } = await cache.getOrSet(cacheKey, async () => {
    const now = new Date();
    const deviceConditions = [DEVICE_TARGETS.ALL];
    if (device === DEVICE_TARGETS.MOBILE) deviceConditions.push(DEVICE_TARGETS.MOBILE);
    if (device === DEVICE_TARGETS.TABLET) deviceConditions.push(DEVICE_TARGETS.TABLET);
    if (device === DEVICE_TARGETS.DESKTOP) deviceConditions.push(DEVICE_TARGETS.DESKTOP);

    const ad = await prisma.ad.findFirst({
      where: {
        slot,
        isActive: true,
        status: AD_STATUS.ACTIVE,
        deviceTarget: { in: deviceConditions },
        OR: [{ startAt: null }, { startAt: { lte: now } }],
        AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
      },
      include: {
        media: { select: { url: true, mimeType: true } },
        mobileMedia: { select: { url: true, mimeType: true } },
        tabletMedia: { select: { url: true, mimeType: true } },
        desktopMedia: { select: { url: true, mimeType: true } },
      },
      orderBy: { priority: "desc" },
    });
    return ad ? sanitizeAdForPublic(ad, device) : null;
  }, AD_CACHE_TTL);
  return cached;
};

// ── Sanitize ad for public response ──────────────────────────────────────────

const sanitizeAdForPublic = (ad, device) => {
  // Resolve device-specific media with fallback chain
  let mediaUrl = null;
  let mimeType = null;
  if (device === DEVICE_TARGETS.MOBILE) {
    mediaUrl = ad.mobileMedia?.url || ad.media?.url || null;
    mimeType = ad.mobileMedia?.mimeType || ad.media?.mimeType || null;
  } else if (device === DEVICE_TARGETS.TABLET) {
    mediaUrl = ad.tabletMedia?.url || ad.media?.url || null;
    mimeType = ad.tabletMedia?.mimeType || ad.media?.mimeType || null;
  } else {
    mediaUrl = ad.desktopMedia?.url || ad.media?.url || null;
    mimeType = ad.desktopMedia?.mimeType || ad.media?.mimeType || null;
  }

  return {
    id: ad.id,
    title: ad.title,
    description: ad.description,
    format: ad.format,
    slot: ad.slot,
    deviceTarget: ad.deviceTarget,
    mediaUrl,
    mimeType,
    clickUrl: ad.clickUrl,
    internalRoute: ad.internalRoute,
    ctaText: ad.ctaText,
    priority: ad.priority,
    frequencyLimit: ad.frequencyLimit,
    maxDisplaysPerDay: ad.maxDisplaysPerDay,
    minTimeBetweenDisplays: ad.minTimeBetweenDisplays,
    popupTrigger: ad.popupTrigger,
    popupDelay: ad.popupDelay,
  };
};

// ── Track impression ──────────────────────────────────────────────────────────

const trackImpression = async (adId, ipHash) => {
  const now = new Date();
  const hourKey = `${Math.floor(now.getTime() / (1000 * 60 * 60))}`;
  const dedupeKey = `ads:imp:${adId}:${ipHash}:${hourKey}`;
  const alreadyCounted = await redis.get(dedupeKey);
  if (alreadyCounted) return false;
  await redis.set(dedupeKey, "1", 3600);
  await Promise.all([
    prisma.ad.update({ where: { id: adId }, data: { impressionCount: { increment: 1 } } }),
    prisma.adEvent.create({ data: { adId, type: "IMPRESSION", ipHash } }),
  ]);
  return true;
};

// ── Track click ───────────────────────────────────────────────────────────────

const trackClick = async (adId, ipHash) => {
  await Promise.all([
    prisma.ad.update({ where: { id: adId }, data: { clickCount: { increment: 1 } } }),
    prisma.adEvent.create({ data: { adId, type: "CLICK", ipHash } }),
  ]);
};

// ── Analytics ─────────────────────────────────────────────────────────────────

const getAdAnalytics = async () => {
  const [total, active, scheduled, expired, disabled, aggregates, perSlot] = await Promise.all([
    prisma.ad.count(),
    prisma.ad.count({ where: { status: "ACTIVE" } }),
    prisma.ad.count({ where: { status: "SCHEDULED" } }),
    prisma.ad.count({ where: { status: "EXPIRED" } }),
    prisma.ad.count({ where: { status: "DISABLED" } }),
    prisma.ad.aggregate({ _sum: { impressionCount: true, clickCount: true } }),
    prisma.ad.groupBy({ by: ["slot"], _sum: { impressionCount: true, clickCount: true }, orderBy: { _sum: { impressionCount: "desc" } } }),
  ]);
  const totalImpressions = aggregates._sum.impressionCount || 0;
  const totalClicks = aggregates._sum.clickCount || 0;
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
  return { total, active, scheduled, expired, disabled, totalImpressions, totalClicks, ctr, perSlot };
};

// ── Auto-expire scheduled ads (run periodically) ───────────────────────────────

const syncAdStatuses = async () => {
  const now = new Date();
  const [activated, expired] = await Promise.all([
    prisma.ad.updateMany({
      where: { status: AD_STATUS.SCHEDULED, startAt: { lte: now }, isActive: true },
      data: { status: AD_STATUS.ACTIVE },
    }),
    prisma.ad.updateMany({
      where: { status: AD_STATUS.ACTIVE, endAt: { lt: now } },
      data: { status: AD_STATUS.EXPIRED, isActive: false },
    }),
  ]);
  if (activated.count > 0 || expired.count > 0) {
    await invalidateAdCaches();
  }
  return { activated: activated.count, expired: expired.count };
};

module.exports = {
  listAds, getAdById, createAd, updateAd, deleteAd, duplicateAd, setAdEnabled,
  getAdForSlot, trackImpression, trackClick, getAdAnalytics, syncAdStatuses,
  getGlobalAdsEnabled, setGlobalAdsEnabled, invalidateAdCaches,
};
