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
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

const logsEndpoint = `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`;
const tracesEndpoint = `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`;
const metricsEndpoint = `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`;

import pkg from "@opentelemetry/resources";
const { Resource } = pkg;
export const loggerProvider = new LoggerProvider({
  processors: [
    new BatchLogRecordProcessor(new OTLPLogExporter({ url: logsEndpoint })),
  ],
});

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "api-test",
  }),

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

  instrumentations: [new PinoInstrumentation()],
});

sdk.start();

console.log("OpenTelemetry iniciado");
