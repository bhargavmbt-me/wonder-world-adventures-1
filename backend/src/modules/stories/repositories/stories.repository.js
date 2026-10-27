const prisma = require("../../../prisma/prismaClient");
const { parsePagination, buildPaginationMeta, safeSortField, safeSortDir } = require("../../../utils/pagination");

// ── Shared include for DETAIL endpoint (full data) ────────────────
const includeStory = {
	language: true,
	quizzes: {
		where: { isPublished: true },
		include: { questions: { orderBy: { sortOrder: "asc" } } },
	},
};

// ── Lightweight SELECT for LIST endpoints (cards/thumbnails) ──────
// Excludes heavy fields: content, pages — those are only needed in detail
const selectListStory = {
	id: true,
	slug: true,
	title: true,
	subtitle: true,
	description: true,
	author: true,
	category: true,
	ageGroup: true,
	difficulty: true,
	tags: true,
	coverImage: true,
	thumbnail: true,
	thumbnailUrl: true,
	backgroundUrl: true,
	coverEmoji: true,
	coverGradient: true,
	readingTime: true,
	listeningTime: true,
	duration: true,
	isPremium: true,
	isPublished: true,
	isFeatured: true,
	isTrending: true,
	isRecommended: true,
	readAloudEnabled: true,
	narratorVoice: true,
	audioUrl: true,
	xpReward: true,
	starsReward: true,
	likesCount: true,
	readsCount: true,
	favoritesCount: true,
	sortOrder: true,
	createdAt: true,
	updatedAt: true,
	languageId: true,
	language: true,
	// No quizzes in list view — only needed on detail
};

// ── Language filter builder ───────────────────────────────────────
const buildLanguageFilter = (language) => {
	if (!language) return undefined;
	return {
		OR: [
			{ languageId: language },
			{ language: { code: { equals: language, mode: "insensitive" } } },
			{ language: { name: { equals: language, mode: "insensitive" } } },
		],
	};
};

// ── List (supports rich admin + public filtering + pagination) ─────
const ALLOWED_SORT_FIELDS = ["createdAt", "title", "readingTime", "starsReward", "xpReward", "readsCount", "likesCount", "sortOrder"];

const list = async ({
	language, category, ageGroup, difficulty,
	isPremium, isFeatured, isTrending, isRecommended,
	isPublished, search,
	limit = 20, page = 1,
	sortBy = "createdAt", sortOrder: sortDir = "desc",
} = {}) => {
	const where = {};

	// Only apply isPublished filter if explicitly provided
	if (typeof isPublished === "boolean") where.isPublished = isPublished;

	if (category)   where.category  = { equals: category,  mode: "insensitive" };
	if (ageGroup)   where.ageGroup   = ageGroup;
	if (difficulty) where.difficulty = { equals: difficulty, mode: "insensitive" };

	if (typeof isPremium    === "boolean") where.isPremium    = isPremium;
	if (typeof isFeatured   === "boolean") where.isFeatured   = isFeatured;
	if (typeof isTrending   === "boolean") where.isTrending   = isTrending;
	if (typeof isRecommended=== "boolean") where.isRecommended= isRecommended;

	if (search) {
		where.OR = [
			{ title:       { contains: search, mode: "insensitive" } },
			{ author:      { contains: search, mode: "insensitive" } },
			{ description: { contains: search, mode: "insensitive" } },
		];
	}

	const langFilter = buildLanguageFilter(language);
	if (langFilter) Object.assign(where, langFilter);

	const orderField = safeSortField(sortBy, ALLOWED_SORT_FIELDS);
	const orderDir   = safeSortDir(sortDir);

	const pagination = parsePagination({ page, limit });

	const [stories, total] = await Promise.all([
		prisma.story.findMany({
			where,
			select: selectListStory,
			orderBy: [{ readAloudEnabled: "desc" }, { [orderField]: orderDir }],
			take: pagination.limit,
			skip: pagination.skip,
		}),
		prisma.story.count({ where }),
	]);

	return {
		stories,
		pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
	};
};

// ── Find by id or slug (FULL detail — includes content, pages, quizzes) ──
const findByIdOrSlug = (id) =>
	prisma.story.findFirst({
		where: { OR: [{ id }, { slug: id }] },
		include: includeStory,
	});

// ── Category listing ──────────────────────────────────────────────
const listByCategory = (category, query = {}) =>
	list({ ...query, category, isPublished: true });

// ── Recommended ───────────────────────────────────────────────────
const recommended = (limit = 6) =>
	prisma.story.findMany({
		where: { isPublished: true },
		select: selectListStory,
		orderBy: [{ isPremium: "asc" }, { starsReward: "desc" }, { sortOrder: "asc" }],
		take: limit,
	});

// ── Language lookup ───────────────────────────────────────────────
const findLanguage = ({ languageId, languageCode }) => {
	if (!languageId && !languageCode) return null;
	return prisma.language.findFirst({
		where: {
			OR: [
				...(languageId   ? [{ id: languageId }] : []),
				...(languageCode ? [{ code: { equals: languageCode, mode: "insensitive" } }] : []),
			],
		},
	});
};

// ── CRUD ──────────────────────────────────────────────────────────
const create = (data)       => prisma.story.create({ data, include: includeStory });
const update = (id, data)   => prisma.story.update({ where: { id }, data, include: includeStory });
const remove = (id)         => prisma.story.delete({ where: { id } });

module.exports = {
	list,
	findByIdOrSlug,
	listByCategory,
	recommended,
	findLanguage,
	create,
	update,
	remove,
};
