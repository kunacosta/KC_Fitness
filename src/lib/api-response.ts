import { ZodError } from "zod";

export function jsonError(message: string, status = 400, details?: unknown) {
  return Response.json(
    {
      ok: false,
      error: message,
      details,
    },
    { status },
  );
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError("Validation failed", 400, error.flatten());
  }

  if (error instanceof Error) {
    return jsonError(error.message, 400);
  }

  return jsonError("Unexpected server error", 500);
}
