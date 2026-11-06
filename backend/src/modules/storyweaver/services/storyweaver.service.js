/**
 * StoryWeaver Service
 *
 * Fetches stories and story pages from the StoryWeaver public API and
 * permanently persists all audio stories into PostgreSQL (`storyweaver_audios`).
 *
 * Flow:
 * StoryWeaver API -> storyweaver_audios (PostgreSQL) -> StoryWeaverReader (Audio + Pages + Timestamps)
 */

const https    = require("https");
const redis    = require("../../../utils/redis");
const cache    = require("../../../utils/cache");
const logger   = require("../../../utils/logger");
const prisma   = require("../../../prisma/prismaClient");
const { storyweaverApiToken, r2PublicUrl } = require("../../../config/env");
const { generatePageAudio } = require("../../../utils/tts");
const { uploadAudio, buildAudioKey, objectExists } = require("../../../utils/r2");

const SW_BASE   = "https://storyweaver.org.in";
const CACHE_TTL_LIST   = 30 * 60;   // 30 minutes for listing responses
const CACHE_TTL_DETAIL = 60 * 60;   // 1 hour for story detail / pages
// Bump this when normalization logic changes to invalidate stale cache entries
const CACHE_VERSION    = "v8";

// Active generation promises to deduplicate concurrent requests for the same story
const activeGenerations = new Map();

// ─── Low-level HTTP helper ───────────────────────────────────────────────────

/**
 * Performs a GET request and resolves with the parsed JSON body.
 * @param {string} url
 * @returns {Promise<unknown>}
 */
const fetchJson = (url) =>
	new Promise((resolve, reject) => {
		const headers = { "Accept": "application/json" };
		if (storyweaverApiToken) {
			headers["Authorization"] = `Bearer ${storyweaverApiToken}`;
		}

		const req = https.get(url, { headers, timeout: 15_000 }, (res) => {
			let raw = "";
			res.on("data", (chunk) => { raw += chunk; });
			res.on("end", () => {
				try {
					const parsed = JSON.parse(raw);
					if (!parsed?.ok && res.statusCode !== 200) {
						return reject(new Error(`StoryWeaver API error ${res.statusCode}`));
					}
					resolve(parsed);
				} catch {
					reject(new Error("Failed to parse StoryWeaver response"));
				}
			});
		});

		req.on("timeout", () => {
			req.destroy();
			reject(new Error("StoryWeaver request timed out"));
		});
		req.on("error", reject);
	});

/**
 * Performs a GET request and resolves with raw text (e.g. for VTT files).
 * @param {string} url
 * @returns {Promise<string>}
 */
const fetchText = (url) =>
	new Promise((resolve, reject) => {
		const req = https.get(url, { timeout: 5_000 }, (res) => {
			let raw = "";
			res.on("data", (chunk) => { raw += chunk; });
			res.on("end", () => resolve(raw));
		});
		req.on("timeout", () => {
			req.destroy();
			reject(new Error("VTT request timed out"));
		});
		req.on("error", reject);
	});

/**
 * Parse a WebVTT file to extract start times for each cue.
 * Returns a map of cueId -> startTimeInSeconds.
 */
const parseVttCueTimes = (vttText) => {
	const cueTimes = {};
	const lines = (vttText || "").split(/\r?\n/);
	let currentCueId = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (/^\d+$/.test(line)) {
			currentCueId = line;
		} else if (line.includes("-->") && currentCueId) {
			const startStr = line.split("-->")[0].trim();
			const parts = startStr.split(":");
			let secs = 0;
			if (parts.length === 3) {
				secs = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
			} else if (parts.length === 2) {
				secs = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
			}
			cueTimes[currentCueId] = secs;
			currentCueId = null;
		}
	}
	return cueTimes;
};

// ─── Normalizers ─────────────────────────────────────────────────────────────

/**
 * Pick the best cover image from the sizes array.
 * Prefers size4 (≈548px) or the largest available.
 */
const pickCoverUrl = (sizes = []) => {
	if (!Array.isArray(sizes) || sizes.length === 0) return null;
	// size4 is index 3 (0-based), otherwise grab the middle/largest
	return (sizes[3] || sizes[sizes.length - 1] || sizes[0])?.url || null;
};

/**
 * Normalize a raw book object from books-search into our clean shape.
 */
const normalizeBook = (book) => ({
	id:          String(book.id),
	title:       book.title || "Untitled",
	language:    book.language || "English",
	level:       String(book.level || ""),
	slug:        book.slug || String(book.id),
	recommended: Boolean(book.recommended),
	editorsPick: Boolean(book.editorsPick),
	coverImage:  pickCoverUrl(book.coverImage?.sizes),
	authors:     (book.authors || []).map((a) => a.name).filter(Boolean),
	illustrators:(book.illustrators || []).map((a) => a.name).filter(Boolean),
	description: book.description || book.synopsis || "",
	synopsis:    book.synopsis || book.description || "",
	publisher:   book.publisher?.name || "",
	readsCount:  book.readsCount  || 0,
	likesCount:  book.likesCount  || 0,
	isAudio:     true,
	isGif:       Boolean(book.isGif),
	awards:      (book.awardsDetails || []).map((a) => a.description).filter(Boolean),
	raw:         book,
});

/**
 * Normalize a single page from the /read response.
 * Extracts image URL and clean story text from the html field.
 */
const normalizePage = (page) => {
	// ── Image URL ──────────────────────────────────────────────────────────────
	let imageUrl = pickCoverUrl(page.coverImage?.sizes) || null;

	if (!imageUrl && page.html) {
		const m = page.html.match(/data-size4-src="([^"]+)"/);
		if (m) imageUrl = m[1];
	}
	if (!imageUrl && page.html) {
		const m = page.html.match(/data-size\d-src="([^"]+)"/);
		if (m) imageUrl = m[1];
	}

	// ── Text extraction ────────────────────────────────────────────────────────
	let text = "";
	if (page.html) {
		let html = page.html;

		html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
		html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
		html = html.replace(/<svg[\s\S]*?<\/svg>/gi, "");
		html = html.replace(/<div class="page_number[^"]*">[^<]*<\/div>/gi, "");

		const cueMatches = [...html.matchAll(/<span[^>]+data-cue="[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)];
		if (cueMatches.length > 0) {
			text = cueMatches
				.map((m) => m[1].replace(/<[^>]+>/g, "").trim())
				.filter(Boolean)
				.join(" ")
				.replace(/\s+/g, " ")
				.trim();
		} else {
			text = html
				.replace(/<[^>]+>/g, " ")
				.replace(/&amp;/g, "&")
				.replace(/&lt;/g, "<")
				.replace(/&gt;/g, ">")
				.replace(/&quot;/g, '"')
				.replace(/&#39;/g, "'")
				.replace(/\s+/g, " ")
				.trim();
		}

		text = text
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/\s+/g, " ")
			.trim();
	}

	return {
		pageId:     page.pageId,
		position:   page.pagePostion || page.position || 0,
		pageType:   page.pageType || "StoryPage",
		isLastPage: Boolean(page.isLastStoryPage),
		imageUrl,
		text,
	};
};

// ─── Database Operations ─────────────────────────────────────────────────────

/**
 * Upsert an audio story into PostgreSQL (storyweaver_audios table).
 * Stores audioPath, vttFilePath, page timestamps, pages, and metadata.
 */
const saveAudioStoryToDb = async (story) => {
	if (!story) return null;
	const swId = String(story.swId || story.id).trim();
	if (!swId) return null;
	const slug = String(story.slug || swId).trim();

	try {
		const record = await prisma.storyWeaverAudio.upsert({
			where: { swId },
			update: {
				slug,
				title:          story.title || "Untitled",
				language:       story.language || "English",
				level:          story.level ? String(story.level) : null,
				description:    story.description || story.synopsis || "",
				synopsis:       story.synopsis || story.description || "",
				coverImage:     story.coverImage || null,
				authors:        Array.isArray(story.authors) ? story.authors : [],
				illustrators:   Array.isArray(story.illustrators) ? story.illustrators : [],
				publisher:      story.publisher || "",
				readsCount:     Number(story.readsCount) || 0,
				likesCount:     Number(story.likesCount) || 0,
				isAudio:        true,
				pageTimestamps: story.pageTimestamps || [],
				pages:          story.pages || [],
				totalPages:     Number(story.totalPages || story.pages?.length || 0),
				orientation:    story.orientation || "landscape",
				isSynced:       true,
				syncedAt:       new Date(),
			},
			create: {
				swId,
				slug,
				title:          story.title || "Untitled",
				language:       story.language || "English",
				level:          story.level ? String(story.level) : null,
				description:    story.description || story.synopsis || "",
				synopsis:       story.synopsis || story.description || "",
				coverImage:     story.coverImage || null,
				authors:        Array.isArray(story.authors) ? story.authors : [],
				illustrators:   Array.isArray(story.illustrators) ? story.illustrators : [],
				publisher:      story.publisher || "",
				readsCount:     Number(story.readsCount) || 0,
				likesCount:     Number(story.likesCount) || 0,
				isAudio:        true,
				pageTimestamps: story.pageTimestamps || [],
				pages:          story.pages || [],
				totalPages:     Number(story.totalPages || story.pages?.length || 0),
				orientation:    story.orientation || "landscape",
				isSynced:       true,
				syncedAt:       new Date(),
			},
		});
		logger.info("[storyweaver] Saved story (images & text) to PostgreSQL", { swId, slug, title: record.title });
		cache.invalidate("storyweaver").catch(() => {});
		return record;
	} catch (err) {
		logger.warn("[storyweaver] Failed to save story to DB", { swId, error: err.message });
		return null;
	}
};

/**
 * Retrieve an audio story from PostgreSQL by ID or slug.
 */
const getAudioStoryFromDb = async (idOrSlug) => {
	if (!idOrSlug) return null;
	const str = String(idOrSlug).trim();
	const numericId = str.split("-")[0];

	try {
		const record = await prisma.storyWeaverAudio.findFirst({
			where: {
				OR: [
					{ swId: str },
					{ slug: str },
					{ swId: numericId },
				],
			},
		});

		if (!record) return null;

		return {
			id:             record.swId,
			swId:           record.swId,
			slug:           record.slug,
			title:          record.title,
			language:       record.language,
			level:          record.level || "",
			orientation:    record.orientation || "landscape",
			isAudio:        record.isAudio,
			pages:          record.pages || [],
			pageTimestamps: record.pageTimestamps || [],
			totalPages:     record.totalPages || (record.pages || []).length,
			description:    record.description,
			synopsis:       record.synopsis,
			coverImage:     record.coverImage,
			authors:        record.authors || [],
			illustrators:   record.illustrators || [],
			publisher:      record.publisher,
			readsCount:     record.readsCount,
			likesCount:     record.likesCount,
			isSavedInDb:    true,
			source:         "database",
		};
	} catch (err) {
		logger.warn("[storyweaver] DB lookup failed", { idOrSlug, error: err.message });
		return null;
	}
};

/**
 * List audio stories saved in PostgreSQL with pagination and filtering.
 */
const listDbAudioStories = async (params = {}) => {
	const cacheKey = cache.buildKey("storyweaver:db_list", params);
	const { data, source } = await cache.cachedDedup(
		cacheKey,
		async () => {
			const { page = 1, limit = 12, language, level, query, includeHidden } = params;
			const where = { isAudio: true };

			if (!includeHidden) {
				where.isHidden = false;
			}

			const isSearch = Boolean(query && String(query).trim());
			if (!isSearch && language && language !== "Any language") {
				where.language = { equals: language, mode: "insensitive" };
			}
			if (!isSearch && level) {
				where.level = String(level);
			}
			if (isSearch) {
				const trimmedQuery = String(query).trim();
				where.OR = [
					{ title: { contains: trimmedQuery, mode: "insensitive" } },
					{ description: { contains: trimmedQuery, mode: "insensitive" } },
					{ synopsis: { contains: trimmedQuery, mode: "insensitive" } },
					{ slug: { contains: trimmedQuery, mode: "insensitive" } },
				];
			}

			const [records, total] = await Promise.all([
				prisma.storyWeaverAudio.findMany({
					where,
					skip: (page - 1) * limit,
					take: limit,
					orderBy: [{ hasAudio: "desc" }, { readsCount: "desc" }, { createdAt: "desc" }],
				}),
				prisma.storyWeaverAudio.count({ where }),
			]);

			const stories = records.map((r) => ({
				id:          r.swId,
				swId:        r.swId,
				title:       r.title,
				language:    r.language,
				level:       r.level || "",
				slug:        r.slug,
				recommended: false,
				editorsPick: false,
				coverImage:  r.coverImage,
				authors:     r.authors || [],
				illustrators:r.illustrators || [],
				description: r.description || "",
				synopsis:    r.synopsis || "",
				publisher:   r.publisher || "",
				readsCount:  r.readsCount || 0,
				likesCount:  r.likesCount || 0,
				isAudio:     true,
				hasAudio:    Boolean(r.hasAudio),
				isGif:       false,
				totalPages:  r.totalPages,
				isSavedInDb: true,
				source:      "database",
			}));

			return {
				stories,
				total,
				page,
				totalPages: Math.ceil(total / limit) || 1,
				perPage:    limit,
				source:     "database",
			};
		},
		cache.TTL.STORYWEAVER_LIST
	);

	return { ...data, _cacheSource: source };
};

/**
 * Get database statistics on stored audio stories with cold-start retry & caching.
 */
const getDbAudioStats = async () => {
	const cacheKey = `storyweaver:${CACHE_VERSION}:db_stats`;
	const cached = await redis.get(cacheKey);
	if (cached) {
		try { return JSON.parse(cached); } catch { /* ignore */ }
	}

	const fetchStats = async () => {
		// Sequential execution ensures the initial connection handshakes properly on serverless Postgres
		const total = await prisma.storyWeaverAudio.count({ where: { isHidden: false } });
		const languageGroups = await prisma.storyWeaverAudio.groupBy({
			where: { isHidden: false },
			by: ["language"],
			_count: { id: true },
			orderBy: { _count: { id: "desc" } },
		});
		const latest = await prisma.storyWeaverAudio.findFirst({
			orderBy: { updatedAt: "desc" },
			select: { updatedAt: true, title: true, swId: true },
		});

		const result = {
			totalSaved: total,
			latestSync: latest ? latest.updatedAt : null,
			languages: languageGroups.map((g) => ({
				language: g.language,
				count: g._count.id,
			})),
		};

		await redis.set(cacheKey, JSON.stringify(result), 5 * 60);
		return result;
	};

	try {
		return await fetchStats();
	} catch (firstErr) {
		// Serverless Postgres (Neon) may have been sleeping; retry once after 1s delay
		logger.info("[storyweaver] Retrying DB stats after cold-start pause...", { error: firstErr.message });
		try {
			await new Promise((r) => setTimeout(r, 1200));
			return await fetchStats();
		} catch (retryErr) {
			logger.warn("[storyweaver] Failed to fetch DB stats after retry", { error: retryErr.message });
			return {
				totalSaved: 0,
				totalWithAudio: 0,
				latestSync: null,
				languages: [],
			};
		}
	}
};

const titleFromSlug = (slug) => {
	if (!slug) return "Untitled";
	const clean = String(slug).replace(/^\d+-/, "").replace(/[-_]+/g, " ").trim();
	return clean.replace(/\b\w/g, (c) => c.toUpperCase()) || "Untitled";
};


/**
 * Sync stories from StoryWeaver API into PostgreSQL (images & text only).
 * Fetches ALL story types by default (regular, audio, gif, etc.).
 * @param {{ limit?: number, language?: string, level?: number, storyType?: string, onProgress?: Function }} options
 */
const syncStories = async (options = {}) => {
	const {
		limit = 50,
		language,
		level,
		storyType,   // optional: "audio" | "non_audio" | omit for ALL
		onProgress,
	} = options;

	logger.info("[storyweaver] Starting syncStories", { limit, language, level, storyType: storyType || "all" });

	let fetched = 0;
	let page = 1;
	let successCount = 0;
	let failCount = 0;
	const perPage = 24;
	const synced = [];

	while (fetched < limit) {
		const qs = new URLSearchParams({
			page:     String(page),
			per_page: String(perPage),
		});
		if (storyType)                            qs.set("story_type",    storyType);
		if (language && language !== "Any language") qs.set("languages[]",  language);
		if (level)                                 qs.set("reading_level", String(level));

		const searchUrl = `${SW_BASE}/api/v1/books-search?${qs.toString()}`;
		const searchRes = await fetchJson(searchUrl);
		const books = Array.isArray(searchRes?.data) ? searchRes.data : [];

		if (books.length === 0) break;

		for (const book of books) {
			if (fetched >= limit) break;
			fetched++;

			let fullStory = null;
			try {
				fullStory = await getStory(String(book.slug || book.id), book.title);
				if (fullStory) {
					const coverImage = pickCoverUrl(book.coverImage?.sizes) || fullStory.pages?.[0]?.imageUrl;
					const resolvedTitle = book.title || fullStory.title || titleFromSlug(book.slug);
					const toSave = {
						...fullStory,
						title:        resolvedTitle,
						coverImage:   coverImage || null,
						authors:      (book.authors || []).map((a) => a.name).filter(Boolean),
						illustrators: (book.illustrators || []).map((a) => a.name).filter(Boolean),
						publisher:    book.publisher?.name || "",
						readsCount:   book.readsCount || 0,
						likesCount:   book.likesCount || 0,
						description:  book.description || book.synopsis || resolvedTitle,
					};
					await saveAudioStoryToDb(toSave);
					successCount++;
					synced.push({
						id:         fullStory.id,
						slug:       fullStory.slug,
						title:      resolvedTitle,
						language:   fullStory.language,
						totalPages: fullStory.totalPages,
						images:     (fullStory.pages || []).filter((p) => p.imageUrl).length,
					});
					if (typeof onProgress === "function") {
						onProgress({ current: fetched, total: limit, story: toSave, success: true });
					}
				}
			} catch (err) {
				failCount++;
				logger.warn("[storyweaver] syncStories story failed", { id: book.id, error: err.message });
				if (typeof onProgress === "function") {
					onProgress({ current: fetched, total: limit, book, success: false, error: err.message });
				}
			}

			// Polite delay to avoid API throttling
			if (fullStory?.source !== "database") {
				await new Promise((r) => setTimeout(r, 150));
			}
		}

		const totalHits = searchRes?.metadata?.hits || 0;
		if (page * perPage >= totalHits) break;
		page++;
	}

	return {
		totalRequested: limit,
		totalProcessed: fetched,
		successCount,
		failCount,
		synced,
	};
};

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Fetch a paginated list of stories from StoryWeaver or PostgreSQL DB.
 */
const listStories = async (params = {}) => {
	const { page = 1, limit = 12, language, level, query, category, source, audioOnly } = params;

	// If requested from database directly
	if (source === "database" || source === "db") {
		return listDbAudioStories({ page, limit, language, level, query });
	}

	// Build cache key
	const cacheKey = `storyweaver:${CACHE_VERSION}:stories:${page}:${limit}:${language || ""}:${level || ""}:${query || ""}:${category || ""}:${audioOnly || ""}`;

	const cached = await redis.get(cacheKey);
	if (cached) {
		try { return JSON.parse(cached); } catch { /* fall through */ }
	}

	const isSearch = Boolean(query && String(query).trim());

	// Build StoryWeaver URL - universal search when query is provided
	const qs = new URLSearchParams({
		page:     String(page),
		per_page: String(limit),
	});
	if (!isSearch && language && language !== "Any language") qs.set("languages[]", language);
	if (!isSearch && level)    qs.set("reading_level", String(level));
	if (isSearch)             qs.set("query",         String(query).trim());
	if (!isSearch && category && category !== "Any category") qs.set("category", category);
	if (!isSearch && audioOnly && (!language || language === "Any language")) {
		qs.set("story_type", "audio");
	}

	const url = `${SW_BASE}/api/v1/books-search?${qs.toString()}`;
	logger.info("[storyweaver] listStories", { url });

	const raw = await fetchJson(url);

	let books = Array.isArray(raw?.data) ? raw.data.map(normalizeBook) : [];

	// StoryWeaver's reading_level param is a soft hint — post-filter for accuracy
	if (!isSearch && level) {
		books = books.filter((b) => b.level === String(level));
	}

	// Filter out any stories that have been explicitly hidden in PostgreSQL
	try {
		const hiddenRecords = await prisma.storyWeaverAudio.findMany({
			where: { isHidden: true },
			select: { swId: true, slug: true },
		});
		if (hiddenRecords.length > 0) {
			const hiddenSet = new Set(hiddenRecords.flatMap((r) => [String(r.swId), String(r.slug)]));
			books = books.filter((b) => !hiddenSet.has(String(b.id)) && !hiddenSet.has(String(b.slug)));
		}
	} catch (e) {
		// Non-blocking fallback
	}

	const meta   = raw?.metadata || {};
	const result = {
		stories:     books,
		total:       level ? books.length : (meta.hits || books.length),
		page:        Number(meta.page) || page,
		totalPages:  level ? 1 : (Number(meta.totalPages) || 1),
		perPage:     Number(meta.perPage) || limit,
		source:      "api",
	};

	await redis.set(cacheKey, JSON.stringify(result), CACHE_TTL_LIST);
	return result;
};

/**
 * Fetch a story's audio, VTT timestamps, and pages (for StoryWeaverReader).
 * Checks PostgreSQL first -> falls back to API -> auto-persists to PostgreSQL.
 * @param {string} id — numeric ID or full slug
 */
const getStory = async (id, fallbackTitle = null) => {
	const cacheKey = `storyweaver:${CACHE_VERSION}:story:${id}`;

	// 1. Check Redis cache first
	const cached   = await redis.get(cacheKey);
	if (cached) {
		try { return JSON.parse(cached); } catch { /* fall through */ }
	}

	// 2. Check PostgreSQL database for stored page images & text
	const dbStory = await getAudioStoryFromDb(id);
	if (dbStory && dbStory.pages?.length > 0) {
		logger.info("[storyweaver] Serving story from PostgreSQL (images & text)", { id, title: dbStory.title });

		// Check if any pages need audio generation and trigger in background
		const needsAudio = dbStory.pages.some((p) => {
			const t = (p.text || "").trim();
			return t.length >= 2 && !p.audioUrl;
		});

		if (needsAudio) {
			ensurePageAudios(dbStory).catch((genErr) => {
				logger.warn("[storyweaver] Background TTS generation failed", { id, error: genErr.message });
			});
		}

		await redis.set(cacheKey, JSON.stringify(dbStory), CACHE_TTL_DETAIL);
		return dbStory;
	}

	// 3. Fall back to StoryWeaver API /read
	const url = `${SW_BASE}/api/v1/stories/${encodeURIComponent(id)}/read`;
	logger.info("[storyweaver] getStory from API", { url });

	let raw;
	try {
		raw = await fetchJson(url);
	} catch (err) {
		const numericId = id.split("-")[0];
		if (numericId !== id) {
			const fallbackUrl = `${SW_BASE}/api/v1/stories/${numericId}/read`;
			logger.info("[storyweaver] getStory fallback", { fallbackUrl });
			raw = await fetchJson(fallbackUrl);
		} else {
			throw err;
		}
	}

	if (!raw?.ok || !raw?.data) {
		const err = new Error("Story not found");
		err.status = 404;
		throw err;
	}

	const data = raw.data;

	// Parse VTT cue timestamps if available (used for page timing only; not stored in DB)
	let cueTimes = {};
	if (data.vttFilePath) {
		try {
			// Race VTT fetch against a 3-second timeout — VTT is optional enhancement
			const vttText = await Promise.race([
				fetchText(data.vttFilePath),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error("VTT fetch timed out (3s)")), 3000)
				),
			]);
			cueTimes = parseVttCueTimes(vttText);
		} catch (e) {
			logger.warn("[storyweaver] VTT fetch skipped (non-blocking)", { error: e.message });
		}
	}

	const pages = (Array.isArray(data.pages) ? data.pages : []).map((page, idx) => {
		const norm = normalizePage(page);
		const match = (page.html || "").match(/data-cue="([^"]+)"/);
		let startTime = null;
		if (match && cueTimes[match[1]] !== undefined) {
			startTime = cueTimes[match[1]];
		} else if (idx === 0) {
			startTime = 0;
		}
		return {
			...norm,
			startTime,
		};
	});

	// Monotonic page timestamps array (seconds) for page-turn sync
	let lastTime = 0;
	const pageTimestamps = pages.map((p) => {
		if (p.startTime !== null && p.startTime !== undefined) {
			lastTime = p.startTime;
		}
		return lastTime;
	});

	const resolvedTitle = data.title || fallbackTitle || titleFromSlug(data.slug || id);

	const result = {
		id:             String(data.id || id.split("-")[0] || id),
		swId:           String(data.id || id.split("-")[0] || id),
		slug:           data.slug        || id,
		title:          resolvedTitle,
		language:       data.language    || "English",
		level:          String(data.level || ""),
		orientation:    data.orientation || "landscape",
		isAudio:        Boolean(data.isAudio || data.audioPath),
		// audioPath and vttFilePath are intentionally NOT stored in DB;
		// they are passed through for in-session playback only
		audioPath:      data.audioPath   || null,
		vttFilePath:    data.vttFilePath || null,
		pages,
		pageTimestamps,
		totalPages:     pages.length,
		source:         "api",
	};

	// 4. Auto-save images & text to PostgreSQL
	saveAudioStoryToDb(result).catch((e) => {
		logger.warn("[storyweaver] Auto-save (images & text) to DB failed", { error: e.message });
	});

	// 5. Trigger TTS audio generation in background (non-blocking)
	ensurePageAudios(result).catch((e) => {
		logger.warn("[storyweaver] Background audio generation failed", { id, error: e.message });
	});

	await redis.set(cacheKey, JSON.stringify(result), CACHE_TTL_DETAIL);
	return result;
};

/**
 * Ensure all pages with text in a story have audio generated and saved in Cloudflare R2.
 * Stores audio URLs directly in the pages JSON in PostgreSQL and Redis.
 * @param {string|object} storyOrId — story object or swId/slug
 * @returns {Promise<object>} — story with audioUrl populated on each page
 */
const ensurePageAudios = async (storyOrId) => {
	let story;
	if (typeof storyOrId === "string" || typeof storyOrId === "number") {
		story = await getStory(String(storyOrId));
	} else {
		story = storyOrId;
	}

	if (!story || !Array.isArray(story.pages) || story.pages.length === 0) {
		return story;
	}

	const swId = String(story.swId || story.id);

	// Deduplicate concurrent generation requests for the same story
	if (activeGenerations.has(swId)) {
		return activeGenerations.get(swId);
	}

	const needsAudio = story.pages.some((p) => {
		const t = (p.text || "").trim();
		return t.length >= 2 && !p.audioUrl;
	});

	if (!needsAudio) {
		return story;
	}

	const genPromise = (async () => {
		try {
			logger.info("[storyweaver] Generating TTS audios for story", {
				swId,
				title: story.title,
				language: story.language,
				totalPages: story.pages.length,
			});

			let modified = false;
			const updatedPages = [...story.pages];

			for (let i = 0; i < updatedPages.length; i++) {
				const page = { ...updatedPages[i] };
				const text = (page.text || "").trim();

				if (text.length < 2) {
					page.audioUrl = null;
					updatedPages[i] = page;
					continue;
				}

				if (page.audioUrl) {
					continue;
				}

				const audioKey = buildAudioKey(swId, i);

				// Check if object already exists in R2
				let exists = false;
				try {
					exists = await objectExists(audioKey);
				} catch {
					exists = false;
				}

				if (exists && r2PublicUrl) {
					page.audioUrl = `${(r2PublicUrl || "").trim().replace(/\/+$/, "")}/${audioKey}`;
					updatedPages[i] = page;
					modified = true;
					continue;
				}

				try {
					const buffer = await generatePageAudio(text, story.language);
					if (buffer) {
						const audioUrl = await uploadAudio(buffer, audioKey);
						page.audioUrl = audioUrl;
						updatedPages[i] = page;
						modified = true;
					}
				} catch (err) {
					logger.error("[storyweaver] Failed to generate page audio", {
						swId,
						pageIdx: i,
						error: err.message,
					});
				}
			}

			if (modified) {
				story.pages = updatedPages;
				story.hasGeneratedAudio = true;

				// Update in PostgreSQL
				try {
					await prisma.storyWeaverAudio.update({
						where: { swId },
						data: {
							pages: updatedPages,
							hasAudio: true,
							updatedAt: new Date(),
						},
					});
					logger.info("[storyweaver] Saved generated audio URLs to DB", { swId });
				} catch (dbErr) {
					try {
						await saveAudioStoryToDb(story);
					} catch (saveErr) {
						logger.warn("[storyweaver] Could not persist audio URLs to DB", { swId, error: saveErr.message });
					}
				}

				// Refresh Redis cache
				const cacheKey = `storyweaver:${CACHE_VERSION}:story:${swId}`;
				const slugKey = story.slug ? `storyweaver:${CACHE_VERSION}:story:${story.slug}` : null;
				await redis.set(cacheKey, JSON.stringify(story), CACHE_TTL_DETAIL);
				if (slugKey) {
					await redis.set(slugKey, JSON.stringify(story), CACHE_TTL_DETAIL);
				}
			}

			return story;
		} finally {
			activeGenerations.delete(swId);
		}
	})();

	activeGenerations.set(swId, genPromise);
	return genPromise;
};

// ─── Admin CMS Methods ───────────────────────────────────────────────────────

/**
 * List stories in PostgreSQL specifically for Admin with full filtering
 * (audio status, visibility, language, search, sorting).
 */
const listAdminStories = async (params = {}) => {
	const {
		page = 1,
		limit = 20,
		language,
		level,
		query,
		audioStatus = "all", // "all" | "audio_only" | "no_audio"
		visibility = "all",  // "all" | "visible" | "hidden"
		sortBy = "reads",    // "reads" | "newest" | "title" | "audio"
	} = params;

	const where = {};

	if (language && language !== "Any language" && language !== "all") {
		where.language = { equals: language, mode: "insensitive" };
	}
	if (level && level !== "all") {
		where.level = String(level);
	}
	if (query && String(query).trim()) {
		const q = String(query).trim();
		where.OR = [
			{ title: { contains: q, mode: "insensitive" } },
			{ description: { contains: q, mode: "insensitive" } },
			{ slug: { contains: q, mode: "insensitive" } },
			{ swId: { contains: q, mode: "insensitive" } },
		];
	}

	if (audioStatus === "audio_only") {
		where.hasAudio = true;
	} else if (audioStatus === "no_audio") {
		where.hasAudio = false;
	}

	if (visibility === "visible") {
		where.isHidden = false;
	} else if (visibility === "hidden") {
		where.isHidden = true;
	}

	let orderBy = [{ readsCount: "desc" }, { createdAt: "desc" }];
	if (sortBy === "newest") {
		orderBy = [{ createdAt: "desc" }];
	} else if (sortBy === "title") {
		orderBy = [{ title: "asc" }];
	} else if (sortBy === "audio") {
		orderBy = [{ hasAudio: "desc" }, { readsCount: "desc" }];
	}

	const pageNum = Math.max(1, Number(page) || 1);
	const take = Math.max(1, Number(limit) || 20);
	const skip = (pageNum - 1) * take;

	const [records, total] = await Promise.all([
		prisma.storyWeaverAudio.findMany({
			where,
			skip,
			take,
			orderBy,
		}),
		prisma.storyWeaverAudio.count({ where }),
	]);

	const stories = records.map((r) => ({
		id:          r.swId,
		swId:        r.swId,
		title:       r.title,
		language:    r.language,
		level:       r.level || "",
		slug:        r.slug,
		coverImage:  r.coverImage,
		authors:     r.authors || [],
		illustrators:r.illustrators || [],
		description: r.description || "",
		synopsis:    r.synopsis || "",
		publisher:   r.publisher || "",
		readsCount:  r.readsCount || 0,
		likesCount:  r.likesCount || 0,
		isAudio:     true,
		hasAudio:    Boolean(r.hasAudio),
		isHidden:    Boolean(r.isHidden),
		totalPages:  r.totalPages,
		orientation: r.orientation || "landscape",
		pages:       r.pages || [],
		createdAt:   r.createdAt,
		updatedAt:   r.updatedAt,
	}));

	return {
		stories,
		total,
		page: pageNum,
		totalPages: Math.ceil(total / take) || 1,
		perPage: take,
	};
};

/**
 * Get comprehensive admin statistics for StoryWeaver stories.
 */
const getAdminStoryStats = async () => {
	const [
		total,
		withAudio,
		withoutAudio,
		hidden,
		visible,
		hiddenWithoutAudio,
		languageGroups,
	] = await Promise.all([
		prisma.storyWeaverAudio.count(),
		prisma.storyWeaverAudio.count({ where: { hasAudio: true } }),
		prisma.storyWeaverAudio.count({ where: { hasAudio: false } }),
		prisma.storyWeaverAudio.count({ where: { isHidden: true } }),
		prisma.storyWeaverAudio.count({ where: { isHidden: false } }),
		prisma.storyWeaverAudio.count({ where: { hasAudio: false, isHidden: true } }),
		prisma.storyWeaverAudio.groupBy({
			by: ["language"],
			_count: { id: true },
			orderBy: { _count: { id: "desc" } },
		}),
	]);

	return {
		total,
		withAudio,
		withoutAudio,
		hidden,
		visible,
		hiddenWithoutAudio,
		languages: languageGroups.map((g) => ({
			language: g.language,
			count: g._count.id,
		})),
	};
};

/**
 * Update single story hidden status.
 */
const setStoryHidden = async (idOrSwId, isHidden) => {
	const str = String(idOrSwId).trim();
	const numericId = str.split("-")[0];

	const existing = await prisma.storyWeaverAudio.findFirst({
		where: {
			OR: [
				{ swId: str },
				{ slug: str },
				{ swId: numericId },
				{ id: str },
			],
		},
		select: { id: true, swId: true, title: true, isHidden: true },
	});

	if (!existing) {
		const err = new Error("Story not found");
		err.status = 404;
		throw err;
	}

	const updated = await prisma.storyWeaverAudio.update({
		where: { id: existing.id },
		data: { isHidden: Boolean(isHidden), updatedAt: new Date() },
	});

	// Invalidate cache immediately
	await cache.invalidate("storyweaver").catch(() => {});
	const cacheKey = `storyweaver:${CACHE_VERSION}:story:${existing.swId}`;
	await redis.del(cacheKey).catch(() => {});

	logger.info("[storyweaver] Toggled story hidden status", {
		swId: existing.swId,
		title: existing.title,
		isHidden: Boolean(isHidden),
	});

	return updated;
};

/**
 * Bulk set hidden status for StoryWeaver stories.
 */
const bulkSetHidden = async (action, storyIds = []) => {
	let result;
	let message = "";

	if (action === "hide_non_audio") {
		// HIDE ALL NON-AUDIO STORIES
		result = await prisma.storyWeaverAudio.updateMany({
			where: { hasAudio: false },
			data: { isHidden: true, updatedAt: new Date() },
		});
		message = `Successfully hid ${result.count} stories without audio.`;
	} else if (action === "unhide_non_audio") {
		result = await prisma.storyWeaverAudio.updateMany({
			where: { hasAudio: false },
			data: { isHidden: false, updatedAt: new Date() },
		});
		message = `Successfully unhid ${result.count} stories without audio.`;
	} else if (action === "hide_all") {
		result = await prisma.storyWeaverAudio.updateMany({
			data: { isHidden: true, updatedAt: new Date() },
		});
		message = `Successfully hid all ${result.count} stories.`;
	} else if (action === "unhide_all") {
		result = await prisma.storyWeaverAudio.updateMany({
			data: { isHidden: false, updatedAt: new Date() },
		});
		message = `Successfully made all ${result.count} stories visible.`;
	} else if (action === "hide_selected" && Array.isArray(storyIds) && storyIds.length > 0) {
		result = await prisma.storyWeaverAudio.updateMany({
			where: { swId: { in: storyIds.map(String) } },
			data: { isHidden: true, updatedAt: new Date() },
		});
		message = `Successfully hid ${result.count} selected stories.`;
	} else if (action === "unhide_selected" && Array.isArray(storyIds) && storyIds.length > 0) {
		result = await prisma.storyWeaverAudio.updateMany({
			where: { swId: { in: storyIds.map(String) } },
			data: { isHidden: false, updatedAt: new Date() },
		});
		message = `Successfully unhid ${result.count} selected stories.`;
	} else {
		throw new Error("Invalid bulk action or empty story selection");
	}

	await cache.invalidate("storyweaver").catch(() => {});
	logger.info("[storyweaver] Bulk hidden action executed", { action, count: result.count });

	return {
		action,
		count: result.count,
		message,
	};
};

module.exports = {
	listStories,
	getStory,
	ensurePageAudios,
	saveAudioStoryToDb,
	getAudioStoryFromDb,
	listDbAudioStories,
	getDbAudioStats,
	syncStories,
	// kept for backwards-compat with any existing callers
	syncAudios: syncStories,
	// Admin CMS methods
	listAdminStories,
	getAdminStoryStats,
	setStoryHidden,
	bulkSetHidden,
};
