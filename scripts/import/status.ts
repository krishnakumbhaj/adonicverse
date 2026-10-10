// Read-only summary of what the importer has saved so far:
//
//   npm run import:status

import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import EpisodeModel from '@/models/Episode';
import SeasonModel from '@/models/Season';
import StoryModel from '@/models/Story';
import { clusterSizeMb } from './writer';

loadEnvConfig(process.cwd());

async function main() {
  await dbConnect();
  const imported = { source: { $ne: null } };
  const stories = await StoryModel.find(imported).select('_id title type language genres poster').lean();
  const ids = stories.map((story) => story._id);
  const [seasons, episodes] = await Promise.all([
    SeasonModel.countDocuments({ story: { $in: ids } }),
    EpisodeModel.countDocuments({ story: { $in: ids } }),
  ]);

  const count = (key: (story: (typeof stories)[number]) => string) => {
    const counts = new Map<string, number>();
    for (const story of stories) counts.set(key(story), (counts.get(key(story)) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).map(([name, n]) => `${name} ${n}`).join(' · ');
  };

  console.log(`\nImported stories: ${stories.length} (${seasons} seasons, ${episodes} episodes)`);
  console.log(`Language: ${count((story) => story.language)}`);
  console.log(`Type:     ${count((story) => story.type)}`);
  console.log(`Genre:    ${count((story) => story.genres[0] ?? 'none')}`);
  const posters = stories.filter((story) => story.poster?.url);
  console.log(`Posters:  ${posters.length}/${stories.length}${posters[0] ? ` (e.g. ${posters[0].poster!.url})` : ''}`);
  console.log(`Database: ${(await clusterSizeMb()).toFixed(1)} MB of 512 MB\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
