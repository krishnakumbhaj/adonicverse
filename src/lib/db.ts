import mongoose, { type ClientSession } from 'mongoose';

const globalForMongoose = globalThis as unknown as {
  mongooseConnection?: Promise<typeof mongoose>;
};

/**
 * Connects once and reuses the connection across requests and hot reloads.
 * `MONGODB_DB` picks the database inside the cluster so this app never shares data with other apps.
 */
export async function dbConnect(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  globalForMongoose.mongooseConnection ??= mongoose
    .connect(uri, { dbName: process.env.MONGODB_DB || 'story_platform' })
    .catch((error) => {
      globalForMongoose.mongooseConnection = undefined;
      throw error;
    });

  await globalForMongoose.mongooseConnection;
}

/**
 * Runs `work` inside a MongoDB transaction. The driver may retry `work` on transient errors,
 * so it must only touch the database through `session` and have no other side effects.
 */
export async function withTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  await dbConnect();
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}
