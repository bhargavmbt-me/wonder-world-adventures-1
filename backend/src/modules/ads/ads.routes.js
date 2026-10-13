const express = require("express");
const { requireAdmin } = require("../../middleware/adminAuth.middleware");
const { requireAuth } = require("../../middleware/auth.middleware");
const controller = require("./ads.controller");

const router = express.Router();

// ── Zod validation middleware ─────────────────────────────────────────────────
const validateBody = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body || {});
    req.body = parsed;
    return next();
  } catch (err) {
    const message = err.errors?.[0]?.message || "Invalid request";
    return res.status(400).json({ success: false, message, errors: err.errors });
  }
};

// ── Public routes (no auth required) ─────────────────────────────────────────
// These are called by the frontend AdSlot component
router.get("/slot/:slot", controller.getSlotAd);
router.post("/:id/impression", controller.trackImpression);
router.post("/:id/click", controller.trackClick);

// ── Admin routes (requireAdmin) ───────────────────────────────────────────────
router.use(requireAdmin);

// Config (slot specs for the create/edit UI)
router.get("/config", controller.getConfig);

// Analytics
router.get("/analytics", controller.getAnalytics);

// Global ads switch
router.get("/global", controller.getGlobalSwitch);
router.patch("/global", controller.setGlobalSwitch);

// CRUD
router.get("/", controller.listAds);
router.post("/", controller.createAd);
router.get("/:id", controller.getAd);
router.put("/:id", controller.updateAd);
router.delete("/:id", controller.deleteAd);

// Actions
router.post("/:id/duplicate", controller.duplicateAd);
router.post("/:id/enable", controller.enableAd);
router.post("/:id/disable", controller.disableAd);

module.exports = router;
