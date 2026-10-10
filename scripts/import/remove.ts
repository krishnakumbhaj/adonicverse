// Removes imported stories, the same way the app deletes a story (episodes, seasons, poster and all).
// Lists what it would remove unless --yes is given.
//
//   npm run import:remove -- --duplicates                  later editions of a book that's already imported
//   npm run import:remove -- "Oliver Twist, Vol. 2 (Of 3)"  stories with exactly these titles
//   npm run import:remove -- --keep=208                    everything imported after the first 208 stories
//   npm run import:remove -- --duplicates --yes            really remove them

import { loadEnvConfig } from '@next/env';
import mongoose, { type Types } from 'mongoose';
import { dbConnect } from '@/lib/db';
import StoryModel from '@/models/Story';
import { deleteStory } from '@/server/cascade';
import { editionKey } from './writer';

loadEnvConfig(process.cwd());

const flags = process.argv.slice(2).filter((arg) => arg.startsWith('--'));
const titles = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const confirmed = flags.includes('--yes');

async function main() {
  await dbConnect();
  const stories = await StoryModel.find({ 'source.provider': { $exists: true } })
    .select('title source createdAt channel')
    .populate<{ channel: { name: string } | null }>('channel', 'name')
    .sort({ createdAt: 1 })
    .lean();

  const doomed = new Map<string, { _id: Types.ObjectId; label: string }>();
  const wanted = new Set(titles.map((title) => title.toLowerCase()));
  for (const story of stories) {
    if (wanted.has(story.title.toLowerCase())) doomed.set(String(story._id), { _id: story._id, label: story.title });
  }
  const keep = flags.find((flag) => flag.startsWith('--keep='));
  if (keep) {
    for (const story of stories.slice(Number(keep.split('=')[1]))) {
      doomed.set(String(story._id), { _id: story._id, label: story.title });
    }
  }
  if (flags.includes('--duplicates')) {
    const first = new Map<string, string>();
    for (const story of stories) {
      const key = editionKey(story.title, story.channel?.name ?? '');
      if (!first.has(key)) first.set(key, story.title);
      else doomed.set(String(story._id), { _id: story._id, label: `${story.title} (another edition)` });
    }
  }

  if (doomed.size === 0) return console.log('Nothing to remove.');
  console.log(`${confirmed ? 'Removing' : 'Would remove'} ${doomed.size} stor${doomed.size === 1 ? 'y' : 'ies'}:`);
  for (const { _id, label } of doomed.values()) {
    console.log(`  - ${label}`);
    if (confirmed) await deleteStory(_id);
  }
  if (!confirmed) console.log('\nNothing changed. Add --yes to remove them.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
