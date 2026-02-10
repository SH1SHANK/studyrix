import { buildApiError, isApiErrorResponse } from "@/lib/api/errors";
import { recordMetric } from "@/lib/metrics/client-metrics";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    details?: unknown;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
  }
}

type FetchJsonOptions = {
  metricName?: string;
};

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: FetchJsonOptions = {},
): Promise<T> {
  const { metricName } = options;
  const startedAt = typeof performance !== "undefined" ? performance.now() : 0;

  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    const apiError = buildApiError(
      "HTTP_ERROR",
      error instanceof Error ? error.message : "Network error",
    );
    throw new ApiError({
      code: apiError.error.code,
      message: apiError.error.message,
      status: 0,
    });
  } finally {
    if (metricName) {
      const duration =
        typeof performance !== "undefined" ? performance.now() - startedAt : 0;
      recordMetric(`fetch.${metricName}`, duration);
      recordMetric("fetch.count", 1);
    }
  }

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = text;
    }
  }

  if (response.ok) {
    if (
      payload &&
      typeof payload === "object" &&
      (payload as { ok?: boolean }).ok === true
    ) {
      return (payload as { data: T }).data;
    }
    return payload as T;
  }

  if (isApiErrorResponse(payload)) {
    throw new ApiError({
      code: payload.error.code,
      message: payload.error.message,
      status: response.status,
      details: payload.error.details,
    });
  }

  throw new ApiError({
    code: "HTTP_ERROR",
    message: response.statusText || "Request failed",
    status: response.status,
    details: payload,
  });
}
