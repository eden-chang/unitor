/**
 * Thin fetch wrapper for the FastAPI backend.
 *
 * Responsibilities:
 *   - Resolve the URL against ``VITE_API_BASE_URL``.
 *   - Attach the current Supabase JWT as ``Authorization: Bearer …``.
 *   - JSON-encode the body, decode the response.
 *   - Translate the ADR-0008 error envelope into a typed ``ApiError``.
 *
 * Anything more (caching, retries, dedupe) is the caller's job — we use
 * ``@tanstack/react-query`` on top of this for that.
 */

import { supabase } from "@/supabase/client";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

/** The ADR-0008 error envelope, returned in ``detail`` by FastAPI. */
export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Thrown by ``apiFetch`` on any non-2xx response.
 *
 * ``code`` is the stable string from the error envelope (e.g.
 * ``"PROFILE_INCOMPLETE"``); callers should branch on it, not on
 * ``status``. The message is human-facing fallback text.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(status: number, detail: ApiErrorDetail) {
    super(detail.message);
    this.name = "ApiError";
    this.status = status;
    this.code = detail.code;
    this.details = detail.details;
  }
}

interface FetchOpts {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Extra query parameters. ``undefined`` values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Override the default JWT lookup — used by the auth-context bootstrap call. */
  token?: string | null;
  /** Skip the auth header entirely (public endpoints — only ``/auth/precheck``). */
  unauthenticated?: boolean;
  /** Custom Accept/Content-Type, etc. */
  headers?: Record<string, string>;
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function buildUrl(path: string, query?: FetchOpts["query"]): string {
  const url = new URL(path.startsWith("/") ? `${BASE}${path}` : `${BASE}/${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.append(k, String(v));
    }
  }
  return url.toString();
}

export async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers ?? {}),
  };

  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (!opts.unauthenticated) {
    const token = opts.token !== undefined ? opts.token : await getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });

  // 204 No Content — common for DELETEs. Cast to T for the caller's benefit;
  // they'll have declared the return type as ``void`` if they expect this.
  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const json: unknown = text ? safeJson(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, extractErrorDetail(json, res));
  }

  return json as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorDetail(json: unknown, res: Response): ApiErrorDetail {
  // FastAPI's HTTPException wraps our envelope inside ``{ "detail": { code, message, … } }``.
  if (
    typeof json === "object" &&
    json !== null &&
    "detail" in json &&
    typeof (json as { detail: unknown }).detail === "object"
  ) {
    const detail = (json as { detail: ApiErrorDetail }).detail;
    if (detail && typeof detail.code === "string" && typeof detail.message === "string") {
      return detail;
    }
  }

  // Pydantic validation errors come back as 422 with an array under detail.
  if (res.status === 422) {
    return {
      code: "VALIDATION_ERROR",
      message: "Request payload failed validation.",
      details: typeof json === "object" && json !== null ? (json as Record<string, unknown>) : undefined,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: `Unexpected response ${res.status} ${res.statusText}`,
    details: typeof json === "object" && json !== null ? (json as Record<string, unknown>) : undefined,
  };
}
