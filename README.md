# API Test

API de exemplo com observabilidade completa (logs, métricas, traces) usando OpenTelemetry + Pino + Fastify.

## Stack

- **Fastify** - Framework web rápido e de baixo overhead
- **Pino** - Logger estruturado em JSON
- **OpenTelemetry (OTel)** - Instrumentação para traces, métricas e logs
- **OTLP/HTTP** - Exportação para collectors (Jaeger, Tempo, Prometheus, Loki, etc.)

## Variáveis de Ambiente

| Variável                      | Obrigatória | Default                 | Descrição                                                     |
| ----------------------------- | ----------- | ----------------------- | ------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Não         | `http://localhost:4318` | Endpoint do collector OTLP (ex: `http://otel-collector:4318`) |
| `PORT`                        | Não         | `3000`                  | Porta do servidor HTTP                                        |

## Como Rodar

```bash
# Instalar dependências
npm install

# Rodar localmente (sem collector - logs vão para stdout)
npm start

# Com collector OTLP (Docker)
docker run -d -p 4318:4318 -p 8888:8888 -p 8889:8889 \
  --name otel-collector \
  otel/opentelemetry-collector-contrib:latest

OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 npm start
```

## Endpoints

| Método | Rota        | Descrição                            |
| ------ | ----------- | ------------------------------------ |
| `GET`  | `/health`   | Health check                         |
| `GET`  | `/usuarios` | Lista usuários (retorna array vazio) |

## Observabilidade

### Logs

- Formato: JSON estruturado (Pino)
- Nível: `info` (configurável via `LOG_LEVEL`)
- Campos base: `level`, `time`, `service_name`, `msg`
- **Correlação**: `trace_id` e `span_id` injetados automaticamente pelo `PinoInstrumentation` quando há span ativo
- **Sanitização**: campos `password`, `token`, `authorization` removidos de request/response logs

### Métricas (exportadas via OTLP)

| Métrica                    | Tipo      | Labels                           | Descrição                                              |
| -------------------------- | --------- | -------------------------------- | ------------------------------------------------------ |
| `http_requests_total`      | Counter   | `method`, `route`, `status_code` | Total de requisições HTTP                              |
| `http_request_duration_ms` | Histogram | `method`, `route`, `status_code` | Latência em ms                                         |
| `nodejs_*`                 | -         | -                                | Métricas de runtime Node.js (memória, CPU, event loop) |
| `http_*`                   | -         | -                                | Métricas HTTP client/server (via instrumentação)       |

### Traces (exportados via OTLP)

- Instrumentação automática: HTTP client/server, Fastify routes
- Spans criados por requisição: `GET /usuarios`, `GET /health`
- Contexto propagado via headers `traceparent`/`tracestate` (W3C)

### Collector OTLP Recomendado (docker-compose)

```yaml
# docker-compose.yml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel/config.yaml"]
    volumes:
      - ./otel-config.yaml:/etc/otel/config.yaml
    ports:
      - "4318:4318" # OTLP HTTP
      - "8888:8888" # Prometheus metrics
      - "8889:8889" # Prometheus exporter
```

```yaml
# otel-config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus, logging]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
```

## Desenvolvimento

```bash
# Rodar com hot reload (requer nodemon)
npm i -D nodemon
npx nodemon src/server.js
```

## Estrutura do Projeto

```
src/
├── server.js    # App Fastify + hooks + métricas customizadas
├── otel.js      # Configuração OpenTelemetry (SDK, exporters, instrumentações)
└── logger.js    # Logger Pino configurado
```

## Redis (Padrões de Uso)

### Instalação

```bash
npm i ioredis @fastify/redis
```

### 1. Cache (ex: `/usuarios`)

```javascript
// src/plugins/redis.js
import Redis from "ioredis";
import fp from "fastify-plugin";

export default fp(async (app) => {
  const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  app.decorate("redis", redis);
  app.addHook("onClose", async () => redis.quit());
});
```

```javascript
// No handler /usuarios
app.get("/usuarios", async (request, reply) => {
  const cached = await request.server.redis.get("users:all");
  if (cached) return JSON.parse(cached);

  const users = []; // sua query real
  await request.server.redis.setex("users:all", 60, JSON.stringify(users));
  return users;
});
```

### 2. Rate Limiting

```bash
npm i @fastify/rate-limit
```

```javascript
await app.register(require("@fastify/rate-limit"), {
  max: 100,
  timeWindow: "1 minute",
  redis: new Redis(process.env.REDIS_URL),
});
```

### 3. Sessões (com cookie seguro)

```bash
npm i @fastify/session @fastify/cookie connect-redis
```

```javascript
await app.register(require("@fastify/cookie"), {
  secret: process.env.COOKIE_SECRET,
});
await app.register(require("@fastify/session"), {
  store: new (require("connect-redis"))({ client: redis }),
  secret: process.env.SESSION_SECRET,
  cookie: { secure: false, httpOnly: true },
});
```

### 4. Observabilidade no Redis

- Adicione `@opentelemetry/instrumentation-redis` no `otel.js`
- Traces automáticos para comandos Redis (GET, SET, etc.)
- Métricas: latência, erros, conexões ativas
  '

### Docker para Dev

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

### Variáveis de Ambiente Redis

| Variável         | Default                  | Descrição                    |
| ---------------- | ------------------------ | ---------------------------- |
| `REDIS_URL`      | `redis://localhost:6379` | URL de conexão Redis         |
| `COOKIE_SECRET`  | -                        | Segredo para assinar cookies |
| `SESSION_SECRET` | -                        | Segredo para sessões         |
