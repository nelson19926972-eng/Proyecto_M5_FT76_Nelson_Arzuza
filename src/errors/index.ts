import { ZodError } from "zod";

export type ErrorKind = "ValidationError" | "GitHubAPIError" | "AuthenticationError" | "RateLimitError" | "NetworkError";

export class AppError extends Error {
  constructor(public readonly kind: ErrorKind, message: string, public readonly status?: number, public readonly cause?: unknown) {
    super(message);
    this.name = kind;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof ZodError) return new AppError("ValidationError", error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "), undefined, error);
  const status = typeof error === "object" && error !== null && "status" in error && typeof error.status === "number" ? error.status : undefined;
  const headers = typeof error === "object" && error !== null && "response" in error && typeof error.response === "object" && error.response !== null && "headers" in error.response && typeof error.response.headers === "object" && error.response.headers !== null ? error.response.headers as Record<string, unknown> : undefined;
  const rateLimitRemaining = String(headers?.["x-ratelimit-remaining"] ?? "");
  if (status === 429 || (status === 403 && rateLimitRemaining === "0")) return new AppError("RateLimitError", "GitHub ha limitado temporalmente las solicitudes. Espera unos minutos e inténtalo de nuevo", status, error);
  if (status === 401 || status === 403) return new AppError("AuthenticationError", status === 401 ? "Las credenciales de GitHub no son válidas. Revisa GITHUB_TOKEN" : "El token de GitHub no tiene permisos suficientes para esta operación", status, error);
  if (status === 404) return new AppError("GitHubAPIError", "El repositorio solicitado no fue encontrado. Verifica el nombre e intenta de nuevo", status, error);
  if (status === 409) return new AppError("GitHubAPIError", "GitHub detectó un conflicto. Comprueba si el archivo cambió o si el recurso ya existe", status, error);
  if (status === 422) return new AppError("GitHubAPIError", "GitHub rechazó los datos enviados. Revisa los nombres, el contenido y los parámetros", status, error);
  if (status !== undefined) return new AppError("GitHubAPIError", `GitHub rechazó la operación (HTTP ${status})`, status, error);
  if (error instanceof TypeError || (error instanceof Error && /network|fetch|socket|timeout/i.test(error.message))) return new AppError("NetworkError", "No se pudo conectar con GitHub. Revisa tu red e intenta de nuevo", undefined, error);
  return new AppError("GitHubAPIError", "Ocurrió un error inesperado al comunicarse con GitHub", undefined, error);
}

export function errorResponse(error: unknown) {
  const appError = toAppError(error);
  return { isError: true, content: [{ type: "text" as const, text: `${appError.kind}: ${appError.message}` }] };
}