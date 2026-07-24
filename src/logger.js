import pino from "pino";

const logger = pino({
  level: "info",
  base: { service_name: "api-test" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
