// Browser-side helpers for calling our own API (`{ ok, data }` / `{ ok, error }` responses).

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string[] | undefined>,
  ) {
    super(message);
  }
}

type Options = Omit<RequestInit, 'body'> & { json?: unknown; body?: BodyInit };

export async function api<T>(path: string, { json, headers, ...init }: Options = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: json === undefined ? headers : { 'content-type': 'application/json', ...headers },
    body: json === undefined ? init.body : JSON.stringify(json),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    throw new ApiClientError(
      response.status,
      body?.error?.code ?? 'HTTP_ERROR',
      body?.error?.message ?? 'Something went wrong. Please try again.',
      body?.error?.fields,
    );
  }
  return body.data as T;
}

/** SWR fetcher. */
export const fetcher = <T>(path: string) => api<T>(path);

export function uploadImage<T>(path: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return api<T>(path, { method: 'PUT', body: form });
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

/** Builds a query string, skipping empty values. */
export function query(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}
