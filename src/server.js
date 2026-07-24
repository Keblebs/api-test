import fastify from "fastify";
import logger from "./logger.js";
import "./otel.js";

const app = fastify({ logger } });

app.addHook("onRequest", async (request) => {
  request.startTime = Date.now();
});

app.addHook("onResponse", async (request, reply) => {
  const latency = Date.now() - request.startTime;

  request.log.info(
    {
      endpoint: request.url,
      method: request.method,
      statusCode: reply.statusCode,
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
