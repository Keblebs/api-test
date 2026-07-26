import fastify from "fastify";
import logger from "./logger.js";
import "./otel.js";
import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("api-test");
const requestCounter = meter.createCounter("http_requests_total", {
  description: "Total number of HTTP requests",
});
const requestDuration = meter.createHistogram("http_request_duration_ms", {
  description: "HTTP request duration in milliseconds",
  unit: "ms",
});

const sanitize = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const { password, token, authorization, Authorization, ...rest } = obj;
  return rest;
};

const app = fastify({
  logger: { instance: logger },
});

app.addHook("onRequest", async (request) => {
  request.startTime = Date.now();
});

app.addHook("onResponse", async (request, reply) => {
  const latency = Date.now() - request.startTime;

  requestCounter.add(1, {
    method: request.method,
    route: request.routerPath || request.url,
    status_code: reply.statusCode,
  });

  requestDuration.record(latency, {
    method: request.method,
    route: request.routerPath || request.url,
    status_code: reply.statusCode,
  });

  request.log.info(
    {
      endpoint: request.url,
      method: request.method,
      statusCode: reply.statusCode,
      request: sanitize(request.body),
      response: sanitize(reply.body),
      latency,
    },
    "Requisição concluída",
  );
});

app.get("/health", async () => {
  return { status: "ok" };
});

app.get("/usuarios", async () => {
  return [];
});

try {
  await app.listen({ port: 3000, host: "0.0.0.0" });
  logger.info("API iniciada");
} catch (err) {
  logger.error(err);
  process.exit(1);
}
