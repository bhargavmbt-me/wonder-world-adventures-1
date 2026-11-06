const { PrismaClient } = require("@prisma/client");

const globalForPrisma = global.__prismaClient || {};

const prisma =
	globalForPrisma.prisma ||
	new PrismaClient({
		log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
	});

if (process.env.NODE_ENV !== "production") {
	global.__prismaClient = { prisma };
}

// Graceful shutdown - ensure connections are released
process.on('beforeExit', async () => {
	await prisma.$disconnect();
});

process.on('SIGINT', async () => {
	await prisma.$disconnect();
	process.exit(0);
});

process.on('SIGTERM', async () => {
	await prisma.$disconnect();
	process.exit(0);
});

module.exports = prisma;
