import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { Types } from 'mongoose';
import AuthTokenModel, { type AuthTokenPurpose } from '@/models/AuthToken';
import { badRequest } from './api';

const TOKEN_LIFETIME_MS: Record<AuthTokenPurpose, number> = {
  'verify-email': 24 * 60 * 60 * 1000,
  'reset-password': 60 * 60 * 1000,
  'reset-password-code': 15 * 60 * 1000,
};

/** How long an emailed 6-digit code works, and how many wrong guesses it allows. */
export const CODE_LIFETIME_MINUTES = 15;
export const MAX_CODE_ATTEMPTS = 5;

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

/** Creates a token for emailing to the user. Earlier tokens for the same purpose stop working. */
export async function issueAuthToken(userId: Types.ObjectId, purpose: AuthTokenPurpose) {
  const token = randomBytes(32).toString('base64url');
  await AuthTokenModel.deleteMany({ user: userId, purpose });
  await AuthTokenModel.create({
    user: userId,
    purpose,
    tokenHash: hash(token),
    expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS[purpose]),
  });
  return token;
}

/** Uses up a token. Returns the user it belongs to, or null if it is wrong, used, or expired. */
export async function consumeAuthToken(token: string, purpose: AuthTokenPurpose) {
  const record = await AuthTokenModel.findOneAndDelete({
    tokenHash: hash(token),
    purpose,
    expiresAt: { $gt: new Date() },
  }).lean();
  return record?.user ?? null;
}

// ---- 6-digit codes -------------------------------------------------------------------------

/** A random 6-digit code such as "042917". */
export function newCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Hash of a code, salted with what it belongs to (a user id or an email) so equal codes differ. */
export const codeHash = (scope: string, code: string) => hash(`${scope}:${code}`);

export function codeMatches(storedHash: string, scope: string, code: string) {
  const expected = Buffer.from(storedHash, 'hex');
  const actual = Buffer.from(codeHash(scope, code), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export type CodeProblem = 'wrong' | 'expired' | 'locked';

const CODE_MESSAGES: Record<CodeProblem, string> = {
  wrong: "That code isn't right. Check the email and try again.",
  expired: 'This code has expired. Ask for a new one.',
  locked: 'Too many wrong tries. Ask for a new code.',
};

/** The error for a code that didn't work, shown under the code boxes. */
export const codeError = (problem: CodeProblem) => badRequest(CODE_MESSAGES[problem], { code: [CODE_MESSAGES[problem]] });

/** A new code to email to a user. Earlier codes for the same purpose stop working. */
export async function issueCode(userId: Types.ObjectId, purpose: 'reset-password-code') {
  const code = newCode();
  await AuthTokenModel.deleteMany({ user: userId, purpose });
  await AuthTokenModel.create({
    user: userId,
    purpose,
    tokenHash: codeHash(userId.toString(), code),
    expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS[purpose]),
  });
  return code;
}

/**
 * Checks a user's code and uses it up when it matches. Each wrong guess is counted, and the code
 * stops working after `MAX_CODE_ATTEMPTS` of them. Throws `codeError` when it doesn't match.
 */
export async function redeemCode(userId: Types.ObjectId, purpose: 'reset-password-code', code: string) {
  const record = await AuthTokenModel.findOne({ user: userId, purpose, expiresAt: { $gt: new Date() } }).lean();
  if (!record) throw codeError('expired');
  if (codeMatches(record.tokenHash, userId.toString(), code)) {
    await AuthTokenModel.deleteOne({ _id: record._id });
    return;
  }
  const counted = await AuthTokenModel.findOneAndUpdate({ _id: record._id }, { $inc: { attempts: 1 } }, { new: true }).lean();
  if (!counted || counted.attempts >= MAX_CODE_ATTEMPTS) {
    await AuthTokenModel.deleteOne({ _id: record._id });
    throw codeError('locked');
  }
  throw codeError('wrong');
}
