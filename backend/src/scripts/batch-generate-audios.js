/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Batch Audio Generation Engine
 *
 * Automatically generates natural Edge Neural TTS audio for stories
 * stored in PostgreSQL (`storyweaver_audios`), uploads to Cloudflare R2,
 * and updates each story's pages with public `audioUrl`s.
 *
 * Targets up to 100 stories per language.
 *
 * Usage:
 *   node src/scripts/batch-generate-audios.js
 *   node src/scripts/batch-generate-audios.js --language=English --limit=100
 *   node src/scripts/batch-generate-audios.js --limit=50
 * ═══════════════════════════════════════════════════════════════════════════
 */

require("dotenv").config();
const prisma = require("../prisma/prismaClient");
const { generatePageAudio } = require("../utils/tts");
const { buildAudioKey, uploadAudio, objectExists } = require("../utils/r2");
const { r2PublicUrl } = require("../config/env");

// Parse CLI flags
const parseArgs = () => {
	const args = process.argv.slice(2);
	const options = { limitPerLang: 100, targetLanguage: undefined };

	for (const arg of args) {
		if (arg.startsWith("--limit=")) {
			options.limitPerLang = parseInt(arg.replace("--limit=", "").trim(), 10) || 100;
		} else if (arg.startsWith("--language=")) {
			options.targetLanguage = arg.replace("--language=", "").trim();
		}
	}
	return options;
};

// Keep Neon alive during generation
const startKeepAlive = () => setInterval(async () => {
	try { await prisma.$queryRaw`SELECT 1`; } catch { /* best effort */ }
}, 20_000);

const cleanR2Url = (r2PublicUrl || "").trim().replace(/\/+$/, "");

/**
 * Checks if text is back-cover / legal license boiler plate that shouldn't be read
 */
const isLicenseOrCredits = (text) => {
	if (!text) return true;
	const t = text.trim();
	if (t.length < 2) return true;
	if (t.length > 900) return true;
	if (t.includes("This book was made possible by Pratham Books") ||
	    t.includes("provided you give appropriate credit") ||
	    t.includes("CC BY 4.0 license")) {
		return true;
	}
	return false;
};

const processStory = async (story) => {
	const swId = String(story.swId || story.id);
	const pages = Array.isArray(story.pages) ? [...story.pages] : [];
	if (pages.length === 0) return { modified: false, generatedCount: 0 };

	let modified = false;
	let generatedCount = 0;

	for (let i = 0; i < pages.length; i++) {
		const page = { ...pages[i] };
		const text = (page.text || "").trim();

		// Already has clean audio URL
		if (page.audioUrl && typeof page.audioUrl === "string" && page.audioUrl.startsWith("http")) {
			// Ensure no whitespace in existing URL
			if (page.audioUrl.includes("\n") || page.audioUrl.includes("\r") || page.audioUrl.includes(" ")) {
				page.audioUrl = page.audioUrl.trim().replace(/\s+/g, "");
				pages[i] = page;
				modified = true;
			}
			continue;
		}

		if (isLicenseOrCredits(text)) {
			continue;
		}

		const audioKey = buildAudioKey(swId, i);

		// Check if already in R2
		let exists = false;
		try {
			exists = await objectExists(audioKey);
		} catch {
			exists = false;
		}

		if (exists && cleanR2Url) {
			page.audioUrl = `${cleanR2Url}/${audioKey}`;
			pages[i] = page;
			modified = true;
			continue;
		}

		// Generate audio via Edge Neural TTS
		try {
			const buffer = await generatePageAudio(text, story.language);
			if (buffer && buffer.length > 0) {
				const audioUrl = await uploadAudio(buffer, audioKey);
				page.audioUrl = audioUrl;
				pages[i] = page;
				modified = true;
				generatedCount++;
			}
		} catch (err) {
			console.warn(`    ⚠️ Page ${i + 1} audio generation failed: ${err.message}`);
		}
	}

	if (modified) {
		await prisma.storyWeaverAudio.update({
			where: { id: story.id },
			data: {
				pages,
				updatedAt: new Date(),
			},
		});
	}

	return { modified, generatedCount };
};

const main = async () => {
	const { limitPerLang, targetLanguage } = parseArgs();

	console.log("\n===================================================================");
	console.log(" 🎙️ StoryWeaver Multi-Language Batch Audio Generator");
	console.log("===================================================================");
	console.log(` Target per Language : ${limitPerLang} stories`);
	console.log(` Filter Language     : ${targetLanguage || "All available languages in DB"}`);
	console.log("===================================================================\n");

	// Get languages in DB
	const langGroups = await prisma.storyWeaverAudio.groupBy({
		by: ["language"],
		_count: { id: true },
		orderBy: { _count: { id: "desc" } },
	});

	const languages = langGroups
		.map((g) => g.language)
		.filter((l) => Boolean(l) && (!targetLanguage || l.toLowerCase() === targetLanguage.toLowerCase()));

	if (languages.length === 0) {
		console.log("No matching languages found in DB.");
		return;
	}

	let grandTotalStories = 0;
	let grandTotalAudiosGenerated = 0;
	const startTime = Date.now();

	for (const lang of languages) {
		console.log(`\n📚 Language: ${lang}`);
		console.log(`-------------------------------------------------------------------`);

		const stories = await prisma.storyWeaverAudio.findMany({
			where: { language: lang },
			take: limitPerLang,
			orderBy: [{ readsCount: "desc" }, { createdAt: "desc" }],
		});

		console.log(` Processing up to ${stories.length} stories for ${lang}...`);

		let langGenerated = 0;
		for (let sIdx = 0; sIdx < stories.length; sIdx++) {
			const story = stories[sIdx];
			const { modified, generatedCount } = await processStory(story);

			langGenerated += generatedCount;
			grandTotalAudiosGenerated += generatedCount;

			const totalPages = (story.pages || []).length;
			const audioPages = (story.pages || []).filter((p) => p.audioUrl).length;

			console.log(
				` [${sIdx + 1}/${stories.length}] ${modified ? "✨" : "✔"} "${story.title}" — ${audioPages}/${totalPages} pages with audio (+${generatedCount} new)`
			);
		}

		grandTotalStories += stories.length;
		console.log(`Completed ${lang}: ${langGenerated} new audios generated.`);
	}

	const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

	console.log("\n===================================================================");
	console.log(" 🎉 Batch Audio Generation Completed");
	console.log("===================================================================");
	console.log(` Total Stories Checked    : ${grandTotalStories}`);
	console.log(` Total New Audios Uploaded: ${grandTotalAudiosGenerated}`);
	console.log(` Total Time Elapsed       : ${elapsedSec}s`);
	console.log("===================================================================\n");
};

const keepAlive = startKeepAlive();

main()
	.catch((err) => {
		console.error("\n❌ Fatal error in batch audio generation:", err);
		process.exit(1);
	})
	.finally(async () => {
		clearInterval(keepAlive);
		await prisma.$disconnect();
		process.exit(0);
	});
