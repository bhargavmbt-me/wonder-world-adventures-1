const catchAsync = require("../../../utils/catchAsync");
const service    = require("../services/storyweaver.service");

// GET /api/storyweaver/stories
const listStories = catchAsync(async (req, res) => {
	const { page, limit, language, level, query, category, source, audioOnly } = req.query;
	const result = await service.listStories({
		page:      page      ? Number(page)    : undefined,
		limit:     limit     ? Number(limit)   : undefined,
		language:  language  || undefined,
		level:     level     ? Number(level)   : undefined,
		query:     query     || undefined,
		category:  category  || undefined,
		source:    source    || undefined,
		audioOnly: audioOnly !== undefined ? Boolean(audioOnly) : undefined,
	});
	res.json({ success: true, ...result });
});

// GET /api/storyweaver/stories/db
const listDbStories = catchAsync(async (req, res) => {
	const { page, limit, language, level, query } = req.query;
	const result = await service.listDbAudioStories({
		page:     page     ? Number(page)  : undefined,
		limit:    limit    ? Number(limit) : undefined,
		language: language || undefined,
		level:    level    ? Number(level) : undefined,
		query:    query    || undefined,
	});
	if (req.setCacheSource) req.setCacheSource(result._cacheSource);
	res.json({ success: true, ...result });
});

// GET /api/storyweaver/stories/stats
const getDbStats = catchAsync(async (req, res) => {
	const stats = await service.getDbAudioStats();
	res.json({ success: true, stats });
});

// POST /api/storyweaver/stories/sync
const triggerSync = catchAsync(async (req, res) => {
	const { limit, language, level, storyType } = req.body || {};
	const result = await service.syncStories({
		limit:     limit     ? Number(limit)  : 50,
		language:  language  || undefined,
		level:     level     ? Number(level)  : undefined,
		storyType: storyType || undefined,   // omit for ALL story types
	});
	res.json({ success: true, result });
});

// GET /api/storyweaver/stories/:id
const getStory = catchAsync(async (req, res) => {
	const story = await service.getStory(req.params.id);
	res.json({ success: true, story });
});

// POST /api/storyweaver/stories/:id/generate-audio
const generateAudio = catchAsync(async (req, res) => {
	// Race audio generation against a 55-second timeout
	// (just under Render's 60s default to avoid gateway timeout)
	const GENERATION_TIMEOUT = 55_000;

	try {
		const story = await Promise.race([
			service.ensurePageAudios(req.params.id),
			new Promise((_, reject) =>
				setTimeout(
					() => reject(new Error("Audio generation timed out — will continue in background")),
					GENERATION_TIMEOUT
				)
			),
		]);
		res.json({ success: true, story });
	} catch (err) {
		// If timed out, still return the story without audio rather than an error
		try {
			const story = await service.getStory(req.params.id);
			res.json({ success: true, story, audioGenerating: true });
		} catch (fallbackErr) {
			res.status(504).json({
				success: false,
				message: "Audio generation is taking longer than expected. Please try again shortly.",
			});
		}
	}
});

// ── Admin Endpoints ──────────────────────────────────────────────────────────

// GET /api/admin/storyweaver/stories
const adminListStories = catchAsync(async (req, res) => {
	const { page, limit, language, level, query, audioStatus, visibility, sortBy } = req.query;
	const result = await service.listAdminStories({
		page:        page ? Number(page) : 1,
		limit:       limit ? Number(limit) : 20,
		language:    language || undefined,
		level:       level ? Number(level) : undefined,
		query:       query || undefined,
		audioStatus: audioStatus || "all",
		visibility:  visibility || "all",
		sortBy:      sortBy || "reads",
	});
	res.json({ success: true, ...result });
});

// GET /api/admin/storyweaver/stats
const adminGetStats = catchAsync(async (req, res) => {
	const stats = await service.getAdminStoryStats();
	res.json({ success: true, stats });
});

// PATCH /api/admin/storyweaver/stories/:id/hide
const adminToggleHide = catchAsync(async (req, res) => {
	const { id } = req.params;
	const { isHidden } = req.body || {};
	const updated = await service.setStoryHidden(id, isHidden);
	res.json({ success: true, story: updated });
});

// POST /api/admin/storyweaver/bulk
const adminBulkHide = catchAsync(async (req, res) => {
	const { action, storyIds } = req.body || {};
	const result = await service.bulkSetHidden(action, storyIds);
	res.json({ success: true, ...result });
});

module.exports = {
	listStories,
	listDbStories,
	getDbStats,
	triggerSync,
	getStory,
	generateAudio,
	// Admin CMS
	adminListStories,
	adminGetStats,
	adminToggleHide,
	adminBulkHide,
};
