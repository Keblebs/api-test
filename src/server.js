import fastify from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import logger from "./logger.js";
import { metrics } from "@opentelemetry/api";
import "./otel.js";

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

await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "API Test",
      version: "1.0.0",
      description: "API com observabilidade completa",
    },
    servers: [
      {
        url: "https://api-test-tqr-api.apps.hmlg.datacenter.local",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer" },
      },
    },
  },
});

await app.register(fastifySwaggerUi, {
  routePrefix: "/docs",
  uiConfig: { docExpansion: "list", deepLinking: true },
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

app.get("/health", {
  schema: {
    tags: ["Health"],
    summary: "Health check",
    response: {
      200: {
        type: "object",
        properties: { status: { type: "string" } },
      },
    },
  },
  async handler() {
    return { status: "ok" };
  },
});

app.get("/usuarios", {
  schema: {
    tags: ["Usuários"],
    summary: "Lista usuários",
    response: {
      200: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            nome: { type: "string" },
            email: { type: "string" },
          },
        },
      },
    },
  },
  async handler() {
    return [];
  },
});

import { trace } from "@opentelemetry/api";

app.get("/otel-test", async () => {
  const tracer = trace.getTracer("api-test");

  const span = tracer.startSpan("span-manual");

  await new Promise((r) => setTimeout(r, 100));

  span.end();

  return { ok: true };
});

try {
  await app.ready();
  await app.listen({ port: 3000, host: "0.0.0.0" });
  logger.info("API iniciada");
  logger.info("Documentação: http://localhost:3000/docs");
} catch (err) {
  logger.error(err);
  process.exit(1);
}
