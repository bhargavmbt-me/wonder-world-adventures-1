const path = require("path");
const dotenv = require("dotenv");

// ── Environment loading strategy ────────────────────────────────
//
// On Render (production):
//   - Render pre-populates process.env from the dashboard BEFORE
//     the app starts. dotenv.config() never overwrites existing
//     process.env values, so production secrets are always safe.
//   - NODE_ENV === "production", so .env.development is skipped.
//
// Local development:
//   - .env.development is loaded first (local DB, localhost CORS).
//   - .env is loaded second as a fallback for any keys not in
//     .env.development (JWT_SECRET, Google keys, Razorpay, etc.).
//   - override: false on the second call ensures .env never
//     clobbers values already set by .env.development.
//
// ────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== "production") {
	// Local: load .env.development first with override:true so it always
	// wins — even if .env was somehow loaded earlier or values were inherited.
	// Safe because this block never runs on Render (NODE_ENV=production there).
	dotenv.config({ path: path.resolve(process.cwd(), ".env.development"), override: true });
}

// Fallback for keys not in .env.development, and the only source
// for production (but Render vars are already in process.env by now).
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: false });

const getEnv = (key, fallback) => {
	if (process.env[key]) return process.env[key];
	if (fallback !== undefined) return fallback;
	return undefined;
};

const parseList = (value) => {
	if (!value) return [];
	return value
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
};

const parseBool = (value, fallback = false) => {
	if (value === undefined) return fallback;
	return value === "true" || value === "1";
};

module.exports = {
	env: getEnv("NODE_ENV", "development"),
	port: Number(getEnv("PORT", 5000)),
	databaseUrl: getEnv("DATABASE_URL"),
	jwtSecret: getEnv("JWT_SECRET"),
	googleClientId: getEnv("GOOGLE_CLIENT_ID"),
	googleClientSecret: getEnv("GOOGLE_CLIENT_SECRET"),
	resendApiKey: getEnv("RESEND_API_KEY"),
	resendFromEmail: getEnv("RESEND_FROM_EMAIL"),
	clientUrl: getEnv("CLIENT_URL", "https://wonder-world-adventures.vercel.app"),
	clientUrls: parseList(getEnv("CLIENT_URLS", "")),
	serverUrl: getEnv("SERVER_URL", "https://wonder-world-adventures.onrender.com"),
	logRequests: parseBool(getEnv("LOG_REQUESTS", "false")),
	authDebug: parseBool(getEnv("AUTH_DEBUG", "false")),
	razorpayKeyId: getEnv("RAZORPAY_KEY_ID"),
	razorpayKeySecret: getEnv("RAZORPAY_KEY_SECRET"),
	// ── RAG / AI ──────────────────────────────────────────────────
	openrouterApiKey: getEnv("OPENROUTER_API_KEY"),
	redisUrl: getEnv("REDIS_URL"),
	// ── StoryWeaver ────────────────────────────────────────────────
	storyweaverApiToken: getEnv("STORYWEAVER_API_TOKEN", ""),
	// ── Cloudflare R2 (Audio Storage) ──────────────────────────────
	r2AccountId:       getEnv("R2_ACCOUNT_ID", ""),
	r2AccessKeyId:     getEnv("R2_ACCESS_KEY_ID", ""),
	r2SecretAccessKey: getEnv("R2_SECRET_ACCESS_KEY", ""),
	r2BucketName:      getEnv("R2_BUCKET_NAME", "flucieaudio"),
	r2PublicUrl:       getEnv("R2_PUBLIC_URL", "").trim(),
};


