/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TTS (Text-to-Speech) Utility — msedge-tts
 *
 * Generates MP3 audio buffers from text using Microsoft Edge's free neural
 * TTS voices. Supports multiple languages with child-friendly voice selection.
 *
 * Usage:
 *   const { generatePageAudio } = require("../utils/tts");
 *   const mp3Buffer = await generatePageAudio("Hello world", "English");
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const logger = require("./logger");

// ── Language → Voice mapping ─────────────────────────────────────────────────
// Using warm, natural-sounding female voices that work well for children's stories
const VOICE_MAP = {
	"English":    "en-IN-NeerjaNeural",
	"Hindi":      "hi-IN-SwaraNeural",
	"Gujarati":   "gu-IN-DhwaniNeural",
	"Marathi":    "mr-IN-AarohiNeural",
	"Urdu":       "ur-IN-GulNeural",
	"Kannada":    "kn-IN-SapnaNeural",
	"Tamil":      "ta-IN-PallaviNeural",
	"Arabic":     "ar-SA-ZariyahNeural",
	"Telugu":     "te-IN-ShrutiNeural",
	"Bengali":    "bn-IN-TanishaaNeural",
	"Malayalam":  "ml-IN-SobhanaNeural",
	"Punjabi":    "pa-google",
	"Odia":       "bn-IN-TanishaaNeural",
	"Assamese":   "bn-IN-TanishaaNeural",
	"Sanskrit":   "hi-IN-SwaraNeural",
	"French":     "fr-FR-DeniseNeural",
	"Spanish":    "es-ES-ElviraNeural",
	"Portuguese": "pt-BR-FranciscaNeural",
};

const DEFAULT_VOICE = "en-IN-NeerjaNeural";

/**
 * Select the best voice for a given language.
 * @param {string} language — e.g. "English", "Hindi", "Gujarati"
 * @returns {string} — msedge-tts voice name
 */
const pickVoice = (language) => {
	if (!language) return DEFAULT_VOICE;

	// Exact match first
	if (VOICE_MAP[language]) return VOICE_MAP[language];

	// Case-insensitive match
	const key = Object.keys(VOICE_MAP).find(
		(k) => k.toLowerCase() === language.toLowerCase()
	);
	if (key) return VOICE_MAP[key];

	// Partial match (e.g. "English - India" → "English")
	const partial = Object.keys(VOICE_MAP).find(
		(k) => language.toLowerCase().includes(k.toLowerCase())
	);
	if (partial) return VOICE_MAP[partial];

	return DEFAULT_VOICE;
};

/**
 * Fallback TTS for languages unsupported by Edge TTS (e.g. Punjabi)
 */
const fetchGoogleTts = async (text, langCode = "pa") => {
	const chunks = text.match(/.{1,150}(\s|$)/g) || [text];
	const buffers = [];
	for (const chunk of chunks) {
		const t = chunk.trim();
		if (!t) continue;
		const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${langCode}&q=${encodeURIComponent(t)}`;
		const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
		if (!res.ok) throw new Error(`Google TTS status ${res.status}`);
		const buf = Buffer.from(await res.arrayBuffer());
		if (buf.length > 0) buffers.push(buf);
		await new Promise((r) => setTimeout(r, 120));
	}
	return buffers.length > 0 ? Buffer.concat(buffers) : null;
};

/**
 * Generate MP3 audio from text using msedge-tts (or Google TTS for Punjabi).
 *
 * @param {string} text     — The text to speak
 * @param {string} language — Story language for voice selection
 * @returns {Promise<Buffer>} — MP3 audio buffer
 */
const generatePageAudio = async (text, language = "English") => {
	if (!text || text.trim().length === 0) {
		return null;
	}

	// Clean the text for better TTS output
	const cleanText = text
		.replace(/\s+/g, " ")
		.replace(/["\u201C\u201D]/g, '"')
		.replace(/['\u2018\u2019]/g, "'")
		.trim();

	if (cleanText.length < 2) return null;

	const voice = pickVoice(language);
	logger.info("[tts] Generating audio", { language, voice, textLength: cleanText.length });

	// Use Google TTS for Punjabi
	if (voice === "pa-google" || language === "Punjabi") {
		try {
			const buf = await fetchGoogleTts(cleanText, "pa");
			if (buf && buf.length > 0) {
				logger.info("[tts] Audio generated via Google TTS", { language, size: buf.length });
				return buf;
			}
		} catch (err) {
			logger.warn("[tts] Google TTS failed, falling back to msedge-tts", { error: err.message });
		}
	}

	// Split long text into chunks to avoid WebSocket drops on Render
	// msedge-tts WebSocket disconnects for text > ~500 chars
	const MAX_CHUNK_CHARS = 400;
	const textChunks = splitTextIntoChunks(cleanText, MAX_CHUNK_CHARS);

	logger.info("[tts] Split into chunks", { totalChunks: textChunks.length, chunkSizes: textChunks.map(c => c.length) });

	const audioBuffers = [];

	for (let i = 0; i < textChunks.length; i++) {
		const chunk = textChunks[i];
		if (chunk.trim().length < 2) continue;

		try {
			const buffer = await generateChunkAudio(chunk, voice);
			if (buffer && buffer.length > 0) {
				audioBuffers.push(buffer);
			}
		} catch (err) {
			logger.error("[tts] Chunk generation failed", {
				chunkIdx: i,
				chunkLen: chunk.length,
				error: err.message,
			});
			// Continue with remaining chunks — partial audio is better than none
		}

		// Small delay between chunks to avoid rate-limiting
		if (i < textChunks.length - 1) {
			await new Promise((r) => setTimeout(r, 200));
		}
	}

	if (audioBuffers.length === 0) {
		logger.error("[tts] All chunks failed — no audio produced");
		return null;
	}

	const finalBuffer = Buffer.concat(audioBuffers);
	logger.info("[tts] Audio generated", {
		size: finalBuffer.length,
		voice,
		chunksUsed: audioBuffers.length,
		totalChunks: textChunks.length,
	});

	return finalBuffer;
};

/**
 * Split text into chunks at sentence boundaries, respecting MAX_CHARS limit.
 * Splits at '. ', '! ', '? ', then falls back to ', ' or space.
 *
 * @param {string} text
 * @param {number} maxChars
 * @returns {string[]}
 */
const splitTextIntoChunks = (text, maxChars) => {
	if (text.length <= maxChars) {
		return [text];
	}

	const chunks = [];
	let remaining = text;

	while (remaining.length > 0) {
		if (remaining.length <= maxChars) {
			chunks.push(remaining.trim());
			break;
		}

		// Find the best split point within maxChars
		let splitAt = -1;

		// Priority 1: Split at sentence end (. ! ?)
		const sentenceEnders = [". ", "! ", "? ", ".\u201D ", "!\u201D ", "?\u201D "];
		for (const ender of sentenceEnders) {
			const idx = remaining.lastIndexOf(ender, maxChars);
			if (idx > 0 && idx > splitAt) {
				splitAt = idx + ender.length - 1; // Include the punctuation, not the space
			}
		}

		// Priority 2: Split at comma or semicolon
		if (splitAt < 0) {
			const commaIdx = remaining.lastIndexOf(", ", maxChars);
			const semiIdx = remaining.lastIndexOf("; ", maxChars);
			splitAt = Math.max(commaIdx, semiIdx);
			if (splitAt > 0) splitAt += 1;
		}

		// Priority 3: Split at any space
		if (splitAt < 0) {
			splitAt = remaining.lastIndexOf(" ", maxChars);
		}

		// Priority 4: Hard split (shouldn't happen with normal text)
		if (splitAt <= 0) {
			splitAt = maxChars;
		}

		chunks.push(remaining.substring(0, splitAt).trim());
		remaining = remaining.substring(splitAt).trim();
	}

	return chunks.filter((c) => c.length > 0);
};

/**
 * Generate audio for a single small text chunk with timeout and retry.
 * Creates a fresh MsEdgeTTS instance per call to avoid stale WebSocket issues.
 *
 * @param {string} chunkText — Small text chunk (< 500 chars ideally)
 * @param {string} voice     — msedge-tts voice name
 * @returns {Promise<Buffer>} — MP3 audio buffer
 */
const generateChunkAudio = async (chunkText, voice) => {
	const TTS_TIMEOUT_MS = 15_000; // 15s per chunk (short text = fast)

	const attempt = () =>
		new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error(`TTS chunk timed out after ${TTS_TIMEOUT_MS / 1000}s`));
			}, TTS_TIMEOUT_MS);

			(async () => {
				try {
					const tts = new MsEdgeTTS();
					await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

					const { audioStream } = tts.toStream(chunkText);

					const chunks = [];
					audioStream.on("data", (chunk) => {
						if (chunk && chunk.audio) {
							chunks.push(chunk.audio);
						} else if (Buffer.isBuffer(chunk)) {
							chunks.push(chunk);
						}
					});
					audioStream.on("end", () => {
						clearTimeout(timer);
						const buffer = Buffer.concat(chunks);
						if (buffer.length === 0) {
							reject(new Error("TTS chunk produced empty audio"));
						} else {
							resolve(buffer);
						}
					});
					audioStream.on("error", (err) => {
						clearTimeout(timer);
						reject(err);
					});
				} catch (err) {
					clearTimeout(timer);
					reject(err);
				}
			})();
		});

	// Try up to 2 times per chunk
	try {
		return await attempt();
	} catch (firstErr) {
		logger.warn("[tts] Chunk attempt 1 failed, retrying...", { error: firstErr.message, textLen: chunkText.length });
		await new Promise((r) => setTimeout(r, 300));
		return await attempt();
	}
};

module.exports = {
	generatePageAudio,
	pickVoice,
	VOICE_MAP,
};

