export type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  event: string;
  requestId?: string;
  [key: string]: unknown;
}

const toJson = (level: LogLevel, payload: LogPayload) =>
  JSON.stringify({
    level,
    timestamp: new Date().toISOString(),
    ...payload
  });

export const logInfo = (payload: LogPayload) => {
  console.log(toJson("info", payload));
};

export const logWarn = (payload: LogPayload) => {
  console.warn(toJson("warn", payload));
};

export const logError = (payload: LogPayload) => {
  console.error(toJson("error", payload));
};
