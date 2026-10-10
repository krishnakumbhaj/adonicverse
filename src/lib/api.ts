import { NextResponse, type NextRequest } from 'next/server';
import mongoose, { Types } from 'mongoose';
import { ZodError, type z, type ZodTypeAny } from 'zod';
import { objectIdSchema, type Pagination } from '@/schemas/common';
import { dbConnect } from './db';

type FieldErrors = Record<string, string[] | undefined>;

/** An error that is safe to show to the client. Anything else becomes a generic 500. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: FieldErrors,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, fields?: FieldErrors) =>
  new ApiError(400, 'BAD_REQUEST', message, fields);
export const unauthorized = (message = 'You need to sign in to do that.') =>
  new ApiError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You are not allowed to do that.') =>
  new ApiError(403, 'FORBIDDEN', message);
export const notFound = (what = 'Resource') => new ApiError(404, 'NOT_FOUND', `${what} not found.`);
export const conflict = (message: string, fields?: FieldErrors) =>
  new ApiError(409, 'CONFLICT', message, fields);
export const tooManyRequests = (message = 'Too many requests. Please try again later.') =>
  new ApiError(429, 'RATE_LIMITED', message);

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

function fail(status: number, code: string, message: string, fields?: FieldErrors) {
  return NextResponse.json({ ok: false, error: { code, message, ...(fields && { fields }) } }, { status });
}

function errorResponse(error: unknown) {
  if (error instanceof ApiError) return fail(error.status, error.code, error.message, error.fields);
  if (error instanceof ZodError) {
    return fail(400, 'VALIDATION_ERROR', 'Some fields are invalid.', error.flatten().fieldErrors);
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const fields = Object.fromEntries(Object.entries(error.errors).map(([path, e]) => [path, [e.message]]));
    return fail(400, 'VALIDATION_ERROR', 'Some fields are invalid.', fields);
  }
  if ((error as { code?: number })?.code === 11000) {
    const keys = Object.keys((error as { keyPattern?: object }).keyPattern ?? {});
    const fields = Object.fromEntries(keys.map((key) => [key, ['This is already taken.']]));
    return fail(409, 'CONFLICT', 'That already exists.', fields);
  }
  console.error(error);
  return fail(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
}

/**
 * Wraps a route handler: connects to the database, resolves params,
 * and turns thrown errors into the standard `{ ok: false, error }` response.
 */
export function route<P = unknown>(handler: (request: NextRequest, params: P) => Promise<Response>) {
  return async (request: NextRequest, context: { params: Promise<P> }) => {
    try {
      await dbConnect();
      return await handler(request, await context?.params);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** Parses and validates a JSON body. An empty body counts as `{}`. */
export async function readJson<S extends ZodTypeAny>(request: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    const text = await request.text();
    body = text.trim() ? JSON.parse(text) : {};
  } catch {
    throw badRequest('The request body must be valid JSON.');
  }
  return schema.parse(body);
}

export function readQuery<S extends ZodTypeAny>(request: NextRequest, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(request.nextUrl.searchParams));
}

/** Parses an id from the URL. Malformed ids are reported as "not found", like unknown ones. */
export function parseId(value: string, what: string): Types.ObjectId {
  if (!objectIdSchema.safeParse(value).success) throw notFound(what);
  return new Types.ObjectId(value);
}

/** Query window that fetches one extra row so `paged` can tell whether another page exists. */
export function pageWindow({ page, limit }: Pagination) {
  return { skip: (page - 1) * limit, limit: limit + 1 };
}

export function paged<T>(items: T[], { page, limit }: Pagination) {
  return { items: items.slice(0, limit), page, limit, hasMore: items.length > limit };
}

export function clientIp(headers: Headers | Record<string, unknown> | undefined) {
  const get = (name: string) =>
    headers instanceof Headers ? headers.get(name) : (headers?.[name] as string | undefined);
  return get('x-forwarded-for')?.split(',')[0]?.trim() || get('x-real-ip') || 'unknown';
}
