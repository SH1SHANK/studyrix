export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "SUPABASE_ERROR"
  | "INTERNAL_ERROR"
  | "HTTP_ERROR"
  | "RATE_LIMITED";

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export type ApiSuccessResponse<T> = {
  ok: true;
  data: T;
};

export function buildApiError(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      details,
    },
  };
}

export function buildApiSuccess<T>(data: T): ApiSuccessResponse<T> {
  return {
    ok: true,
    data,
  };
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const error = record.error as Record<string, unknown> | undefined;
  return (
    typeof error?.code === "string" && typeof error?.message === "string"
  );
}
