import type { ClientSession, FilterQuery, Model } from 'mongoose';
import { withTransaction } from '@/lib/db';

// For "relationship" rows such as likes, subscriptions and library saves: one row per
// user and target, plus counters that must change only when the row actually appears or goes.

/** Inserts the row unless it exists, running `onAdded` in the same transaction. Returns true if added. */
export async function addOnce<T>(
  model: Model<T>,
  row: FilterQuery<T>,
  onAdded: (session: ClientSession) => Promise<unknown>,
) {
  try {
    return await withTransaction(async (session) => {
      if (await model.exists(row).session(session)) return false;
      await model.create([row], { session });
      await onAdded(session);
      return true;
    });
  } catch (error) {
    // Another request added the same row at the same moment.
    if ((error as { code?: number }).code === 11000) return false;
    throw error;
  }
}

/** Deletes the row if it exists, running `onRemoved` in the same transaction. Returns true if removed. */
export async function removeOnce<T>(
  model: Model<T>,
  row: FilterQuery<T>,
  onRemoved: (session: ClientSession, removed: T) => Promise<unknown>,
) {
  return withTransaction(async (session) => {
    const removed = await model.findOneAndDelete(row, { session }).lean<T>();
    if (!removed) return false;
    await onRemoved(session, removed);
    return true;
  });
}
