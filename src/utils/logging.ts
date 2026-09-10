export function log(level: "info" | "error", message: string, metadata?: Record<string, unknown>): void {
  const safeMetadata = metadata ? JSON.stringify(metadata, (key, value) => /token|authorization|secret/i.test(key) ? "[REDACTED]" : value) : "";
  process.stderr.write(`${JSON.stringify({ level, message, ...(safeMetadata ? { metadata: JSON.parse(safeMetadata) } : {}) })}\n`);
}