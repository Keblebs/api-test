import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { FastifyInstrumentation } from "@opentelemetry/instrumentation-fastify";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { resourceFromAttributes } from "@opentelemetry/resources";

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const logsEndpoint = `${endpoint}/v1/logs`;
const tracesEndpoint = `${endpoint}/v1/traces`;
const metricsEndpoint = `${endpoint}/v1/metrics`;

export const loggerProvider = new LoggerProvider({
  processors: [
    new BatchLogRecordProcessor(new OTLPLogExporter({ url: logsEndpoint })),
  ],
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: "api-test" }),
  loggerProvider,

  spanProcessor: new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: tracesEndpoint,
    }),
  ),

  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: metricsEndpoint,
    }),
  }),

  instrumentations: [
    new PinoInstrumentation(),
    new HttpInstrumentation(),
    new FastifyInstrumentation(),
  ],
});

sdk.start();

console.log("OpenTelemetry iniciado");
