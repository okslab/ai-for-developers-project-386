export interface NormalizedError {
  code?: string;
  message?: string;
}

export function normalizeError(error: unknown): NormalizedError {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return {
      code: typeof record.code === "string" ? record.code : undefined,
      message: typeof record.message === "string" ? record.message : undefined,
    };
  }
  return {};
}

export function errorCode(error: unknown): string | undefined {
  return normalizeError(error).code;
}

export function apiMessage(error: unknown, fallback: string): string {
  const normalized = normalizeError(error);
  return normalized.message ?? fallback;
}

export function isConflict(error: unknown): boolean {
  return errorCode(error) === "CONFLICT";
}

export function isNotFound(error: unknown): boolean {
  return errorCode(error) === "NOT_FOUND";
}
