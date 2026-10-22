/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Cloudflare R2 Upload Utility
 *
 * Uploads audio files (MP3) to Cloudflare R2 using the S3-compatible API.
 * Returns a public URL for immediate playback.
 *
 * Usage:
 *   const { uploadAudio } = require("../utils/r2");
 *   const url = await uploadAudio(mp3Buffer, "audio/12345/page-1.mp3");
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2BucketName, r2PublicUrl } = require("../config/env");
const logger = require("./logger");

// ── S3 Client configured for Cloudflare R2 ───────────────────────────────────

let s3Client = null;

const getClient = () => {
	if (s3Client) return s3Client;

	if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
		throw new Error("R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env");
	}

	s3Client = new S3Client({
		region: "auto",
		endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: r2AccessKeyId,
			secretAccessKey: r2SecretAccessKey,
		},
	});

	return s3Client;
};

/**
 * Build the R2 object key for a story page's audio.
 * @param {string} storyId  — StoryWeaver story ID (numeric)
 * @param {number} pageIdx  — 0-based page index
 * @returns {string} — e.g. "audio/12345/page-0.mp3"
 */
const buildAudioKey = (storyId, pageIdx) => {
	return `audio/${storyId}/page-${pageIdx}.mp3`;
};

/**
 * Check if an object already exists in R2.
 * @param {string} key — R2 object key
 * @returns {Promise<boolean>}
 */
const objectExists = async (key) => {
	try {
		await getClient().send(new HeadObjectCommand({
			Bucket: r2BucketName,
			Key: key,
		}));
		return true;
	} catch {
		return false;
	}
};

/**
 * Upload an MP3 buffer to Cloudflare R2.
 * @param {Buffer} buffer  — MP3 audio data
 * @param {string} key     — R2 object key (e.g. "audio/12345/page-0.mp3")
 * @returns {Promise<string>} — Public URL
 */
const uploadAudio = async (buffer, key) => {
	if (!buffer || buffer.length === 0) {
		throw new Error("Cannot upload empty buffer");
	}

	const client = getClient();

	logger.info("[r2] Uploading audio", { key, size: buffer.length });

	await client.send(new PutObjectCommand({
		Bucket: r2BucketName,
		Key: key,
		Body: buffer,
		ContentType: "audio/mpeg",
		CacheControl: "public, max-age=31536000, immutable",
	}));

	const publicUrl = `${(r2PublicUrl || "").trim().replace(/\/+$/, "")}/${key}`;
	logger.info("[r2] Upload complete", { key, publicUrl });

	return publicUrl;
};

/**
 * Upload a story page's audio to R2.
 * @param {Buffer} buffer   — MP3 audio data
 * @param {string} storyId  — StoryWeaver story ID
 * @param {number} pageIdx  — 0-based page index
 * @returns {Promise<string>} — Public URL
 */
const uploadPageAudio = async (buffer, storyId, pageIdx) => {
	const key = buildAudioKey(storyId, pageIdx);
	return uploadAudio(buffer, key);
};

module.exports = {
	uploadAudio,
	uploadPageAudio,
	buildAudioKey,
	objectExists,
	getClient,
};
