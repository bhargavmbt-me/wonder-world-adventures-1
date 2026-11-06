const express = require("express");
const multer = require("multer");
const controller = require("./admin.controller");
const lessonsController = require("./admin.lessons.controller");
const mediaController = require("./admin.media.controller");
const { requireAdmin } = require("../../middleware/adminAuth.middleware");
const {
	createLessonSchema,
	updateLessonSchema,
	importJsonSchema,
	cardSchema,
	quizQuestionSchema,
	bulkReorderSchema,
} = require("./admin.lessons.validation");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Zod validation middleware ────────────────────────────────────
const validateBody = (schema) => (req, res, next) => {
	const parsed = schema.safeParse(req.body || {});
	if (!parsed.success) {
		const message = parsed.error.errors[0]?.message || "Invalid request";
		return res.status(400).json({ success: false, message, errors: parsed.error.errors });
	}
	req.body = parsed.data;
	return next();
};

// ── Auth ─────────────────────────────────────────────────────────
router.use(requireAdmin);

// ── Existing admin endpoints ─────────────────────────────────────
router.get("/stats", controller.getStats);
router.get("/users", controller.getUsers);
router.post("/users/:id/grant-premium", controller.grantPremium);
router.get("/subscriptions", controller.getSubscriptions);
router.get("/payments", controller.getPayments);
router.patch("/subscriptions/:id", controller.updateSubscription);

// ── Lesson CMS ───────────────────────────────────────────────────

// Analytics & templates (must be before :id routes)
router.get("/lessons/analytics", lessonsController.getAnalytics);
router.get("/lessons/template/excel", lessonsController.downloadTemplate);

// Import / Export
router.post("/lessons/import/json", validateBody(importJsonSchema), lessonsController.importJson);
router.post("/lessons/import/excel", upload.single("file"), lessonsController.importExcel);
router.get("/lessons/export/json", lessonsController.exportJson);
router.get("/lessons/export/excel", lessonsController.exportExcel);

// Lesson CRUD
router.get("/lessons", lessonsController.listLessons);
router.post("/lessons", validateBody(createLessonSchema), lessonsController.createLesson);
router.get("/lessons/:id", lessonsController.getLesson);
router.put("/lessons/:id", validateBody(updateLessonSchema), lessonsController.updateLesson);
router.delete("/lessons/:id", lessonsController.deleteLesson);

// Lesson actions
router.post("/lessons/:id/duplicate", lessonsController.duplicateLesson);
router.post("/lessons/:id/archive", lessonsController.archiveLesson);
router.post("/lessons/:id/restore", lessonsController.restoreLesson);
router.post("/lessons/:id/publish", lessonsController.publishLesson);

// Cards
router.post("/lessons/:id/cards", validateBody(cardSchema), lessonsController.addCard);
router.put("/lessons/:id/cards/:cardId", lessonsController.updateCard);
router.delete("/lessons/:id/cards/:cardId", lessonsController.deleteCard);
router.put("/lessons/:id/cards-reorder", validateBody(bulkReorderSchema), lessonsController.reorderCards);

// Quiz
router.post("/lessons/:id/quiz", validateBody(quizQuestionSchema), lessonsController.addQuizQuestion);
router.put("/lessons/:id/quiz/:qId", lessonsController.updateQuizQuestion);
router.delete("/lessons/:id/quiz/:qId", lessonsController.deleteQuizQuestion);

// Versioning
router.get("/lessons/:id/versions", lessonsController.listVersions);
router.get("/lessons/:id/versions/:ver", lessonsController.getVersion);
router.post("/lessons/:id/versions/:ver/restore", lessonsController.restoreVersion);

// Import audit logs
router.get("/imports", lessonsController.getImportHistory);

// ── Media Library ────────────────────────────────────────────────
router.get("/media", mediaController.listMedia);
router.post("/media", upload.single("file"), mediaController.uploadMedia);
router.delete("/media/:id", mediaController.deleteMedia);
router.put("/media/:id", mediaController.updateMedia);

// ── AI Model Management ──────────────────────────────────────────
const aiModelRoutes = require("../ai-model/ai-model.routes");
router.use("/ai-models", aiModelRoutes);

// ── AI Prompt Limitations Management ─────────────────────────────
const aiPromptRoutes = require("../ai-prompt/ai-prompt.routes");
router.use("/ai-prompt-settings", aiPromptRoutes);

// ── Life Skills Scenario Management ──────────────────────────────
const { adminList, adminCreate, adminUpdate, adminDelete } = require("../life-skill/life-skill.controller");
router.get("/life-skills", adminList);
router.post("/life-skills", adminCreate);
router.put("/life-skills/:id", adminUpdate);
router.delete("/life-skills/:id", adminDelete);

// ── StoryWeaver Management ───────────────────────────────────────
const storyweaverController = require("../storyweaver/controllers/storyweaver.controller");
router.get("/storyweaver/stories", storyweaverController.adminListStories);
router.get("/storyweaver/stats", storyweaverController.adminGetStats);
router.patch("/storyweaver/stories/:id/hide", storyweaverController.adminToggleHide);
router.post("/storyweaver/bulk", storyweaverController.adminBulkHide);
router.post("/storyweaver/stories/:id/generate-audio", storyweaverController.generateAudio);

module.exports = router;
