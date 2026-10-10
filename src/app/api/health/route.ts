import mongoose from 'mongoose';
import { ok, route } from '@/lib/api';

/** For uptime checks: answers once the database connection works. */
export const GET = route(async () => {
  await mongoose.connection.db?.admin().ping();
  return ok({ status: 'up' });
});
