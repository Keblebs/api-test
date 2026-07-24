import pino from "pino";

const logger = pino({
  level: "info",
  base: { service: "tqr-api" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
