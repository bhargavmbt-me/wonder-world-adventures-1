const prisma = require('../prisma/prismaClient');

async function getAudioStats() {
  const stories = await prisma.storyWeaverAudio.findMany({
    select: { swId: true, title: true, language: true, pages: true }
  });

  let totalStories = stories.length;
  let storiesWithAudio = 0;
  let totalAudioPages = 0;
  let totalPages = 0;

  const byLang = {};

  for (const s of stories) {
    const lang = s.language || 'Unknown';
    if (!byLang[lang]) {
      byLang[lang] = {
        totalStories: 0,
        storiesWithAudio: 0,
        audioPages: 0,
        totalPages: 0,
      };
    }

    const pages = Array.isArray(s.pages) ? s.pages : [];
    const countPages = pages.length;
    // Check if audioUrl is present and valid
    const countAudioPages = pages.filter(p => p.audioUrl && typeof p.audioUrl === 'string' && p.audioUrl.startsWith('http')).length;

    byLang[lang].totalStories++;
    byLang[lang].audioPages += countAudioPages;
    byLang[lang].totalPages += countPages;

    totalAudioPages += countAudioPages;
    totalPages += countPages;

    if (countAudioPages > 0) {
      storiesWithAudio++;
      byLang[lang].storiesWithAudio++;
    }
  }

  console.log(JSON.stringify({
    totalStories,
    storiesWithAudio,
    totalAudioPages,
    totalPages,
    byLang
  }, null, 2));
}

getAudioStats().catch(console.error);
