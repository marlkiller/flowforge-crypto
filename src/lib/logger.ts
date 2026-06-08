const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

const currentLevel: LogLevel =
  (import.meta.env.VITE_LOG_LEVEL as LogLevel) || (import.meta.env.PROD ? "info" : "debug");

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function normalizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;

  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => {
      if (value instanceof Error) {
        return [
          key,
          {
            name: value.name,
            message: value.message,
            stack: value.stack,
          },
        ];
      }
      return [key, value];
    }),
  );
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) return;

  const normalizedMeta = normalizeMeta(meta);
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...normalizedMeta,
  };

  if (import.meta.env.SSR) {
    // Server-side (Workers runtime): structured JSON
    console.log(JSON.stringify(entry));
  } else {
    // Client-side: formatted console output
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    const style =
      level === "error"
        ? "color:#ef4444;font-weight:bold"
        : level === "warn"
          ? "color:#f59e0b;font-weight:bold"
          : level === "info"
            ? "color:#3b82f6"
            : "color:#6b7280";
    const method =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : level === "info"
            ? console.info
            : console.debug;
    method(`%c${prefix}%c ${message}`, style, "", normalizedMeta ?? "");
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};
